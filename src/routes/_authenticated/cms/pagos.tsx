/**
 * /_authenticated/cms/pagos — Panel administrativo de Pagos (Pagos).
 *
 * Vista de estado del proveedor de pagos activo, configuración de webhook
 * y auditoría de eventos recibidos. Las llaves API NO se administran aquí:
 * sólo se reporta si están configuradas (booleano). La captura/rotación
 * ocurre vía el flujo seguro de plataforma (Lovable Secrets).
 *
 * Sólo accesible a roles super_admin / admin (server-side enforced).
 */
import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getPaymentProviderStatus,
  listRecentPaymentEvents,
  getPaymentsSummary,
} from "@/lib/payments/admin.functions";

export const Route = createFileRoute("/_authenticated/cms/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos · CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content:
          "Configuración y auditoría del proveedor de pagos de la plataforma.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaymentsAdminPage,
});

function PaymentsAdminPage() {
  const fetchStatus = useServerFn(getPaymentProviderStatus);
  const fetchEvents = useServerFn(listRecentPaymentEvents);
  const fetchSummary = useServerFn(getPaymentsSummary);

  const statusQ = useQuery({
    queryKey: ["admin", "payments", "status"],
    queryFn: () => fetchStatus(),
    staleTime: 30_000,
  });
  const eventsQ = useQuery({
    queryKey: ["admin", "payments", "events"],
    queryFn: () => fetchEvents(),
    staleTime: 30_000,
  });
  const summaryQ = useQuery({
    queryKey: ["admin", "payments", "summary"],
    queryFn: () => fetchSummary(),
    staleTime: 30_000,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Pagos
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Pagos de la plataforma</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Estado del proveedor de pagos activo, configuración de webhook y
          últimos eventos recibidos. Las llaves API se almacenan como
          secretos de plataforma y no son visibles desde este panel.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumen
        </h2>
        <SummaryCards summary={summaryQ.data} loading={summaryQ.isLoading} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Proveedor activo
        </h2>
        <ProviderStatus
          status={statusQ.data}
          loading={statusQ.isLoading}
          error={statusQ.error}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Eventos recientes
        </h2>
        <EventsTable
          events={eventsQ.data ?? []}
          loading={eventsQ.isLoading}
          error={eventsQ.error}
        />
      </section>
    </div>
  );
}

function SummaryCards({
  summary,
  loading,
}: {
  summary:
    | {
        totals: { paid: number; processing: number; failed: number; unpaid: number };
        paidLast30dAmount: number;
        currency: string | null;
      }
    | undefined;
  loading: boolean;
}) {
  if (loading || !summary) {
    return (
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-card/40"
          />
        ))}
      </div>
    );
  }
  const cards: Array<{ label: string; value: string; tone?: string }> = [
    {
      label: "Pagadas",
      value: String(summary.totals.paid),
      tone: "text-emerald-600",
    },
    { label: "En proceso", value: String(summary.totals.processing) },
    {
      label: "Fallidas",
      value: String(summary.totals.failed),
      tone: "text-destructive",
    },
    {
      label: `Cobrado 30d ${summary.currency ?? "MXN"}`,
      value: summary.paidLast30dAmount.toLocaleString("es-MX", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
  ];
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-lg border border-border bg-card p-4"
        >
          <p className="text-xs text-muted-foreground">{c.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${c.tone ?? ""}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProviderStatus({
  status,
  loading,
  error,
}: {
  status:
    | {
        provider: string;
        secretsConfigured: { secretKey: boolean; webhookSecret: boolean };
        webhookUrl: string;
        requiredEvents: string[];
        mode: "test" | "live" | "unknown";
        ready: boolean;
      }
    | undefined;
  loading: boolean;
  error: unknown;
}) {
  if (loading) {
    return (
      <div className="mt-3 h-48 animate-pulse rounded-lg border border-border bg-card/40" />
    );
  }
  if (error || !status) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        No se pudo cargar el estado del proveedor.
      </div>
    );
  }
  const modeLabel =
    status.mode === "live"
      ? { text: "LIVE", cls: "bg-emerald-600/10 text-emerald-700" }
      : status.mode === "test"
        ? { text: "TEST", cls: "bg-amber-500/10 text-amber-700" }
        : { text: "SIN CONFIGURAR", cls: "bg-muted text-muted-foreground" };
  return (
    <div className="mt-3 rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Proveedor
          </p>
          <p className="mt-0.5 text-lg font-semibold capitalize">
            {status.provider}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider ${modeLabel.cls}`}
        >
          {modeLabel.text}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wider ${
            status.ready
              ? "bg-emerald-600/10 text-emerald-700"
              : "bg-amber-500/10 text-amber-700"
          }`}
        >
          {status.ready ? "✓ LISTO" : "⚠ PENDIENTE"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        <SecretRow
          label="STRIPE_SECRET_KEY"
          configured={status.secretsConfigured.secretKey}
          help="Llave secreta del API (sk_test_… o sk_live_…)."
        />
        <SecretRow
          label="STRIPE_WEBHOOK_SECRET"
          configured={status.secretsConfigured.webhookSecret}
          help="Secret de firma del webhook (whsec_…)."
        />
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          URL del webhook
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
            {status.webhookUrl}
          </code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(status.webhookUrl);
            }}
            className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
          >
            Copiar
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Configura esta URL en Stripe Dashboard → Developers → Webhooks.
        </p>
      </div>

      {status.requiredEvents.length > 0 ? (
        <div className="border-t border-border px-5 py-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Eventos requeridos
          </p>
          <ul className="mt-2 grid grid-cols-1 gap-1 text-xs md:grid-cols-2">
            {status.requiredEvents.map((e) => (
              <li key={e}>
                <code className="rounded bg-muted px-1.5 py-0.5">{e}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t border-border bg-muted/30 px-5 py-4 text-xs text-muted-foreground">
        <p>
          <strong className="font-semibold text-foreground">
            Cómo activar / rotar llaves:
          </strong>{" "}
          las llaves API se almacenan como secretos de plataforma cifrados y
          se inyectan al runtime del servidor. No son visibles ni
          administrables desde este panel por diseño. Pídele a Lovable
          actualizar <code>STRIPE_SECRET_KEY</code> y{" "}
          <code>STRIPE_WEBHOOK_SECRET</code> cuando crees o rotes la cuenta
          de Stripe.
        </p>
      </div>
    </div>
  );
}

function SecretRow({
  label,
  configured,
  help,
}: {
  label: string;
  configured: boolean;
  help: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 md:[&:nth-child(odd)]:border-r md:[&:nth-child(odd)]:border-border">
      <div className="min-w-0">
        <p className="font-mono text-xs">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{help}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          configured
            ? "bg-emerald-600/10 text-emerald-700"
            : "bg-amber-500/10 text-amber-700"
        }`}
      >
        {configured ? "✓ Configurado" : "⚠ Pendiente"}
      </span>
    </div>
  );
}

function EventsTable({
  events,
  loading,
  error,
}: {
  events: Array<{
    id: string;
    provider: string;
    provider_event_id: string;
    event_type: string;
    order_id: string | null;
    received_at: string;
    processed_at: string | null;
  }>;
  loading: boolean;
  error: unknown;
}) {
  const rows = useMemo(() => events.slice(0, 50), [events]);
  if (loading) {
    return (
      <div className="mt-3 h-40 animate-pulse rounded-lg border border-border bg-card/40" />
    );
  }
  if (error) {
    return (
      <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        No se pudieron cargar los eventos.
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Aún no se han recibido eventos del proveedor de pagos.
      </div>
    );
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Recibido</th>
            <th className="px-4 py-3 text-left font-medium">Proveedor</th>
            <th className="px-4 py-3 text-left font-medium">Tipo</th>
            <th className="px-4 py-3 text-left font-medium">Orden</th>
            <th className="px-4 py-3 text-left font-medium">Procesado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((e) => (
            <tr key={e.id}>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {new Date(e.received_at).toLocaleString("es-MX")}
              </td>
              <td className="px-4 py-3 text-xs capitalize">{e.provider}</td>
              <td className="px-4 py-3 font-mono text-xs">{e.event_type}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                {e.order_id ? e.order_id.slice(0, 8) : "—"}
              </td>
              <td className="px-4 py-3 text-xs">
                {e.processed_at ? (
                  <span className="text-emerald-700">✓</span>
                ) : (
                  <span className="text-amber-700">…</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}