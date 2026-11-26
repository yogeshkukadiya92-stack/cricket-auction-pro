# Spectator summary load check

From the repository root, run `node tests/load/summary-benchmark.mjs` for the in-process benchmark. On revision c9d04b1, 250 sequential warm conditional requests with a mock 500-player roster took 34.7 ms. The same run after caching serialized responses took 0.4 ms. Both returned 304 for every request. The timing excludes PostgreSQL, HTTP and browsers.

For an isolated local instance with sanitized tournament ID fixture (or edit spectators.json to match), run from this directory:

```sh
BASE_URL=http://127.0.0.1:3000 AUTHORIZED_BASE_URL=http://127.0.0.1:3000 TARGET_ENV=local AUTH_MODE=public JOURNEYS_FILE=./spectators.json PROFILE=smoke k6 run load-test.js
```

Adjust the port to match the instance. The workload only reads spectator summaries and creates no records. Interrupt with Ctrl-C if the service degrades. This smoke scenario does not cover organizer bids, reconnects or concurrent writes. Capacity, browser latency, database headroom and recovery remain unmeasured. The local sandbox blocked HTTP listeners and k6 was unavailable.
