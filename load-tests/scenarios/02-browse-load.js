import { sleep, group } from 'k6';
import { sendGraphQL } from '../helpers/graphql.js';
import { THRESHOLDS } from '../config.js';
import { generateHtmlReport } from '../helpers/reporter.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp up to 50 users
    { duration: '1m', target: 150 }, // Ramp up to 150 users
    { duration: '1m', target: 150 }, // Stay at 150 users (peak normal load)
    { duration: '30s', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: THRESHOLDS.load,
};

const BROWSE_AUCTIONS_QUERY = `
  query BrowseAuctions($input: PaginationInput!, $filter: AuctionsFilterInput) {
    auctions(input: $input, filter: $filter) {
      items {
        _id
        title
        category
        currentPrice
        startingPrice
        status
        startTime
        endTime
      }
      total
      totalPages
      hasNextPage
    }
  }
`;

const GET_AUCTION_DETAILS_QUERY = `
  query GetAuctionDetails($id: ID!) {
    auction(id: $id) {
      _id
      title
      description
      category
      currentPrice
      minimumBidIncrement
      status
      startTime
      endTime
      sellerId
    }
  }
`;

const GET_AUCTION_BIDS_QUERY = `
  query GetAuctionBids($auctionId: String!, $input: PaginationInput!, $filter: BidsFilterInput) {
    auctionBids(auctionId: $auctionId, input: $input, filter: $filter) {
      items {
        _id
        auctionId
        bidderId
        amount
        status
        createdAt
      }
      total
    }
  }
`;

export default function () {
  let sampledAuctionId = null;

  group('1. Browse & Filter Auctions', function () {
    const categories = [
      'ELECTRONICS',
      'CARS',
      'REAL_ESTATE',
      'ART',
      'WATCHES',
      'FASHION',
      null,
    ];
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];

    const res = sendGraphQL(
      BROWSE_AUCTIONS_QUERY,
      {
        input: { page: 1, limit: 10 },
        filter: randomCategory ? { category: randomCategory } : {},
      },
      null,
      { scenario: 'browse_auctions' },
    );

    if (
      res.success &&
      res.data &&
      res.data.auctions &&
      res.data.auctions.items.length > 0
    ) {
      sampledAuctionId = res.data.auctions.items[0]._id;
    }
  });

  sleep(Math.random() * 2 + 1); // Think time: 1-3 seconds

  if (sampledAuctionId) {
    group('2. View Auction Details', function () {
      sendGraphQL(GET_AUCTION_DETAILS_QUERY, { id: sampledAuctionId }, null, {
        scenario: 'auction_details',
      });
    });

    sleep(1);

    group('3. View Auction Bids History', function () {
      sendGraphQL(
        GET_AUCTION_BIDS_QUERY,
        {
          auctionId: sampledAuctionId,
          input: { page: 1, limit: 10 },
          filter: {},
        },
        null,
        { scenario: 'auction_bids' },
      );
    });
  }

  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'load-tests/reports/02-browse-load-report.html': generateHtmlReport(
      data,
      'Browse & Read Load Test',
    ),
    stdout: `
=========================================
⚡ BROWSE LOAD TEST COMPLETED
=========================================
Reqs: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}
Throughput: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : 0} req/s
Failed: ${data.metrics.http_req_failed ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%
p95 Duration: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(2) : 0}ms
Report: load-tests/reports/02-browse-load-report.html
=========================================
`,
  };
}
