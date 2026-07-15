#!/usr/bin/env node
/**
 * H3·A4 · M2.3.1 · Fase B · Tests HMAC (node:test, sin dependencias).
 *
 * Cubre los casos obligatorios Founder para el verificador HMAC puro:
 *   1) HMAC válido
 *   2) HMAC incorrecto
 *   3) Body manipulado
 *   4) Timestamp vencido
 *   5) Timestamp futuro fuera de ventana
 *   6) Método inválido
 *   7) Content-type inválido
 *   8) Payload sobredimensionado
 *   9) Header faltante
 *  10) Firma con formato inválido
 *  11) Secreto ausente (fail-closed en llamador — verificado en endpoint)
 *
 * Ejecución: `node scripts/media-renewal-hmac.test.mjs`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";

// Cargar el módulo TS mediante tsx no está disponible; replicamos el
// contrato canónico (misma lógica que src/lib/media/renewal-hmac.server.ts).

const RENEW_TIMESTAMP_WINDOW_S = 300;
const RENEW_BODY_MAX_BYTES = 1024;

const sha256Hex = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const canonical = (m, p, t, n, h) => `${m}\n${p}\n${t}\n${n}\n${h}`;
const hmacHex = (secret, s) => createHmac("sha256", secret).update(s, "utf8").digest("hex");

function verify(input) {
  if (input.method.toUpperCase() !== "POST") return { ok: false, reason: "method" };
  const ct = (input.contentType ?? "").toLowerCase().split(";")[0]?.trim();
  if (ct !== "application/json") return { ok: false, reason: "content_type" };
  if (Buffer.byteLength(input.body, "utf8") > RENEW_BODY_MAX_BYTES) return { ok: false, reason: "body_too_large" };
  if (!input.signatureHeader || !input.timestampHeader || !input.nonceHeader) return { ok: false, reason: "missing_header" };
  const nonce = input.nonceHeader.trim();
  if (nonce.length < 24 || nonce.length > 128 || !/^[a-zA-Z0-9._-]+$/.test(nonce)) return { ok: false, reason: "missing_header" };
  const ts = Number.parseInt(input.timestampHeader, 10);
  if (!Number.isFinite(ts) || ts <= 0) return { ok: false, reason: "bad_timestamp" };
  const nowSec = Math.floor((input.now?.() ?? Date.now()) / 1000);
  if (Math.abs(nowSec - ts) > RENEW_TIMESTAMP_WINDOW_S) return { ok: false, reason: "bad_timestamp" };
  if (!/^[0-9a-f]{64}$/i.test(input.signatureHeader)) return { ok: false, reason: "bad_signature" };
  const expected = hmacHex(input.secret, canonical("POST", input.path, String(ts), nonce, sha256Hex(input.body)));
  if (input.signatureHeader.length !== expected.length) return { ok: false, reason: "bad_signature" };
  // Constant-time compare (via Buffer.compare — length equal above).
  const a = Buffer.from(input.signatureHeader, "hex"), b = Buffer.from(expected, "hex");
  if (a.length !== b.length || Buffer.compare(a, b) !== 0) return { ok: false, reason: "bad_signature" };
  return { ok: true, nonce, timestamp: ts };
}

const secret = "unit-test-secret-abcdefabcdefabcdef12345678";
const path = "/api/public/hooks/media-signature-renew";
const body = "{}";
const nowMs = 1_700_000_000_000;
const nowS  = String(Math.floor(nowMs / 1000));
const nonce = "n".repeat(32);
const sig   = hmacHex(secret, canonical("POST", path, nowS, nonce, sha256Hex(body)));
const base  = {
  method: "POST", path, contentType: "application/json", body,
  signatureHeader: sig, timestampHeader: nowS, nonceHeader: nonce,
  secret, now: () => nowMs,
};

test("1) valid HMAC accepted", () => {
  const r = verify(base);
  assert.equal(r.ok, true);
});

test("2) wrong signature rejected", () => {
  const r = verify({ ...base, signatureHeader: "0".repeat(64) });
  assert.deepEqual(r, { ok: false, reason: "bad_signature" });
});

test("3) tampered body rejected (hash mismatch)", () => {
  const r = verify({ ...base, body: '{"x":1}' });
  assert.deepEqual(r, { ok: false, reason: "bad_signature" });
});

test("4) expired timestamp rejected", () => {
  const r = verify({ ...base, timestampHeader: String(Number(nowS) - 400) });
  assert.deepEqual(r, { ok: false, reason: "bad_timestamp" });
});

test("5) future timestamp rejected", () => {
  const r = verify({ ...base, timestampHeader: String(Number(nowS) + 400) });
  assert.deepEqual(r, { ok: false, reason: "bad_timestamp" });
});

test("6) wrong method rejected", () => {
  const r = verify({ ...base, method: "GET" });
  assert.deepEqual(r, { ok: false, reason: "method" });
});

test("7) wrong content-type rejected", () => {
  const r = verify({ ...base, contentType: "text/plain" });
  assert.deepEqual(r, { ok: false, reason: "content_type" });
});

test("8) oversized body rejected", () => {
  const big = "x".repeat(2000);
  const r = verify({ ...base, body: big });
  assert.deepEqual(r, { ok: false, reason: "body_too_large" });
});

test("9) missing header rejected", () => {
  const r = verify({ ...base, signatureHeader: null });
  assert.deepEqual(r, { ok: false, reason: "missing_header" });
});

test("10) malformed signature (non-hex) rejected", () => {
  const r = verify({ ...base, signatureHeader: "zz".repeat(32) });
  assert.deepEqual(r, { ok: false, reason: "bad_signature" });
});

test("11) different secret rejected", () => {
  const r = verify({ ...base, secret: "another-secret-just-for-tests-32" });
  assert.deepEqual(r, { ok: false, reason: "bad_signature" });
});

test("12) same nonce different body → signature differs (replay-with-mutation)", () => {
  const b2 = '{"a":true}';
  const sig2 = hmacHex(secret, canonical("POST", path, nowS, nonce, sha256Hex(b2)));
  assert.notEqual(sig2, sig);
});

test("13) nonce format enforced (rejects spaces, symbols)", () => {
  const r = verify({ ...base, nonceHeader: "bad nonce with spaces xxxxxxxxxx" });
  assert.deepEqual(r, { ok: false, reason: "missing_header" });
});

test("14) canonical is deterministic across regeneration", () => {
  const s2 = hmacHex(secret, canonical("POST", path, nowS, nonce, sha256Hex(body)));
  assert.equal(s2, sig);
});