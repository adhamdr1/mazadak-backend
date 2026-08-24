import http from 'k6/http';
import { check } from 'k6';
import { GRAPHQL_ENDPOINT, HEADERS } from '../config.js';

/**
 * Execute a GraphQL query or mutation
 * @param {string} query - GraphQL query/mutation string
 * @param {object} [variables] - GraphQL variables object
 * @param {string} [token] - Optional JWT bearer token
 * @param {object} [tags] - Optional tags for k6 metric segmentation
 * @returns {object} - HTTP Response from k6
 */
export function sendGraphQL(query, variables = {}, token = null, tags = {}) {
  const headers = { ...HEADERS };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Simulate unique client IP for each Virtual User so rate limiter tracks them as distinct clients
  if (typeof __VU !== 'undefined' && __VU > 0) {
    headers['X-Forwarded-For'] =
      `10.0.${Math.floor(__VU / 250) + 1}.${(__VU % 250) + 1}`;
  }

  const payload = JSON.stringify({
    query,
    variables,
  });

  const params = {
    headers,
    tags,
  };

  const response = http.post(GRAPHQL_ENDPOINT, payload, params);

  // Check HTTP 200 status
  const isStatus200 = check(response, {
    'GraphQL status is 200': (r) => r.status === 200,
  });

  let hasNoGraphQLErrors = false;
  try {
    const body = response.json();
    hasNoGraphQLErrors = check(body, {
      'GraphQL has no errors': (b) => !b.errors || b.errors.length === 0,
    });
  } catch {
    // If response body is not JSON (e.g., gateway timeout or HTML error)
    hasNoGraphQLErrors = false;
  }

  return {
    response,
    success: isStatus200 && hasNoGraphQLErrors,
    data: response.json ? response.json('data') : null,
    errors: response.json ? response.json('errors') : null,
  };
}
