import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';
import { buildConfig, validateJourneys, validateAccounts, phaseAt } from './load-config.js';

const config = buildConfig(__ENV);
const journeys = validateJourneys(JSON.parse(open(__ENV.JOURNEYS_FILE)));
const accounts = new SharedArray('test accounts', () => {
  if (__ENV.AUTH_MODE === 'public') return [];
  return validateAccounts(JSON.parse(open(__ENV.ACCOUNTS_FILE)), config.peak);
});
const journeyStarts = new Counter('journey_starts');
const journeyRuns = new Counter('journey_runs');
const journeyFailures = new Rate('journey_failures');
const responseFailures = new Rate('response_failures');
const journeyActiveMs = new Trend('journey_active_ms', true);
const totalWeight = journeys.reduce((sum, journey) => sum + journey.weight, 0);

const thresholds = {
  journey_runs: ['count>0'],
  'journey_runs{phase:target}': ['count>0'],
  journey_failures: [
    `rate<=${config.failRate}`,
    { threshold: `rate<=${config.stopFailRate}`, abortOnFail: true, delayAbortEval: '10s' },
  ],
  response_failures: [
    { threshold: `rate<=${config.stopFailRate}`, abortOnFail: true, delayAbortEval: '10s' },
  ],
  http_req_duration: [
    { threshold: `p(95)<=${config.stopP95}`, abortOnFail: true, delayAbortEval: '10s' },
  ],
  'journey_failures{phase:target}': [`rate<=${config.failRate}`],
  'http_req_duration{phase:target}': [`p(95)<=${config.p95}`, `p(99)<=${config.p99}`],
};
for (const journey of journeys) {
  thresholds[`journey_runs{journey:${journey.name},phase:target}`] = ['count>0'];
  thresholds[`journey_failures{journey:${journey.name},phase:target}`] = [`rate<=${config.failRate}`];
  thresholds[`journey_active_ms{journey:${journey.name},phase:target}`] = [
    `p(95)<=${config.journeyP95}`, `p(99)<=${config.journeyP99}`,
  ];
  for (const step of journey.steps) {
    thresholds[`http_req_duration{name:${journey.name}/${step.name},phase:target}`] = [
      `p(95)<=${config.p95}`, `p(99)<=${config.p99}`,
    ];
  }
}

export const options = {
  scenarios: {
    users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: config.stages.map(stage => ({ duration: `${stage.seconds}s`, target: stage.target })),
      gracefulRampDown: '10s',
      gracefulStop: '10s',
    },
  },
  thresholds,
  maxRedirects: 0,
  insecureSkipTLSVerify: false,
  discardResponseBodies: true,
  systemTags: ['status', 'method', 'name', 'scenario', 'expected_response'],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)'],
};

function selectJourney() {
  if (config.profile === 'smoke') return journeys[exec.vu.iterationInScenario % journeys.length];
  let pick = Math.random() * totalWeight;
  for (const journey of journeys) {
    pick -= journey.weight;
    if (pick < 0) return journey;
  }
  return journeys[journeys.length - 1];
}

export default function () {
  if (Date.now() + 10000 > config.trafficDeadlineMs) exec.test.abort('Authorized traffic window is ending; reserve time for recovery');
  const journey = selectJourney();
  const journeyPhase = phaseAt(config.stages, exec.instance.currentTestRunDuration / 1000);
  const journeyTags = { journey: journey.name, phase: journeyPhase };
  journeyStarts.add(1, journeyTags);
  const headers = {};
  if (__ENV.AUTH_MODE === 'bearer') {
    const account = accounts[exec.vu.idInTest - 1];
    if (!account) exec.test.abort('No test account allocated for this VU ID');
    headers.Authorization = `Bearer ${account.token}`;
  }
  let success = true;
  let activeMs = 0;
  for (const step of journey.steps) {
    if (Date.now() + 10000 > config.trafficDeadlineMs) exec.test.abort('Authorized traffic window is ending; stop new work');
    const tags = {
      name: `${journey.name}/${step.name}`,
      journey: journey.name,
      phase: phaseAt(config.stages, exec.instance.currentTestRunDuration / 1000),
    };
    const requestStart = Date.now();
    const response = http.get(`${config.baseUrl}${step.path}`, {
      headers, tags, timeout: '10s', redirects: 0, responseType: 'text',
      responseCallback: http.expectedStatuses(step.expectedStatus),
    });
    activeMs += Date.now() - requestStart;
    const valid = check(response, {
      'expected response': res => res.status === step.expectedStatus &&
        typeof res.body === 'string' && res.body.includes(step.bodyContains),
    }, tags);
    responseFailures.add(!valid, tags);
    if (!valid) { success = false; break; }
    sleep(config.thinkMin + Math.random() * (config.thinkMax - config.thinkMin));
  }
  journeyRuns.add(1, journeyTags);
  journeyFailures.add(!success, journeyTags);
  journeyActiveMs.add(activeMs, journeyTags);
  if (!success) sleep(config.thinkMin + Math.random() * (config.thinkMax - config.thinkMin));
}
