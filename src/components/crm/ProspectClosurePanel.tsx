/**
 * CRM Prospectos · Fase 3 · pase a CRM Arma tu viaje y enlaces personales.
 *
 * - Si ya creó su cuenta: «Convertido a viajero» y acceso a su expediente.
 * - Si no: enlace personal para crear su cuenta (con lo platicado) o preventa
 *   de una experiencia con venta directa (folio, personas, total y vigencia,
 *   como en Zazil). Se copia o se manda por la plática de WhatsApp.
 */
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, Link2, Send } from "lucide-react";
import { toast } from "@/lib/toast";
import { meridaDateTime } from "@/lib/time/merida";
import { inviteState } from "@/lib/crm/closure-rules";
import {
  PRESALE_DEFAULT_TTL_HOURS,
  PRESALE_STATE_LABEL,
  PRESALE_TTL_OPTIONS,
  presaleMoney,
  presaleState,
  presaleTotal,
  ttlLabel,
} from "@/lib/crm/presale-rules";
import {
  createProspectInvite,
  listProspectInvites,
  searchDirectSaleExperiences,
} from "@/lib/crm/closure.functions";

const STATE_LABEL = { valid: "Vigente", used: "Usado", expired: "Vencido" } as const;

export function ProspectClosurePanel({
  prospectId,
  firstName,
  caseId,
  convertedAt,
  hasWhatsApp,
}: {
  prospectId: string;
  firstName: string;
  caseId: string | null;
  convertedAt: string | null;
  hasWhatsApp: boolean;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createProspectInvite);
  const listFn = useServerFn(listProspectInvites);
  const searchFn = useServerFn(searchDirectSaleExperiences);
  const [mode, setMode] = useState<"register" | "pay">("register");
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [visitDate, setVisitDate] = useState("");
  const [ttlHours, setTtlHours] = useState<number>(PRESALE_DEFAULT_TTL_HOURS);
  const [busy, setBusy] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const invites = useQuery({
    queryKey: ["crm-prospect-invites", prospectId],
    queryFn: () => listFn({ data: { prospectId } }),
    enabled: !caseId,
  });
  const experiences = useQuery({
    queryKey: ["crm-direct-sale-experiences", query],
    queryFn: () => searchFn({ data: { q: query } }),
    enabled: !caseId && mode === "pay",
    staleTime: 60_000,
  });

  if (caseId) {
    return (
      <section className="rounded-lg border border-success/30 bg-success/5 p-4">
        <h2 className="text-base font-semibold">Convertido a viajero</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {firstName} creó su cuenta{convertedAt ? ` el ${meridaDateTime(convertedAt)}` : ""}. Su viaje ya está en
          Mi Viaje y su expediente en CRM Arma tu viaje, con la ficha de traspaso.
        </p>
        <Link
          to="/concierge/expedientes/$caseId"
          params={{ caseId }}
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Abrir su expediente
        </Link>
      </section>
    );
  }

  async function create(send: boolean) {
    if (mode === "pay" && !productId) {
      toast.error("Elige la experiencia que va a pagar.");
      return;
    }
    setBusy(true);
    try {
      const r = await createFn({
        data: {
          prospectId,
          purpose: mode,
          productId: mode === "pay" ? productId : null,
          sendWhatsApp: send,
          ...(mode === "pay" ? { quantity, visitDate: visitDate || null, ttlHours } : {}),
        },
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLastUrl(r.url);
      try {
        await navigator.clipboard.writeText(r.url);
      } catch {
        /* el enlace queda visible para copiarlo a mano */
      }
      if (r.folio) void qc.invalidateQueries({ queryKey: ["crm-presales"] });
      if (send && r.sent) toast.success(r.folio ? `Preventa ${r.folio} enviada por WhatsApp.` : "Enlace enviado por WhatsApp y copiado.");
      else if (send) toast.error(`Enlace copiado, pero no se envió: ${r.sendError ?? "sin detalle"}`);
      else toast.success("Enlace copiado. Pégalo en la plática con el cliente.");
      void qc.invalidateQueries({ queryKey: ["crm-prospect-invites", prospectId] });
      void qc.invalidateQueries({ queryKey: ["crm-prospect", prospectId] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-base font-semibold">Pase a CRM Arma tu viaje</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Mándale su enlace personal. Trae su nombre y lo que platicó con Alux; al crear su cuenta, su viaje
        aparece en Mi Viaje y su expediente en CRM Arma tu viaje, asignado a quien lo atiende.
      </p>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de enlace">
        {(
          [
            ["register", "Crear su cuenta"],
            ["pay", "Preventa de experiencia"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => setMode(value)}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium ${
              mode === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "pay" ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-muted-foreground" htmlFor="crm-exp-search">
            Experiencia con venta directa (sólo las experiencias se cobran en línea)
          </label>
          <input
            id="crm-exp-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setProductId(null);
            }}
            placeholder="Busca por nombre"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm"
          />
          {experiences.isLoading ? (
            <p className="text-xs text-muted-foreground">Buscando…</p>
          ) : experiences.data?.length ? (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {experiences.data.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setProductId(x.id)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm ${
                      productId === x.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="truncate">{x.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {presaleMoney(x.price, x.currency)} por persona
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No hay experiencias con venta directa que coincidan. Lo demás lo cotiza el concierge.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Personas
              <input
                type="number"
                min={1}
                max={50}
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Fecha de visita (opcional)
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Vence en
              <select
                value={ttlHours}
                onChange={(e) => setTtlHours(Number(e.target.value))}
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                {PRESALE_TTL_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {ttlLabel(h)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(() => {
            const chosen = experiences.data?.find((x) => x.id === productId);
            return chosen ? (
              <p className="text-sm">
                Total de la preventa:{" "}
                <strong>{presaleMoney(presaleTotal(chosen.price, quantity), chosen.currency)}</strong>
                <span className="text-muted-foreground">
                  {" "}
                  · se paga completo por el cobro de la plataforma · reemplaza otra preventa activa del cliente
                </span>
              </p>
            ) : null;
          })()}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void create(false)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
        >
          <Copy className="size-4" aria-hidden />
          Crear y copiar enlace
        </button>
        {hasWhatsApp ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void create(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Send className="size-4" aria-hidden />
            Mandar por WhatsApp
          </button>
        ) : null}
      </div>
      {lastUrl ? (
        <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 text-xs">
          <Link2 className="mr-1 inline size-3.5" aria-hidden />
          {lastUrl}
        </p>
      ) : null}

      {invites.data?.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Enlaces enviados</h3>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {invites.data.map((i) => {
              if (i.purpose === "pay") {
                const ps = presaleState(i, null);
                return (
                  <li key={i.id}>
                    <Link to="/concierge/preventa" className="font-mono font-semibold text-primary hover:underline">
                      {i.folio ?? "Preventa"}
                    </Link>{" "}
                    · {presaleMoney(i.total_amount, i.currency ?? "MXN")} · {meridaDateTime(i.created_at)} ·{" "}
                    <span className={ps === "vigente" ? "text-success" : ""}>{PRESALE_STATE_LABEL[ps]}</span>
                    {i.opened_at && !i.used_at ? " · lo abrió" : ""}
                    {i.channel === "whatsapp_command" ? " · desde el teléfono (#enlace)" : ""}
                  </li>
                );
              }
              const st = inviteState(i);
              return (
                <li key={i.id}>
                  Crear cuenta · {meridaDateTime(i.created_at)} ·{" "}
                  <span className={st === "valid" ? "text-success" : ""}>{STATE_LABEL[st]}</span>
                  {i.opened_at && !i.used_at ? " · lo abrió" : ""}
                  {i.channel === "whatsapp_command" ? " · desde el teléfono (#enlace)" : ""}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
