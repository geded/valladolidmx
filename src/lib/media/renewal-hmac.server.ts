/**
 * H3·A4 · M2.3.1 · Fase B · Verificador HMAC canónico (server-only, puro).
 *
 * Contrato canónico (idéntico al SQL trigger `masu_trigger_renewal`):
 *   canonical = METHOD "\n" PATH "\n" TIMESTAMP "\n" NONCE "\n" HEX(SHA256(BODY))
 *   signature = HEX(HMAC-SHA256(secret, canonical))
 *
 * Orden de validación obligatorio (Founder §3):
 *   método → content-type → tamaño → timestamp → HMAC → (consumo de nonce
 *   y kill switch se hacen fuera de este módulo, en ese orden).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const RENEW_TIMESTAMP_WINDOW_S = 300;      // ±5 min
export const RENEW_BODY_MAX_BYTES     = 1024;      // 1 KB
export const RENEW_BATCH_MAX          = 50;        // filas por lote
export const RENEW_NONCE_MIN          = 24;
export const RENEW_NONCE_MAX          = 128;

export function computeBodyHashHex(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex");
}

export function buildCanonicalString(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  bodyHashHex: string,
): string {
  return `${method}\n${path}\n${timestamp}\n${nonce}\n${bodyHashHex}`;
}

export function computeSignatureHex(secret: string, canonical: string): string {
  return createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export type HmacVerifyReason =
  | "method"
  | "content_type"
  | "body_too_large"
  | "missing_header"
  | "bad_timestamp"
  | "bad_signature";

export type HmacVerifyResult =
  | { ok: true; nonce: string; timestamp: number }
  | { ok: false; reason: HmacVerifyReason };

export interface HmacVerifyInput {
  method: string;
  path: string;
  contentType: string | null;
  body: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
  nonceHeader: string | null;
  secret: string;
  now?: () => number;
}

export function verifyHmacRequest(input: HmacVerifyInput): HmacVerifyResult {
  if (input.method.toUpperCase() !== "POST") return { ok: false, reason: "method" };

  const ct = (input.contentType ?? "").toLowerCase().split(";")[0]?.trim();
  if (ct !== "application/json") return { ok: false, reason: "content_type" };

  const bodyBytes = Buffer.byteLength(input.body, "utf8");
  if (bodyBytes > RENEW_BODY_MAX_BYTES) return { ok: false, reason: "body_too_large" };

  if (!input.signatureHeader || !input.timestampHeader || !input.nonceHeader) {
    return { ok: false, reason: "missing_header" };
  }
  const nonce = input.nonceHeader.trim();
  if (nonce.length < RENEW_NONCE_MIN || nonce.length > RENEW_NONCE_MAX) {
    return { ok: false, reason: "missing_header" };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(nonce)) return { ok: false, reason: "missing_header" };

  const ts = Number.parseInt(input.timestampHeader, 10);
  if (!Number.isFinite(ts) || ts <= 0) return { ok: false, reason: "bad_timestamp" };
  const nowSec = Math.floor((input.now?.() ?? Date.now()) / 1000);
  if (Math.abs(nowSec - ts) > RENEW_TIMESTAMP_WINDOW_S) {
    return { ok: false, reason: "bad_timestamp" };
  }

  if (!/^[0-9a-f]{64}$/i.test(input.signatureHeader)) {
    return { ok: false, reason: "bad_signature" };
  }

  const bodyHash = computeBodyHashHex(input.body);
  const canonical = buildCanonicalString("POST", input.path, String(ts), nonce, bodyHash);
  const expected = computeSignatureHex(input.secret, canonical);
  if (!timingSafeEqualHex(input.signatureHeader, expected)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true, nonce, timestamp: ts };
}