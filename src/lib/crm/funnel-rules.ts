/**
 * CRM Prospectos · Fase 4 — embudo y rentabilidad por canal (reglas puras).
 *
 * Como el tablero de Zazil: entraron → dejaron datos → compradores →
 * reservaciones → ventas, separado por canal, con lo cobrado, lo que se
 * vendió con ayuda del concierge y el estado de los enlaces de pago.
 * Sin servidor ni navegador: lo usan la pestaña Estadísticas, la
 * exportación y las pruebas. Importes en centavos.
 */
import { presaleState, type PresaleState } from "./presale-rules";

export const FUNNEL_PERIODS = ["hoy", "7d", "30d", "mes", "todo"] as const;
export type FunnelPeriod = (typeof FUNNEL_PERIODS)[number];

export const FUNNEL_PERIOD_LABEL: Record<FunnelPeriod, string> = {
  hoy: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  mes: "Este mes",
  todo: "Todo",
};

/** Yucatán no cambia de horario: UTC−6 todo el año. */
const MERIDA_OFFSET_MS = 6 * 3600_000;

/** Inicio del periodo (hora de Yucatán para «Hoy» y «Este mes»); null = todo. */
export function funnelPeriodStart(period: FunnelPeriod, now: Date = new Date()): Date | null {
  if (period === "todo") return null;
  if (period === "7d") return new Date(now.getTime() - 7 * 86400_000);
  if (period === "30d") return new Date(now.getTime() - 30 * 86400_000);
  const local = new Date(now.getTime() - MERIDA_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = period === "hoy" ? local.getUTCDate() : 1;
  return new Date(Date.UTC(y, m, d) + MERIDA_OFFSET_MS);
}

export const FUNNEL_CHANNELS = ["web", "whatsapp", "otros"] as const;
export type FunnelChannel = (typeof FUNNEL_CHANNELS)[number];

export const FUNNEL_CHANNEL_LABEL: Record<FunnelChannel, string> = {
  web: "Alux en Valladolid.mx",
  whatsapp: "WhatsApp",
  otros: "Otros (manual, redes)",
};

export function channelOfProspectSource(source: string | null | undefined): FunnelChannel {
  if (source === "alux_web") return "web";
  if (source === "whatsapp") return "whatsapp";
  return "otros";
}

/** Estados de pedido que cuentan como venta (se llegó a cobrar). */
const SOLD = new Set(["paid", "fulfilled", "refunded"]);
/** De esas, las que siguen cobradas (sin reembolso). */
const COLLECTED = new Set(["paid", "fulfilled"]);

export interface FunnelProspect {
  readonly id: string;
  readonly source: string;
  readonly created_at: string;
  readonly linked_user_id: string | null;
  readonly case_id: string | null;
}

export interface FunnelOrder {
  readonly id: string;
  readonly user_id: string | null;
  readonly status: string;
  readonly total_amount: number | null;
  readonly paid_at: string | null;
  readonly source_case_id: string | null;
}

export interface FunnelInvite {
  readonly id: string;
  readonly prospect_id: string;
  readonly order_id: string | null;
  readonly created_at: string;
  readonly expires_at: string;
  readonly cancelled_at: string | null;
}

export interface FunnelInput {
  /** Pláticas sin cuenta que empezaron en el periodo, por canal. */
  readonly conversations: Readonly<Record<FunnelChannel, number>>;
  /** Todos los prospectos que pueden tener ventas (sin filtrar por fecha). */
  readonly prospects: readonly FunnelProspect[];
  /** Pedidos de esos prospectos (cuentas ligadas o enlaces de pago). */
  readonly orders: readonly FunnelOrder[];
  /** Enlaces de pago (preventas) de todos los prospectos. */
  readonly payInvites: readonly FunnelInvite[];
  /** Prospectos a los que un concierge les contestó o tomó su plática. */
  readonly conciergeTouched: ReadonlySet<string>;
  readonly since: Date | null;
  readonly now?: Date;
}

export interface FunnelRow {
  readonly channel: FunnelChannel | "total";
  readonly conversations: number;
  readonly prospects: number;
  readonly buyers: number;
  readonly reservations: number;
  /** Compradores por cada 100 pláticas. */
  readonly conversionPct: number;
  readonly soldCents: number;
  readonly collectedCents: number;
  readonly withConciergeCents: number;
  readonly aluxOnlyCents: number;
}

export interface FunnelLinks {
  readonly generated: number;
  readonly paid: number;
  readonly expired: number;
  readonly active: number;
  readonly cancelled: number;
}

export interface FunnelResult {
  readonly rows: readonly FunnelRow[];
  readonly total: FunnelRow;
  readonly links: FunnelLinks;
}

function inPeriod(iso: string | null, since: Date | null): boolean {
  if (!iso) return false;
  return since === null || new Date(iso).getTime() >= since.getTime();
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/**
 * Atribuye cada venta a un solo prospecto: primero por su enlace de pago,
 * después por la cuenta ligada. Una venta sin dueño claro no se cuenta
 * (igual que Zazil: no adivina).
 */
export function attributeOrders(
  input: Pick<FunnelInput, "prospects" | "orders" | "payInvites">,
): Map<string, { prospect: FunnelProspect; viaLink: boolean }> {
  const byId = new Map(input.prospects.map((p) => [p.id, p]));
  const byUser = new Map<string, FunnelProspect[]>();
  for (const p of input.prospects) {
    if (!p.linked_user_id) continue;
    byUser.set(p.linked_user_id, [...(byUser.get(p.linked_user_id) ?? []), p]);
  }
  const out = new Map<string, { prospect: FunnelProspect; viaLink: boolean }>();
  for (const inv of input.payInvites) {
    const p = byId.get(inv.prospect_id);
    if (inv.order_id && p) out.set(inv.order_id, { prospect: p, viaLink: true });
  }
  for (const o of input.orders) {
    if (out.has(o.id) || !o.user_id) continue;
    const owners = byUser.get(o.user_id) ?? [];
    if (owners.length === 1 && owners[0]) out.set(o.id, { prospect: owners[0], viaLink: false });
  }
  return out;
}

export function computeFunnel(input: FunnelInput): FunnelResult {
  const now = input.now ?? new Date();
  const owner = attributeOrders(input);
  const acc = new Map<
    FunnelChannel,
    {
      prospects: number;
      buyers: Set<string>;
      reservations: number;
      sold: number;
      collected: number;
      withConcierge: number;
    }
  >();
  for (const c of FUNNEL_CHANNELS)
    acc.set(c, {
      prospects: 0,
      buyers: new Set(),
      reservations: 0,
      sold: 0,
      collected: 0,
      withConcierge: 0,
    });

  for (const p of input.prospects) {
    if (inPeriod(p.created_at, input.since))
      acc.get(channelOfProspectSource(p.source))!.prospects++;
  }
  for (const o of input.orders) {
    if (!SOLD.has(o.status) || !inPeriod(o.paid_at, input.since)) continue;
    const who = owner.get(o.id);
    if (!who) continue;
    const a = acc.get(channelOfProspectSource(who.prospect.source))!;
    const cents = Math.max(0, o.total_amount ?? 0);
    a.buyers.add(who.prospect.id);
    a.reservations++;
    a.sold += cents;
    if (COLLECTED.has(o.status)) a.collected += cents;
    const concierge =
      who.viaLink ||
      (o.source_case_id !== null && o.source_case_id === who.prospect.case_id) ||
      input.conciergeTouched.has(who.prospect.id);
    if (concierge) a.withConcierge += cents;
  }

  const rows: FunnelRow[] = FUNNEL_CHANNELS.map((channel) => {
    const a = acc.get(channel)!;
    const conversations = input.conversations[channel] ?? 0;
    return {
      channel,
      conversations,
      prospects: a.prospects,
      buyers: a.buyers.size,
      reservations: a.reservations,
      conversionPct: pct(a.buyers.size, conversations),
      soldCents: a.sold,
      collectedCents: a.collected,
      withConciergeCents: a.withConcierge,
      aluxOnlyCents: a.sold - a.withConcierge,
    };
  });
  const sum = (k: keyof Omit<FunnelRow, "channel" | "conversionPct">) =>
    rows.reduce((s, r) => s + (r[k] as number), 0);
  const conversations = sum("conversations");
  const buyers = sum("buyers");
  const total: FunnelRow = {
    channel: "total",
    conversations,
    prospects: sum("prospects"),
    buyers,
    reservations: sum("reservations"),
    conversionPct: pct(buyers, conversations),
    soldCents: sum("soldCents"),
    collectedCents: sum("collectedCents"),
    withConciergeCents: sum("withConciergeCents"),
    aluxOnlyCents: sum("aluxOnlyCents"),
  };

  const statusById = new Map(input.orders.map((o) => [o.id, o.status]));
  const counts: Record<PresaleState, number> = {
    vigente: 0,
    en_pago: 0,
    pagada: 0,
    vencida: 0,
    cancelada: 0,
  };
  let generated = 0;
  for (const inv of input.payInvites) {
    if (!inPeriod(inv.created_at, input.since)) continue;
    generated++;
    counts[presaleState(inv, inv.order_id ? (statusById.get(inv.order_id) ?? null) : null, now)]++;
  }
  return {
    rows,
    total,
    links: {
      generated,
      paid: counts.pagada,
      expired: counts.vencida,
      active: counts.vigente + counts.en_pago,
      cancelled: counts.cancelada,
    },
  };
}

function money(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** CSV para abrir en Excel (separador coma, importes en pesos). */
export function funnelToCsv(result: FunnelResult, periodLabel: string): string {
  const head = [
    "Periodo",
    "Canal",
    "Pláticas",
    "Dejaron datos",
    "Compradores",
    "Reservaciones",
    "Conversión %",
    "Ventas MXN",
    "Cobrado MXN",
    "Con concierge MXN",
    "Solo Alux MXN",
  ];
  const line = (r: FunnelRow) =>
    [
      periodLabel,
      r.channel === "total" ? "Total" : FUNNEL_CHANNEL_LABEL[r.channel],
      r.conversations,
      r.prospects,
      r.buyers,
      r.reservations,
      r.conversionPct,
      money(r.soldCents),
      money(r.collectedCents),
      money(r.withConciergeCents),
      money(r.aluxOnlyCents),
    ]
      .map((v) => {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",");
  const l = result.links;
  return [
    head.join(","),
    ...result.rows.map(line),
    line(result.total),
    "",
    "Enlaces de pago,Generados,Pagados,Vencidos,Vigentes,Cancelados",
    `${periodLabel},${l.generated},${l.paid},${l.expired},${l.active},${l.cancelled}`,
  ].join("\n");
}
