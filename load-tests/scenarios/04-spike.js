import { sleep, group } from 'k6';
import { sendGraphQL } from '../helpers/graphql.js';
import { THRESHOLDS } from '../config.js';
import { generateHtmlReport } from '../helpers/reporter.js';

export const options = {
  stages: [
    { duration: '10s', target: 20 }, // Normal baseline: 20 users
    { duration: '10s', target: 400 }, // Sudden huge spike: 400 users in 10s!
    { duration: '40s', target: 400 }, // Hold high traffic burst
    { duration: '15s', target: 20 }, // Drop back to baseline
    { duration: '15s', target: 0 }, // Scale down
  ],
  thresholds: THRESHOLDS.spike,
};

const EXPLORE_AUCTIONS_QUERY = `
  query SpikeExploreAuctions {
    auctions(input: { page: 1, limit: 15 }, filter: { status: ACTIVE }) {
      items {
        _id
        title
        currentPrice
        category
        startTime
        endTime
      }
      total
    }
  }
`;

export default function () {
  group('Traffic Spike Simulation', function () {
    sendGraphQL(EXPLORE_AUCTIONS_QUERY, {}, null, {
      scenario: 'spike_traffic',
    });
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-tests/reports/04-spike-report.html': generateHtmlReport(
      data,
      'Traffic Spike & Sudden Burst Test',
    ),
    stdout: `
=========================================
⚡ SPIKE TEST COMPLETED
=========================================
Total Requests: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}
Throughput: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : 0} req/s
Failed Rate: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
p95 Duration: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0}ms
Report: load-tests/reports/04-spike-report.html
=========================================
`,
  };
}
