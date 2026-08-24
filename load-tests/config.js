/**
 * Global Configuration for k6 Load & Stress Testing
 * Mazadak Backend
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const GRAPHQL_ENDPOINT = `${BASE_URL}/graphql`;

export const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Default Credentials for virtual users (from seed or environment)
export const DEFAULT_USERS = [
  { email: 'user1@mazadak.com', password: 'Password123!' },
  { email: 'user2@mazadak.com', password: 'Password123!' },
  { email: 'user3@mazadak.com', password: 'Password123!' },
  { email: 'user4@mazadak.com', password: 'Password123!' },
  { email: 'user5@mazadak.com', password: 'Password123!' },
  { email: 'user6@mazadak.com', password: 'Password123!' },
  { email: 'user7@mazadak.com', password: 'Password123!' },
  { email: 'admin@mazadak.com', password: 'Password123!' },
];

// Reusable threshold presets
export const THRESHOLDS = {
  smoke: {
    http_req_failed: ['rate<0.01'], // less than 1% errors
    http_req_duration: ['p(95)<500'], // 95% of requests below 500ms
  },
  load: {
    http_req_failed: ['rate<0.02'], // less than 2% errors under load
    http_req_duration: ['p(90)<400', 'p(95)<800', 'p(99)<1500'],
  },
  stress: {
    http_req_failed: ['rate<0.05'], // less than 5% errors during high stress
    http_req_duration: ['p(95)<2000'],
  },
  spike: {
    http_req_failed: ['rate<0.10'], // allowable degradation during extreme sudden spike
    http_req_duration: ['p(95)<3000'],
  },
};

// $env: Path =
//   [System.Environment]::GetEnvironmentVariable('Path', 'Machine') +
//   ';' +
//   [System.Environment]::GetEnvironmentVariable('Path', 'User');
