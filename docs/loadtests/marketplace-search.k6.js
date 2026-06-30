// 14.40.7 — k6 carga · busqueda del Marketplace
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ramping: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "2m",  target: 50 },
        { duration: "30s", target: 0  },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed:   ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:8080";
const TERMS = ["cenote", "tour", "hotel", "tacos", "tequila", "ruinas", ""];

export default function () {
  const q = TERMS[Math.floor(Math.random() * TERMS.length)];
  const url = `${BASE}/_serverFn/searchMarketplace?q=${encodeURIComponent(q)}`;
  const res = http.get(url);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
