// 14.40.7 — k6 carga · checkout end-to-end
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    steady: { executor: "constant-vus", vus: 20, duration: "2m" },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed:   ["rate<0.01"],
  },
};

const BASE = __ENV.BASE_URL ?? "http://localhost:8080";
const BEARER = __ENV.BEARER ?? "";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${BEARER}`,
  };
  const res = http.post(
    `${BASE}/_serverFn/createCheckoutSession`,
    JSON.stringify({}),
    { headers },
  );
  check(res, { "status 2xx": (r) => r.status >= 200 && r.status < 300 });
  sleep(1);
}
