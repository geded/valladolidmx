import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { canAccessAluxSession } from "./session-access";

const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const cookieName = (key: string) => `vmx-alux-${digest(key).slice(0, 24)}`;

export async function aluxRequestUserId(): Promise<string | null> {
  const authorization = getRequest().headers.get("authorization");
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("alux_invalid_auth");
  return data.user.id;
}

export function aluxDeviceProofHash(key: string): string | null {
  const proof = getCookie(cookieName(key));
  return proof && /^[a-f0-9]{64}$/.test(proof) ? digest(proof) : null;
}

export async function readOwnedAluxSession(key: string, callerId: string | null) {
  const { data: row, error } = await supabaseAdmin.from("alux_public_sessions")
    .select("id, traveler_user_id, device_proof_hash").eq("session_key", key).maybeSingle();
  if (error) throw new Error("alux_session_unavailable");
  if (!row || !canAccessAluxSession(row.traveler_user_id, callerId, row.device_proof_hash, aluxDeviceProofHash(key))) {
    return null;
  }
  return row;
}

/** New keys and proofs are issued by the server, never claimed by identifier. */
export async function prepareOwnedAluxSession(candidate: string, callerId: string | null): Promise<string> {
  if (candidate && await readOwnedAluxSession(candidate, callerId)) return candidate;
  const key = crypto.randomUUID();
  const proof = randomBytes(32).toString("hex");
  const { error } = await supabaseAdmin.from("alux_public_sessions").insert({
    session_key: key,
    ip_hash: "device-owned",
    device_proof_hash: digest(proof),
    traveler_user_id: callerId,
  });
  if (error) throw new Error("alux_session_unavailable");
  setCookie(cookieName(key), proof, {
    httpOnly: true, secure: new URL(getRequest().url).protocol === "https:",
    sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return key;
}

export function hasAluxDeviceProof(key: string, storedHash: string | null): boolean {
  const suppliedHash = aluxDeviceProofHash(key);
  if (!storedHash || !suppliedHash || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(suppliedHash, "hex"));
}