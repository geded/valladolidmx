/** Autorización firmada y breve para una ventana pública de Alux. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmbedHost, normalizeEmbedSlug } from "./channels";

const TOKEN_TTL_SECONDS = 15 * 60;

type EmbedGrant = {
  host: string;
  destino: string | null;
  empresa: string | null;
  exp: number;
};

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function issueAluxEmbedToken(
  input: { host: string; destino?: string | null; empresa?: string | null },
  secret: string,
  now = Date.now(),
): string | null {
  const host = normalizeEmbedHost(input.host);
  if (!host || !secret) return null;
  const payload: EmbedGrant = {
    host,
    destino: normalizeEmbedSlug(input.destino ?? ""),
    empresa: normalizeEmbedSlug(input.empresa ?? ""),
    exp: Math.floor(now / 1000) + TOKEN_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyAluxEmbedToken(
  token: string,
  secret: string,
  now = Date.now(),
): EmbedGrant | null {
  if (!secret || token.length > 4096) return null;
  const [encoded, supplied, extra] = token.split(".");
  if (!encoded || !supplied || extra || !safeEqual(supplied, signature(encoded, secret))) {
    return null;
  }
  try {
    const value = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Partial<EmbedGrant>;
    const host = normalizeEmbedHost(typeof value.host === "string" ? value.host : "");
    if (!host || !Number.isInteger(value.exp) || Number(value.exp) < Math.floor(now / 1000)) {
      return null;
    }
    return {
      host,
      destino: normalizeEmbedSlug(typeof value.destino === "string" ? value.destino : ""),
      empresa: normalizeEmbedSlug(typeof value.empresa === "string" ? value.empresa : ""),
      exp: Number(value.exp),
    };
  } catch {
    return null;
  }
}
