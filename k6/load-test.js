// ─── k6 Load Test ───────────────────────────────────────────
// Run: k6 run k6/load-test.js
// Target: 100 concurrent users, page load <2s, API response <500ms

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const apiLatency = new Trend("api_latency", true);
const pageLatency = new Trend("page_latency", true);

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  stages: [
    { duration: "30s", target: 20 },  // Ramp up to 20 users
    { duration: "1m", target: 50 },   // Ramp up to 50 users
    { duration: "2m", target: 100 },  // Peak: 100 concurrent users
    { duration: "1m", target: 50 },   // Scale down
    { duration: "30s", target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests under 2s
    api_latency: ["p(95)<500"],        // API responses under 500ms
    page_latency: ["p(95)<2000"],      // Page loads under 2s
    errors: ["rate<0.05"],             // Error rate below 5%
  },
};

// ─── Scenarios ──────────────────────────────────────────────

export default function () {
  const scenario = Math.random();

  if (scenario < 0.4) {
    testTenderList();
  } else if (scenario < 0.6) {
    testTenderDetail();
  } else if (scenario < 0.75) {
    testDashboard();
  } else if (scenario < 0.85) {
    testHealthCheck();
  } else if (scenario < 0.95) {
    testTenderSearch();
  } else {
    testMetrics();
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

function testTenderList() {
  const cities = ["İstanbul", "Ankara", "İzmir", "Bursa"];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const page = Math.floor(Math.random() * 5) + 1;

  const res = http.get(`${BASE_URL}/api/tenders?city=${city}&page=${page}&limit=20`);
  apiLatency.add(res.timings.duration);

  check(res, {
    "tender list status 200": (r) => r.status === 200,
    "tender list has data": (r) => {
      const body = r.json();
      return body && body.success === true;
    },
    "tender list under 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
}

function testTenderDetail() {
  const res = http.get(`${BASE_URL}/ihaleler`);
  pageLatency.add(res.timings.duration);

  check(res, {
    "page status 200": (r) => r.status === 200,
    "page under 2s": (r) => r.timings.duration < 2000,
  });

  errorRate.add(res.status !== 200);
}

function testDashboard() {
  const sections = ["kpis", "monthly", "sectors", "cities", "integrations"];
  const section = sections[Math.floor(Math.random() * sections.length)];

  const res = http.get(`${BASE_URL}/api/dashboard?section=${section}`);
  apiLatency.add(res.timings.duration);

  check(res, {
    "dashboard status ok": (r) => r.status === 200 || r.status === 401,
    "dashboard under 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status >= 500);
}

function testHealthCheck() {
  const systems = ["ekap", "kep", "esign", "edevlet", "database", "all"];
  const system = systems[Math.floor(Math.random() * systems.length)];

  const res = http.get(`${BASE_URL}/api/health/${system}`);
  apiLatency.add(res.timings.duration);

  check(res, {
    "health check responds": (r) => r.status === 200 || r.status === 503,
    "health check under 2s": (r) => r.timings.duration < 2000,
  });

  errorRate.add(res.status >= 500 && res.status !== 503);
}

function testTenderSearch() {
  const terms = ["yapım", "bilişim", "temizlik", "güvenlik", "taşıma"];
  const q = terms[Math.floor(Math.random() * terms.length)];

  const res = http.get(`${BASE_URL}/api/tenders?q=${q}&limit=10`);
  apiLatency.add(res.timings.duration);

  check(res, {
    "search status 200": (r) => r.status === 200,
    "search under 500ms": (r) => r.timings.duration < 500,
  });

  errorRate.add(res.status !== 200);
}

function testMetrics() {
  const res = http.get(`${BASE_URL}/api/monitoring/metrics`);
  apiLatency.add(res.timings.duration);

  // Metrics requires admin auth, so 401 is expected
  check(res, {
    "metrics responds": (r) => r.status === 200 || r.status === 401,
  });

  errorRate.add(res.status >= 500);
}
