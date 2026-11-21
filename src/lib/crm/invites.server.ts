/**
 * CRM Prospectos · Fase 3 · enlaces personales y envíos por WhatsApp (sólo servidor).
 *
 * Lo usan el panel (`closure.functions.ts`), el comando `#enlace` del
 * concierge y los recontactos automáticos. El código del enlace nunca se
 * guarda: sólo su huella SHA-256.
 */
import type { WhatsAppChannel } from "@/lib/crm/channel/types";
import {
  INVITE_TTL_DAYS,
  canSellDirect,
  generateInviteToken,
  hashInviteToken,
  inviteMessage,
  inviteUrl,
  type InvitePurpose,
} from "./closure-rules";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

const PRODUCT_COLUMNS =
  "id, name, slug, product_type, status, deleted_at, direct_sale_enabled, direct_sale_price_amount, direct_sale_currency";

export interface SellableExperience {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  currency: string;
}

type ProductRow = {
  id: string;
  name: string;
  slug: string | null;
  product_type: string | null;
  status: string | null;
  deleted_at: string | null;
  direct_sale_enabled: boolean | null;
  direct_sale_price_amount: number | null;
  direct_sale_currency: string | null;
};

function toSellable(p: ProductRow): SellableExperience {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.direct_sale_price_amount ?? 0,
    currency: p.direct_sale_currency ?? "MXN",
  };
}

export async function getSellableExperience(admin: Admin, productId: string): Promise<SellableExperience | null> {
  const { data } = await admin.from("products").select(PRODUCT_COLUMNS).eq("id", productId).maybeSingle();
  const p = data as unknown as ProductRow | null;
  return p && canSellDirect(p) ? toSellable(p) : null;
}

/** Busca experiencias con venta directa por nombre o slug. */
export async function searchSellableExperiences(admin: Admin, query: string, limit = 8): Promise<SellableExperience[]> {
  const term = query.trim().replace(/[%,()]/g, "").slice(0, 60);
  let q = admin
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("product_type", "experiencia" as never)
    .eq("status", "published" as never)
    .eq("direct_sale_enabled", true)
    .is("deleted_at", null)
    .order("name")
    .limit(limit);
  if (term) q = q.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) throw new Error(`experience_search_failed: ${error.message}`);
  return ((data ?? []) as unknown as ProductRow[]).filter((p) => canSellDirect(p)).map(toSellable);
}

export interface CreatedInvite {
  inviteId: string;
  url: string;
  purpose: InvitePurpose;
  productName: string | null;
}

export async function createProspectInviteRecord(
  admin: Admin,
  input: {
    prospectId: string;
    purpose: InvitePurpose;
    productId: string | null;
    createdBy: string | null;
    channel: "panel" | "whatsapp_command";
    origin: string;
  },
): Promise<CreatedInvite> {
  let productName: string | null = null;
  if (input.purpose === "pay") {
    if (!input.productId) throw new Error("product_required");
    const product = await getSellableExperience(admin, input.productId);
    if (!product) throw new Error("not_sellable");
    productName = product.name;
  }
  const token = generateInviteToken();
  const hash = await hashInviteToken(token);
  const expires = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("crm_prospect_invites")
    .insert({
      prospect_id: input.prospectId,
      token_hash: hash,
      purpose: input.purpose,
      product_id: input.purpose === "pay" ? input.productId : null,
      created_by: input.createdBy,
      channel: input.channel,
      expires_at: expires,
    } as never)
    .select("id")
    .single();
  if (error || !data) throw new Error(`invite_insert_failed: ${error?.message ?? "sin fila"}`);
  const { error: evError } = await admin.from("concierge_prospect_events").insert({
    prospect_id: input.prospectId,
    kind: "invite_created",
    actor_user_id: input.createdBy,
    body:
      input.purpose === "pay"
        ? `Enlace de pago creado para «${productName}».`
        : "Enlace personal para crear su cuenta creado.",
    meta: { invite_id: data.id, purpose: input.purpose, channel: input.channel },
  } as never);
  if (evError) console.warn("[crm.invite] evento no guardado", evError.message);
  return { inviteId: data.id as string, url: inviteUrl(input.origin, token), purpose: input.purpose, productName };
}

export interface ProspectWhatsAppTarget {
  sessionId: string;
  instanceName: string;
  remoteJid: string;
  language: string | null;
  aluxMode: string;
  lineStatus: string;
  lineAluxEnabled: boolean;
  lineAutoRecontact: boolean;
  lineOrigin: string | null;
}

/** La plática de WhatsApp más reciente del prospecto con su línea. */
export async function findProspectWhatsApp(admin: Admin, prospectId: string): Promise<ProspectWhatsAppTarget | null> {
  const { data: s } = await admin
    .from("alux_public_sessions")
    .select("id, wa_remote_jid, whatsapp_line_id, conversation_language, alux_mode")
    .eq("prospect_id", prospectId)
    .eq("channel", "whatsapp")
    .not("wa_remote_jid", "is", null)
    .not("whatsapp_line_id", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const session = s as unknown as {
    id: string;
    wa_remote_jid: string;
    whatsapp_line_id: string;
    conversation_language: string | null;
    alux_mode: string;
  } | null;
  if (!session) return null;
  const { data: l } = await admin
    .from("crm_whatsapp_lines")
    .select("instance_name, status, alux_enabled, auto_recontact, webhook_base_url")
    .eq("id", session.whatsapp_line_id)
    .maybeSingle();
  const line = l as unknown as {
    instance_name: string;
    status: string;
    alux_enabled: boolean;
    auto_recontact: boolean;
    webhook_base_url: string | null;
  } | null;
  if (!line) return null;
  return {
    sessionId: session.id,
    instanceName: line.instance_name,
    remoteJid: session.wa_remote_jid,
    language: session.conversation_language,
    aluxMode: session.alux_mode,
    lineStatus: line.status,
    lineAluxEnabled: line.alux_enabled,
    lineAutoRecontact: line.auto_recontact,
    lineOrigin: line.webhook_base_url,
  };
}

/** Envía un texto por la línea y lo guarda en la plática (para reconocer su eco). */
export async function sendToProspectWhatsApp(
  admin: Admin,
  channel: WhatsAppChannel,
  target: ProspectWhatsAppTarget,
  text: string,
  author: "alux" | "concierge",
  createdBy: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (target.lineStatus !== "connected") return { ok: false, error: "La línea de WhatsApp no está conectada." };
  let sentId: string | null = null;
  let sendError: string | null = null;
  try {
    sentId = (await channel.sendText(target.instanceName, target.remoteJid, text)).id;
  } catch (e) {
    sendError = e instanceof Error ? e.message.slice(0, 240) : "send_failed";
  }
  const { error } = await admin.from("alux_public_messages").insert({
    session_id: target.sessionId,
    ip_hash: "whatsapp",
    role: "assistant",
    author,
    channel: "whatsapp",
    content: text.slice(0, 8000),
    external_id: sentId,
    send_status: sendError ? "failed" : "accepted",
    created_by: createdBy,
  } as never);
  if (error) console.warn("[crm.whatsapp] mensaje no guardado", error.message);
  return sendError ? { ok: false, error: "No se pudo enviar por WhatsApp." } : { ok: true };
}

/** Crea el enlace y, si hay plática de WhatsApp conectada, se lo manda al cliente. */
export async function createAndSendInvite(
  admin: Admin,
  channel: WhatsAppChannel,
  input: {
    prospectId: string;
    purpose: InvitePurpose;
    productId: string | null;
    createdBy: string | null;
    via: "panel" | "whatsapp_command";
    origin: string;
    send: boolean;
  },
): Promise<CreatedInvite & { sent: boolean; sendError: string | null }> {
  const invite = await createProspectInviteRecord(admin, {
    prospectId: input.prospectId,
    purpose: input.purpose,
    productId: input.productId,
    createdBy: input.createdBy,
    channel: input.via,
    origin: input.origin,
  });
  if (!input.send) return { ...invite, sent: false, sendError: null };
  const target = await findProspectWhatsApp(admin, input.prospectId);
  if (!target) return { ...invite, sent: false, sendError: "Este prospecto no tiene plática de WhatsApp." };
  const { data: p } = await admin
    .from("concierge_prospects")
    .select("first_name, language")
    .eq("id", input.prospectId)
    .maybeSingle();
  const lang = target.language ?? p?.language ?? "es";
  const text = inviteMessage(lang, {
    firstName: p?.first_name ?? "",
    url: invite.url,
    purpose: invite.purpose,
    productName: invite.productName,
  });
  const r = await sendToProspectWhatsApp(admin, channel, target, text, "concierge", input.createdBy);
  return { ...invite, sent: r.ok, sendError: r.ok ? null : r.error };
}
