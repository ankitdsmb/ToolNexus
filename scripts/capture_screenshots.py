import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5163';
const API_KEY = __ENV.API_KEY || 'replace-with-production-api-key';

const commonHeaders = {
  'Content-Type': 'application/json',
  'X-API-KEY': API_KEY
};

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<400', 'p(99)<1200'],
    checks: ['rate>0.98']
  },
  scenarios: {
    high_concurrency_post: {
      executor: 'constant-arrival-rate',
      rate: 180,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 80,
      maxVUs: 250,
      exec: 'highConcurrencyPost'
    },
    cache_cold_start: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '90s', target: 50 },
        { duration: '30s', target: 0 }
      ],
      exec: 'cacheCold'
    },
    cache_warm_steady: {
      executor: 'constant-vus',
      vus: 40,
      duration: '2m',
      exec: 'cacheWarm'
    },
    mixed_tool_actions: {
      executor: 'constant-vus',
      vus: 30,
      duration: '2m',
      exec: 'mixedActions'
    },
    spike_recovery_post: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      stages: [
        { target: 50, duration: '30s' },
        { target: 400, duration: '20s' },
        { target: 50, duration: '40s' }
      ],
      preAllocatedVUs: 100,
      maxVUs: 450,
      exec: 'highConcurrencyPost'
    }
  }
};

function executeJsonFormatter(payload) {
  return http.post(
    `${BASE_URL}/api/tools/json-formatter/format`,
    JSON.stringify({ input: payload }),
    { headers: commonHeaders }
  );
}

function assertToolResponse(res) {
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response success is true': (r) => {
      try {
        return JSON.parse(r.body).success === true;
      } catch {
        return false;
      }
    }
  });
}

export function setup() {
  const warmPayload = JSON.stringify({ warm: true, ts: 0, values: [1, 2, 3] });
  for (let i = 0; i < 50; i++) {
    executeJsonFormatter(warmPayload);
  }

  return {
    warmPayload,
    coldPayloadPrefix: JSON.stringify({ cold: true, user: 'seed', values: [1, 2, 3] })
  };
}

export function highConcurrencyPost(data) {
  const payload = JSON.stringify({ id: __VU, iteration: __ITER, nested: { value: Math.random() } });
  const res = executeJsonFormatter(payload);
  assertToolResponse(res);
  sleep(0.05);
}

export function cacheCold(data) {
  const payload = `${data.coldPayloadPrefix}-${__VU}-${__ITER}-${Date.now()}`;
  const res = executeJsonFormatter(payload);
  assertToolResponse(res);
  sleep(0.1);
}

export function cacheWarm(data) {
  const res = executeJsonFormatter(data.warmPayload);
  assertToolResponse(res);
  sleep(0.1);
}

export function mixedActions(data) {
  const endpoints = [
    '/api/tools/json-formatter/format',
    '/api/tools/base64-encode/encode',
    '/api/tools/base64-decode/decode'
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const body = endpoint.includes('json')
    ? { input: JSON.stringify({ mixed: true, n: __ITER, vu: __VU }) }
    : { input: `ToolNexus-${__VU}-${__ITER}` };

  const res = http.post(`${BASE_URL}${endpoint}`, JSON.stringify(body), { headers: commonHeaders });
  assertToolResponse(res);
  sleep(0.05);
}
