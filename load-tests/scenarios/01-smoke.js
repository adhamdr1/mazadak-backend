import { sleep } from 'k6';
import { sendGraphQL } from '../helpers/graphql.js';
import { THRESHOLDS } from '../config.js';
import { generateHtmlReport } from '../helpers/reporter.js';

export const options = {
  vus: 3,
  duration: '20s',
  thresholds: THRESHOLDS.smoke,
};

const AUCTIONS_QUERY = `
  query GetAuctionsSmoke {
    auctions(input: { page: 1, limit: 5 }) {
      items {
        _id
        title
        currentPrice
        status
        category
      }
      total
      totalPages
      hasNextPage
    }
  }
`;

export default function () {
  sendGraphQL(AUCTIONS_QUERY, {}, null, { scenario: 'smoke_auctions' });
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-tests/reports/01-smoke-report.html': generateHtmlReport(
      data,
      'Smoke Test (Health & Connectivity)',
    ),
    stdout: `
=========================================
🔥 SMOKE TEST COMPLETED
=========================================
Reqs: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}
Failed: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
Avg Duration: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg.toFixed(2) : 0}ms
Report: load-tests/reports/01-smoke-report.html
=========================================
`,
  };
}
