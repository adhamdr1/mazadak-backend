import { sleep, group } from 'k6';
import { sendGraphQL } from '../helpers/graphql.js';
import { login } from '../helpers/auth.js';
import { THRESHOLDS, DEFAULT_USERS } from '../config.js';
import { generateHtmlReport } from '../helpers/reporter.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 concurrent bidders
    { duration: '1m', target: 150 }, // Ramp up to 150 concurrent bidders
    { duration: '1m', target: 300 }, // Peak bidding stress: 300 bidders
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: THRESHOLDS.stress,
};

const GET_ACTIVE_AUCTIONS_QUERY = `
  query GetActiveAuctionsForBidding {
    auctions(input: { page: 1, limit: 5 }, filter: { status: ACTIVE }) {
      items {
        _id
        title
        currentPrice
        minimumBidIncrement
        status
      }
    }
  }
`;

const PLACE_BID_MUTATION = `
  mutation PlaceBidStress($input: PlaceBidInput!) {
    placeBid(input: $input) {
      _id
      auctionId
      bidderId
      amount
      status
      createdAt
    }
  }
`;

/**
 * k6 setup() runs ONCE before any VU starts.
 * Login all seed users here to avoid hammering the auth endpoint
 * during the stress test (which would trigger the strict rate-limiter blacklist).
 * The returned object is shared (read-only) across all VUs.
 */
export function setup() {
  const tokens = DEFAULT_USERS.map((user) => login(user.email, user.password));
  return { tokens };
}

// data = the object returned by setup()
export default function (data) {
  // Each VU picks one pre-authenticated token in round-robin — no extra login calls.
  const token = data.tokens[(__VU - 1) % data.tokens.length];

  // 1. Fetch an active auction
  let targetAuction = null;
  const auctionsRes = sendGraphQL(GET_ACTIVE_AUCTIONS_QUERY, {}, token, {
    scenario: 'fetch_active_auction',
  });

  if (
    auctionsRes.success &&
    auctionsRes.data &&
    auctionsRes.data.auctions &&
    auctionsRes.data.auctions.items.length > 0
  ) {
    targetAuction = auctionsRes.data.auctions.items[0];
  }

  // 2. Place a bid under high concurrency
  if (targetAuction && token) {
    group('Place Concurrent Bid', function () {
      const bidAmount =
        (Number(targetAuction.currentPrice) || 100) +
        (Number(targetAuction.minimumBidIncrement) || 10) +
        Math.floor(Math.random() * 50);

      sendGraphQL(
        PLACE_BID_MUTATION,
        {
          input: {
            auctionId: targetAuction._id,
            amount: bidAmount,
          },
        },
        token,
        { scenario: 'place_bid_stress' },
      );
    });
  }

  // Human-like think time between bids: 1–2.5 seconds
  sleep(Math.random() * 1.5 + 1);
}

export function handleSummary(data) {
  return {
    'load-tests/reports/03-bidding-stress-report.html': generateHtmlReport(
      data,
      'Bidding Stress Test (High Concurrency)',
    ),
    stdout: `
=========================================
⚡ BIDDING STRESS TEST COMPLETED
=========================================
Total Requests: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}
Throughput: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : 0} req/s
Failed Rate: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
p95 Response Time: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0}ms
Report: load-tests/reports/03-bidding-stress-report.html
=========================================
`,
  };
}
