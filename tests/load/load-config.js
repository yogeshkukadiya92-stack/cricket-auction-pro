function number(env, key, fallback, min, max, integer = false) {
  const value = env[key] === undefined ? fallback : Number(env[key]);
  if (!Number.isFinite(value) || value < min || value > max ||
      (integer && !Number.isInteger(value)) || env[key] === '') {
    throw new Error(`Invalid ${key}: expected ${integer ? 'integer' : 'number'} in ${min}..${max}`);
  }
  return value;
}

export function buildConfig(env, nowMs = Date.now()) {
  const baseUrl = env.BASE_URL || '';
  // Accept one origin only; credentials, paths, query strings, and redirects are excluded.
  const origin = /^(https?):\/\/(localhost|127\.0\.0\.1|\[::1\]|[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?::([0-9]{1,5}))?$/.exec(baseUrl);
  if (!origin || (origin[3] && (+origin[3] < 1 || +origin[3] > 65535))) {
    throw new Error('BASE_URL must be a single HTTP(S) origin without a trailing slash');
  }
  if (env.AUTHORIZED_BASE_URL !== baseUrl) throw new Error('Target authorization does not match BASE_URL');
  if (!['local', 'staging', 'production'].includes(env.TARGET_ENV)) throw new Error('Set TARGET_ENV explicitly');
  if (env.TARGET_ENV === 'local' && !['localhost', '127.0.0.1', '[::1]'].includes(origin[2])) {
    throw new Error('Local mode requires a loopback origin');
  }
  if (env.TARGET_ENV !== 'local' && origin[1] !== 'https') throw new Error('Remote targets require HTTPS');
  if (env.TARGET_ENV === 'production' && env.PRODUCTION_LOAD_APPROVED !== 'yes') {
    throw new Error('Production requires recorded explicit load authorization');
  }
  const ceiling = number(env, 'MAX_AUTHORIZED_VUS', 1, 1, 5000, true);
  const target = number(env, 'TARGET_VUS', 5000, 1, 5000, true);
  const profile = env.PROFILE || 'smoke';
  const stages = [];
  let peak;
  const stage = (seconds, vus, phase) => stages.push({ seconds, target: vus, phase });
  if (profile === 'smoke') {
    peak = 1;
    stage(1, 1, 'ramp');
    stage(number(env, 'SMOKE_SECONDS', 30, 10, 600, true), 1, 'target');
    stage(1, 0, 'recovery');
  } else if (profile === 'baseline') {
    peak = Math.min(50, ceiling);
    stage(60, peak, 'ramp'); stage(180, peak, 'target'); stage(60, 0, 'recovery');
  } else if (profile === 'capacity') {
    peak = target;
    const levels = [10, 50, 100, 500, 1000, 2500].filter(v => v < target).concat(target);
    for (const vus of levels) {
      const ramp = vus <= 100 ? 60 : vus <= 1000 ? 120 : vus <= 2500 ? 180 : 300;
      stage(ramp, vus, 'ramp');
      stage(vus === target ? 600 : ramp, vus, vus === target ? 'target' : `hold-${vus}`);
    }
    stage(120, 0, 'recovery');
  } else if (profile === 'spike') {
    peak = target;
    const low = Math.max(1, Math.floor(target / 10));
    stage(60, low, 'ramp'); stage(60, low, 'baseline');
    stage(15, peak, 'ramp'); stage(120, peak, 'target');
    stage(120, low, 'recovery'); stage(120, low, 'recovery'); stage(60, 0, 'recovery');
  } else if (profile === 'soak') {
    peak = target;
    stage(300, peak, 'ramp'); stage(1800, peak, 'target'); stage(120, 0, 'recovery');
  } else throw new Error('Unknown PROFILE');
  if (peak > ceiling) throw new Error('Profile exceeds MAX_AUTHORIZED_VUS');
  if (!['public', 'bearer'].includes(env.AUTH_MODE)) throw new Error('Set AUTH_MODE to public or bearer');
  if (!env.JOURNEYS_FILE) throw new Error('Set JOURNEYS_FILE to adapted, verified routes');
  if (env.AUTH_MODE === 'bearer' && !env.ACCOUNTS_FILE) throw new Error('Bearer mode requires ACCOUNTS_FILE');
  const p95 = number(env, 'P95_MS', 1000, 1, 60000);
  const p99 = number(env, 'P99_MS', 2000, p95, 60000);
  const failRate = number(env, 'MAX_FAILURE_RATE', 0.01, 0, 0.5);
  const stopFailRate = number(env, 'STOP_FAILURE_RATE', 0.05, failRate, 0.5);
  const stopP95 = number(env, 'STOP_P95_MS', 5000, p95, 60000);
  const journeyP95 = number(env, 'JOURNEY_P95_MS', 5000, 1, 300000);
  const journeyP99 = number(env, 'JOURNEY_P99_MS', 10000, journeyP95, 300000);
  const thinkMin = number(env, 'THINK_MIN_SECONDS', 1, 0.1, 60);
  const thinkMax = number(env, 'THINK_MAX_SECONDS', 3, thinkMin, 60);
  const maxRunSeconds = number(env, 'MAX_RUN_SECONDS', 120, 1, 14400, true);
  const recoveryReserve = number(env, 'RECOVERY_RESERVE_SECONDS', 60, 10, 3600, true);
  const totalSeconds = stages.reduce((sum, item) => sum + item.seconds, 0) + 10;
  if (env.TARGET_ENV !== 'local' && !env.LOAD_WINDOW_END) throw new Error('Remote runs require LOAD_WINDOW_END in UTC');
  if (env.LOAD_WINDOW_END && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(env.LOAD_WINDOW_END)) {
    throw new Error('LOAD_WINDOW_END must be an ISO UTC timestamp ending in Z');
  }
  const windowEnd = env.LOAD_WINDOW_END ? Date.parse(env.LOAD_WINDOW_END) : nowMs + maxRunSeconds * 1000;
  const budgetEnd = Math.min(windowEnd, nowMs + maxRunSeconds * 1000);
  if (!Number.isFinite(budgetEnd) || nowMs + (totalSeconds + recoveryReserve) * 1000 > budgetEnd) {
    throw new Error('Profile and recovery reserve exceed the remaining authorized time budget');
  }
  const trafficDeadlineMs = budgetEnd - recoveryReserve * 1000;
  return { baseUrl, profile, stages, peak, p95, p99, failRate, stopFailRate, stopP95, journeyP95, journeyP99, thinkMin, thinkMax, totalSeconds, trafficDeadlineMs };
}

export function validateAccounts(records, peak) {
  if (!Array.isArray(records) || records.length < peak) throw new Error('Need a distinct account for every peak VU');
  const tokens = new Set();
  const principals = new Set();
  for (const account of records) {
    if (!account || typeof account.principalId !== 'string' || !account.principalId.trim() || principals.has(account.principalId)) {
      throw new Error('Accounts require distinct verified principalId values');
    }
    if (typeof account.token !== 'string' || !account.token.trim() || /\s/.test(account.token) || tokens.has(account.token)) {
      throw new Error('Account tokens must be nonempty, distinct, and contain no whitespace');
    }
    tokens.add(account.token);
    principals.add(account.principalId);
  }
  return records;
}

export function validateJourneys(journeys) {
  if (!Array.isArray(journeys) || !journeys.length || journeys.length > 50) throw new Error('Expected 1..50 journeys');
  const names = new Set();
  const validName = name => typeof name === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(name);
  for (const journey of journeys) {
    if (!journey || !validName(journey.name) || names.has(journey.name)) throw new Error('Journey names must be unique safe identifiers');
    names.add(journey.name);
    if (!Number.isFinite(journey.weight) || journey.weight <= 0 || journey.weight > 1000) throw new Error('Invalid journey weight');
    if (!Array.isArray(journey.steps) || !journey.steps.length || journey.steps.length > 20) throw new Error('Expected 1..20 ordered steps');
    const stepNames = new Set();
    for (const step of journey.steps) {
      if (!step || !validName(step.name) || stepNames.has(step.name)) throw new Error('Step names must be unique safe identifiers within a journey');
      stepNames.add(step.name);
      if (typeof step.path !== 'string' || !/^\/(?!\/)[^\s\\#]*$/.test(step.path)) throw new Error('Step path must be relative to the authorized origin');
      if (step.method && step.method !== 'GET') throw new Error('Starter supports GET only; implement write invariants first');
      if (!Number.isInteger(step.expectedStatus) || step.expectedStatus < 200 || step.expectedStatus > 299) throw new Error('Expected success status must be 2xx');
      if (typeof step.bodyContains !== 'string' || !step.bodyContains.trim()) throw new Error('Each step needs a nonempty response assertion');
    }
  }
  return journeys;
}

export function phaseAt(stages, elapsedSeconds) {
  let end = 0;
  for (const stage of stages) {
    end += stage.seconds;
    if (elapsedSeconds < end) return stage.phase;
  }
  return 'recovery';
}
