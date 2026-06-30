/**
 * 14.60.3 — Portal Empresarial · bandeja Concierge.
 * El negocio responde cotizaciones sin acceso al expediente ni a la
 * identidad del viajero.
 */
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listBusinessConciergeQuotes,
  submitConciergeQuote,
  withdrawConciergeQuote,
  type ConciergeBusinessQuote,
} from "@/lib/concierge/concierge.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";
type Scope = "open" | "submitted" | "historical";

export const Route = createFileRoute("/_authenticated/portal/concierge")({
  component: PortalConciergePage,
  head: () => ({
    meta: [
      { title: "Concierge · Portal Empresarial" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function PortalConciergePage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("open");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBusinessId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const fetchQuotes = useServerFn(listBusinessConciergeQuotes);
  const qc = useQueryClient();
  const queryKey = ["portal", businessId, "concierge-quotes", scope] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchQuotes({ data: { businessId: businessId!, scope, limit: 100 } }),
    enabled: Boolean(businessId),
  });

  if (!businessId) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona una empresa para ver tu bandeja Concierge.
      </p>
    );
  }

  return (
    <section className="grid gap-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Portal Empresarial · Concierge
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Solicitudes de cotización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responde cotizaciones que el Concierge te envía. No tendrás acceso al
          expediente ni a la identidad del viajero.
        </p>
      </header>

      <nav className="flex gap-2 text-xs">
        {(["open", "submitted", "historical"] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={[
              "rounded-full px-3 py-1.5 transition-colors",
              scope === s
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card hover:bg-accent",
            ].join(" ")}
          >
            {s === "open" ? "Pendientes" : s === "submitted" ? "Enviadas" : "Histórico"}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : error ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Error desconocido"}
        </p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          Sin cotizaciones en este estado.
        </p>
      ) : (
        <ul className="grid gap-3">
          {data.map((q) => (
            <QuoteCard
              key={q.quote_id}
              quote={q}
              scope={scope}
              onChanged={() => qc.invalidateQueries({ queryKey })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function QuoteCard({
  quote,
  scope,
  onChanged,
}: {
  quote: ConciergeBusinessQuote;
  scope: Scope;
  onChanged: () => void;
}) {
  const submit = useServerFn(submitConciergeQuote);
  const withdraw = useServerFn(withdrawConciergeQuote);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState("MXN");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const expired = useMemo(
    () => quote.valid_until && new Date(quote.valid_until) < new Date(),
    [quote.valid_until],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setErr("Monto inválido");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          quoteId: quote.quote_id,
          totalAmountCents: cents,
          currency,
          notes: notes || null,
          terms: terms || null,
        },
      });
      onChanged();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!confirm("¿Retirar esta cotización?")) return;
    try {
      await withdraw({ data: { quoteId: quote.quote_id, reason: null } });
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al retirar");
    }
  };

  return (
    <li className="rounded-md border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{quote.request.title}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {quote.status}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Tipo: {quote.request.kind}
        {quote.valid_until
          ? ` · Vigente hasta ${new Date(quote.valid_until).toLocaleString()}`
          : ""}
      </p>
      {quote.request.notes ? (
        <p className="mt-2 text-xs text-foreground/80">
          Notas del concierge: {quote.request.notes}
        </p>
      ) : null}
      {quote.total_amount_cents != null && (
        <p className="mt-2 text-xs">
          Total enviado:{" "}
          {(quote.total_amount_cents / 100).toLocaleString("es-MX", {
            style: "currency",
            currency: quote.currency,
          })}
        </p>
      )}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      {scope === "open" && quote.status === "requested" && !expired && (
        <div className="mt-3">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
            >
              Enviar cotización
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-2 grid gap-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Total"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                >
                  <option>MXN</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas para el concierge"
                rows={2}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Condiciones comerciales"
                rows={2}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {(quote.status === "requested" || quote.status === "submitted") && (
        <button
          type="button"
          onClick={handleWithdraw}
          className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Retirar
        </button>
      )}
    </li>
  );
}
