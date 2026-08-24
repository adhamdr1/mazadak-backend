/**
 * Custom HTML & Terminal Summary Reporter for k6
 */

export function generateHtmlReport(data, title = 'k6 Performance Test Report') {
  const metrics = data.metrics || {};

  const httpReqs = metrics.http_reqs ? metrics.http_reqs.values.count : 0;
  const httpRate = metrics.http_reqs
    ? metrics.http_reqs.values.rate.toFixed(2)
    : 0;
  const failedRate = metrics.http_req_failed
    ? (metrics.http_req_failed.values.rate * 100).toFixed(2)
    : 0;

  const dur = metrics.http_req_duration ? metrics.http_req_duration.values : {};
  const avg = dur.avg ? dur.avg.toFixed(2) : 0;
  const min = dur.min ? dur.min.toFixed(2) : 0;
  const med = dur.med ? dur.med.toFixed(2) : 0;
  const max = dur.max ? dur.max.toFixed(2) : 0;
  const p90 = dur['p(90)'] ? dur['p(90)'].toFixed(2) : 0;
  const p95 = dur['p(95)'] ? dur['p(95)'].toFixed(2) : 0;
  const p99 = dur['p(99)'] ? dur['p(99)'].toFixed(2) : 0;

  const vus = metrics.vus ? metrics.vus.values.value : 0;
  const vusMax = metrics.vus_max ? metrics.vus_max.values.value : 0;

  // Thresholds evaluation
  let allThresholdsPassed = true;
  const thresholdRows = [];

  for (const [metricName, metricData] of Object.entries(metrics)) {
    if (metricData.thresholds) {
      for (const [thresholdName, thresholdData] of Object.entries(
        metricData.thresholds,
      )) {
        const passed = thresholdData.ok;
        if (!passed) allThresholdsPassed = false;
        thresholdRows.push(`
          <tr>
            <td><code>${metricName}</code></td>
            <td><code>${thresholdName}</code></td>
            <td><span class="badge ${passed ? 'badge-pass' : 'badge-fail'}">${passed ? 'PASSED' : 'FAILED'}</span></td>
          </tr>
        `);
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Mazadak Backend</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --success: #22c55e;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text-main); padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--card-border); }
    .header h1 { font-size: 1.8rem; font-weight: 700; color: var(--accent); }
    .status-badge { padding: 0.5rem 1.2rem; border-radius: 9999px; font-weight: 700; font-size: 0.9rem; text-transform: uppercase; }
    .status-pass { background: rgba(34, 197, 94, 0.2); color: var(--success); border: 1px solid var(--success); }
    .status-fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 1.5rem; }
    .card-title { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .card-value { font-size: 2rem; font-weight: 800; color: #fff; }
    .card-sub { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem; }
    .section-title { font-size: 1.2rem; font-weight: 600; margin: 1.5rem 0 1rem 0; color: #cbd5e1; }
    table { width: 100%; border-collapse: collapse; background: var(--card-bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--card-border); }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid var(--card-border); }
    th { background: #131d31; color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; }
    td { font-size: 0.95rem; }
    .badge { padding: 0.25rem 0.6rem; border-radius: 6px; font-weight: 600; font-size: 0.75rem; }
    .badge-pass { background: rgba(34, 197, 94, 0.2); color: var(--success); }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    code { font-family: monospace; background: #0f172a; padding: 0.2rem 0.4rem; border-radius: 4px; color: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Mazadak - ${title}</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Generated on: ${new Date().toLocaleString()}</p>
      </div>
      <div class="status-badge ${allThresholdsPassed ? 'status-pass' : 'status-fail'}">
        ${allThresholdsPassed ? '✓ All Thresholds Passed' : '✗ Thresholds Breached'}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Total Requests</div>
        <div class="card-value">${httpReqs.toLocaleString()}</div>
        <div class="card-sub">Throughput: ${httpRate} req/s</div>
      </div>
      <div class="card">
        <div class="card-title">Failure Rate</div>
        <div class="card-value" style="color: ${Number(failedRate) > 1 ? 'var(--danger)' : 'var(--success)'}">${failedRate}%</div>
        <div class="card-sub">${failedRate === '0.00' ? 'Flawless execution' : 'Errors encountered'}</div>
      </div>
      <div class="card">
        <div class="card-title">Response Time (p95)</div>
        <div class="card-value" style="color: ${Number(p95) > 1000 ? 'var(--warning)' : 'var(--accent)'}">${p95} ms</div>
        <div class="card-sub">p90: ${p90}ms | p99: ${p99}ms</div>
      </div>
      <div class="card">
        <div class="card-title">Virtual Users (Peak)</div>
        <div class="card-value">${vusMax}</div>
        <div class="card-sub">Current active: ${vus}</div>
      </div>
    </div>

    <div class="section-title">Latency Breakdown (Response Duration)</div>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Min</th>
          <th>Avg</th>
          <th>Median (p50)</th>
          <th>p90</th>
          <th>p95</th>
          <th>p99</th>
          <th>Max</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Duration (ms)</strong></td>
          <td>${min} ms</td>
          <td>${avg} ms</td>
          <td>${med} ms</td>
          <td>${p90} ms</td>
          <td><strong style="color: var(--accent);">${p95} ms</strong></td>
          <td>${p99} ms</td>
          <td>${max} ms</td>
        </tr>
      </tbody>
    </table>

    ${
      thresholdRows.length > 0
        ? `
      <div class="section-title">Quality Gate Thresholds</div>
      <table>
        <thead>
          <tr>
            <th>Target Metric</th>
            <th>Criteria</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${thresholdRows.join('')}
        </tbody>
      </table>
    `
        : ''
    }
  </div>
</body>
</html>`;
}
