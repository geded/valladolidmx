/**
 * Reservaciones · Preventa (como en Zazil).
 *
 * Preventas con folio «PRE-», personas, total y vigencia. Al pagarse por el
 * cobro de la plataforma muestran su reservación. Se crean desde la ficha del
 * prospecto o con `#enlace` en WhatsApp; aquí se ven, se amplían, se
 * cancelan y se reenvían.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Clock, Copy, Search, Send, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ReservationsTabs } from "@/components/concierge/ReservationsTabs";
import { toast } from "@/lib/toast";
import { meridaDate, meridaDateTime } from "@/lib/time/merida";
import {
  PRESALE_EXTEND_OPTIONS,
  PRESALE_STATE_LABEL,
  presaleMoney,
  timeLeftLabel,
  type PresaleState,
} from "@/lib/crm/presale-rules";
import {
  cancelPresale,
  extendPresale,
  listPresales,
  resendPresale,
  type PresaleRow,
} from "@/lib/crm/presales.functions";

export const Route = createFileRoute("/_authenticated/concierge/preventa")({
  head: () => ({
    meta: [
      { title: "Preventa | Centro Concierge" },
      {
        name: "description",
        content: "Preventas con folio, total y vigencia: enlaces de pago de experiencias del Centro Concierge.",
      },
      { property: "og:title", content: "Preventa | Centro Concierge" },
      {
        property: "og:description",
        content: "Preventas con folio, total y vigencia: enlaces de pago de experiencias del Centro Concierge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PresalesPage,
});

const FILTERS: Array<["all" | PresaleState, string]> = [
  ["all", "Todas"],
  ["vigente", "Vigentes"],
  ["en_pago", "En pago"],
  ["pagada", "Pagadas"],
  ["vencida", "Vencidas"],
  ["cancelada", "Canceladas"],
];

const STATE_CLASS: Record<PresaleState, string> = {
  vigente: "border-success/30 bg-success/10 text-success",
  en_pago: "border-info/30 bg-info/10 text-info",
  pagada: "border-primary/30 bg-primary/10 text-primary",
  vencida: "border-warning/30 bg-warning/10 text-warning",
  cancelada: "border-border bg-muted text-muted-foreground",
};

function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(t);
  }, [ms]);
  return now;
}

function PresalesPage() {
  const list = useServerFn(listPresales);
  const [state, setState] = useState<"all" | PresaleState>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["crm-presales", state, search, page],
    queryFn: () => list({ data: { state, search, page } }),
    refetchInterval: 60_000,
  });
  const d = query.data;
  const now = useNow();

  return (
    <div className="space-y-6 pb-12">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Central de operaciones</p>
        <h1 className="mt-1 font-serif text-3xl">Preventa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enlaces de pago de experiencias con folio, total y vigencia. Al pagarse, aparece su reservación. Se
          crean desde la ficha del prospecto en{" "}
          <Link to="/concierge/prospectos" className="font-medium text-primary hover:underline">
            CRM Prospectos
          </Link>{" "}
          o con <span className="font-mono">#enlace</span> en WhatsApp.
        </p>
      </header>
      <ReservationsTabs active="/concierge/preventa" />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de preventas">
        {[
          ["Vigentes", String((d?.summary.counts.vigente ?? 0) + (d?.summary.counts.en_pago ?? 0)), presaleMoney(d?.summary.activeCents ?? 0)],
          ["Vencen en 6 horas", String(d?.summary.expiringSoon ?? 0), "Para darles seguimiento hoy"],
          ["Pagadas", String(d?.summary.counts.pagada ?? 0), presaleMoney(d?.summary.paidCents ?? 0)],
          ["Vencidas sin pago", String(d?.summary.counts.vencida ?? 0), "Amplía o rescata desde la ficha"],
        ].map(([label, value, hint]) => (
          <article key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-serif text-2xl">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </article>
        ))}
      </section>

      <section className="space-y-3" aria-label="Filtros">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            placeholder="Buscar folio, cliente, WhatsApp o experiencia"
            aria-label="Buscar preventa"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Estado">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={state === value}
              onClick={() => {
                setState(value);
                setPage(1);
              }}
              className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${
                state === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
              }`}
            >
              {label}
              {value !== "all" && d ? <span className="ml-1 text-xs opacity-70">{d.summary.counts[value]}</span> : null}
            </button>
          ))}
        </div>
      </section>

      {query.isLoading ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Cargando preventas…
        </p>
      ) : query.isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center text-sm">
          No pudimos cargar las preventas. Revisa que tu cuenta sea del equipo concierge.
        </p>
      ) : d?.rows.length ? (
        <ul className="grid gap-3 lg:grid-cols-2">
          {d.rows.map((r) => (
            <PresaleCard key={r.id} r={r} now={now} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay preventas con estos filtros.
        </p>
      )}

      <footer className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {d?.total ?? 0} preventas{d?.capped ? " · se muestran las 500 más recientes" : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <Button
            variant="outline"
            disabled={!d || page * d.pageSize >= d.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </footer>
    </div>
  );
}

function PresaleCard({ r, now }: { r: PresaleRow; now: Date }) {
  const qc = useQueryClient();
  const extendFn = useServerFn(extendPresale);
  const cancelFn = useServerFn(cancelPresale);
  const resendFn = useServerFn(resendPresale);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const open = r.state === "vigente" || r.state === "en_pago";
  const refresh = () => void qc.invalidateQueries({ queryKey: ["crm-presales"] });

  async function run<T extends { ok: boolean; error?: string }>(fn: () => Promise<T>, done: (v: T) => void) {
    setBusy(true);
    try {
      const v = await fn();
      if (!v.ok) toast.error(v.error ?? "No se pudo completar.");
      else done(v);
    } catch {
      toast.error("No se pudo completar. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function resend(send: boolean) {
    await run(
      () => resendFn({ data: { inviteId: r.id, sendWhatsApp: send } }),
      async (v) => {
        if (!("url" in v)) return;
        setLastUrl(v.url);
        try {
          await navigator.clipboard.writeText(v.url);
        } catch {
          /* queda visible para copiarlo */
        }
        if (send && v.sent) toast.success(`Preventa ${r.folio} enviada por WhatsApp.`);
        else if (send) toast.error(`Enlace copiado, pero no se envió: ${v.sendError ?? "sin detalle"}`);
        else toast.success("Enlace nuevo copiado. El anterior ya no sirve.");
      },
    );
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold">{r.folio}</p>
          <p className="mt-0.5 truncate text-base font-semibold">{r.productName}</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATE_CLASS[r.state]}`}>
          {PRESALE_STATE_LABEL[r.state]}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Cliente</dt>
          <dd className="truncate">
            {r.prospect ? (
              <Link
                to="/concierge/prospectos/$prospectId"
                params={{ prospectId: r.prospect.id }}
                className="font-medium text-primary hover:underline"
              >
                {r.prospect.firstName}
              </Link>
            ) : (
              "Sin ficha"
            )}
            {r.prospect ? <span className="block text-xs text-muted-foreground">{r.prospect.phone}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Total</dt>
          <dd className="font-semibold">
            {presaleMoney(r.totalCents, r.currency)}
            <span className="block text-xs font-normal text-muted-foreground">
              {r.quantity} {r.quantity === 1 ? "persona" : "personas"}
              {r.visitDate ? ` · visita ${meridaDate(r.visitDate)}` : ""}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Vigencia</dt>
          <dd>
            {r.state === "pagada" || r.state === "cancelada" ? (
              <span className="text-muted-foreground">{meridaDateTime(r.expiresAt)}</span>
            ) : (
              <span className={r.state === "vencida" ? "text-warning" : ""}>
                <Clock className="mr-1 inline size-3.5" aria-hidden />
                {timeLeftLabel(r.expiresAt, now)}
              </span>
            )}
            <span className="block text-xs text-muted-foreground">Creada {meridaDateTime(r.createdAt)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Reservación</dt>
          <dd>
            {r.order ? (
              <Link
                to="/concierge/reservaciones/$orderId"
                params={{ orderId: r.order.id }}
                className="font-mono font-semibold text-primary hover:underline"
              >
                {r.order.folio}
              </Link>
            ) : (
              <span className="text-muted-foreground">{r.openedAt ? "Abrió el enlace" : "Aún no abre el enlace"}</span>
            )}
            {r.order?.paidAt ? (
              <span className="block text-xs text-muted-foreground">Pagada {meridaDateTime(r.order.paidAt)}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      {r.cancelReason ? <p className="mt-2 text-xs text-muted-foreground">Motivo: {r.cancelReason}</p> : null}

      {r.state !== "pagada" && r.state !== "cancelada" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {open ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resend(false)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <Copy className="size-4" aria-hidden />
                Copiar enlace
              </button>
              {r.hasWhatsApp ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resend(true)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  <Send className="size-4" aria-hidden />
                  Mandar por WhatsApp
                </button>
              ) : null}
            </>
          ) : null}
          {PRESALE_EXTEND_OPTIONS.map((h) => (
            <button
              key={h}
              type="button"
              disabled={busy}
              onClick={() =>
                void run(
                  () => extendFn({ data: { inviteId: r.id, hours: h } }),
                  () => {
                    toast.success(`Preventa ${r.folio} ampliada ${h} horas.`);
                    refresh();
                  },
                )
              }
              className="inline-flex min-h-10 items-center rounded-full border border-border px-3 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              +{h} h
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmCancel((v) => !v)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-60"
          >
            <XCircle className="size-4" aria-hidden />
            Cancelar
          </button>
        </div>
      ) : null}

      {confirmCancel ? (
        <div className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <label className="grid gap-1 text-xs font-medium">
            Motivo (opcional)
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. cambió de fecha" />
          </label>
          <p className="text-xs text-muted-foreground">El enlace deja de servir. Una reservación que ya empezó a pagarse no se toca.</p>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() =>
              void run(
                () => cancelFn({ data: { inviteId: r.id, reason } }),
                () => {
                  toast.success(`Preventa ${r.folio} cancelada.`);
                  setConfirmCancel(false);
                  refresh();
                },
              )
            }
          >
            Cancelar preventa
          </Button>
        </div>
      ) : null}

      {lastUrl ? <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 text-xs">{lastUrl}</p> : null}
    </li>
  );
}
