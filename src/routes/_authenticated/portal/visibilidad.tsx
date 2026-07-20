/**
 * /portal/visibilidad — Ola 7 · Sub-ola 7.2.a
 *
 * Comparativa de paquetes de visibilidad para la empresa activa.
 * Sin cobro en línea todavía: al elegir "Contratar", se registra una
 * solicitud (`pending`) que el equipo activa manualmente desde
 * /cms/visibilidad. Stripe checkout llega en Sub-ola 7.2.b.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  listAvailableVisibilityPlans,
  getBusinessActiveGrant,
  requestVisibilityGrant,
  type BusinessVisibilityGrant,
} from "@/lib/visibility/business-visibility-grants.functions";
import type { VisibilityPlan } from "@/lib/visibility/visibility-plans.functions";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

export const Route = createFileRoute("/_authenticated/portal/visibilidad")({
  component: VisibilityPage,
});

function useActiveBusinessId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setId(window.localStorage.getItem(STORAGE_KEY));
    const h = (e: Event) => {
      const d = (e as CustomEvent<string>).detail;
      setId(d ?? null);
    };
    window.addEventListener("portal:active-business-changed", h);
    return () =>
      window.removeEventListener("portal:active-business-changed", h);
  }, []);
  return id;
}

function formatMXN(v: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(v);
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Activo";
    case "pending":
      return "Solicitud en revisión";
    case "expired":
      return "Expirado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function VisibilityPage() {
  const businessId = useActiveBusinessId();
  const queryClient = useQueryClient();
  const fetchPlans = useServerFn(listAvailableVisibilityPlans);
  const fetchGrant = useServerFn(getBusinessActiveGrant);
  const doRequest = useServerFn(requestVisibilityGrant);

  const plansQ = useQuery({
    queryKey: ["visibility-plans-public"],
    queryFn: () => fetchPlans() as Promise<VisibilityPlan[]>,
    staleTime: 60_000,
  });

  const grantQ = useQuery({
    queryKey: ["visibility-grant", businessId],
    enabled: !!businessId,
    queryFn: () =>
      fetchGrant({ data: { business_id: businessId! } }) as Promise<
        BusinessVisibilityGrant | null
      >,
  });

  const [selectedPlan, setSelectedPlan] = useState<VisibilityPlan | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("monthly");
  const [notes, setNotes] = useState("");

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!businessId || !selectedPlan) throw new Error("missing_selection");
      return doRequest({
        data: {
          business_id: businessId,
          plan_id: selectedPlan.id,
          cycle: selectedCycle,
          notes: notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Solicitud enviada", {
        description:
          "El equipo de Valladolid.mx activará tu paquete en las próximas horas.",
      });
      queryClient.invalidateQueries({
        queryKey: ["visibility-grant", businessId],
      });
      setSelectedPlan(null);
      setNotes("");
    },
    onError: (e) => {
      toast.error("No pudimos registrar la solicitud", {
        description: e instanceof Error ? e.message : "Intenta nuevamente.",
      });
    },
  });

  const activeGrant = grantQ.data;
  const plans = plansQ.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
            Portal empresa
          </p>
          <h1 className="text-2xl font-semibold">Paquetes de visibilidad</h1>
          <p className="text-sm text-muted-foreground">
            Elige cuánta exposición quieres en Valladolid.mx, Alux y todo el
            ecosistema Oriente Maya.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/portal">
            <ArrowLeft className="mr-1 h-4 w-4" /> Portal
          </Link>
        </Button>
      </header>

      {!businessId ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Selecciona una empresa activa para ver los paquetes disponibles.
        </div>
      ) : (
        <>
          <ActiveGrantCard grant={activeGrant ?? null} loading={grantQ.isLoading} />

          {plansQ.isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando paquetes…
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No hay paquetes disponibles por el momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  isCurrent={activeGrant?.plan_id === p.id && activeGrant?.status === "active"}
                  onSelect={() => {
                    setSelectedPlan(p);
                    setSelectedCycle(p.cycles?.[0]?.cycle ?? "monthly");
                  }}
                />
              ))}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            El cobro con tarjeta llegará muy pronto. Por ahora, al solicitar un
            paquete el equipo de Valladolid.mx te contactará para coordinar el
            pago y activarlo en el mismo día hábil.
          </p>
        </>
      )}

      <RequestDialog
        plan={selectedPlan}
        cycle={selectedCycle}
        onCycleChange={setSelectedCycle}
        notes={notes}
        onNotesChange={setNotes}
        onClose={() => setSelectedPlan(null)}
        onConfirm={() => requestMut.mutate()}
        submitting={requestMut.isPending}
      />
    </div>
  );
}

function ActiveGrantCard({
  grant,
  loading,
}: {
  grant: BusinessVisibilityGrant | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card/60 p-4 text-sm text-muted-foreground">
        Cargando paquete actual…
      </div>
    );
  }
  if (!grant) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-primary" /> Aún no tienes paquete
          contratado
        </div>
        <p className="mt-1 text-muted-foreground">
          Tu empresa aparece con el plan <strong>Básico</strong> gratuito.
          Contrata un paquete superior para mayor visibilidad.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck className="h-4 w-4 text-primary" />
            Paquete actual: {grant.plan?.name ?? "—"}
          </div>
          <p className="text-xs text-muted-foreground">
            Estado: <strong>{statusLabel(grant.status)}</strong>
            {grant.expires_at && grant.status === "active" ? (
              <>
                {" · "}vigente hasta{" "}
                {new Date(grant.expires_at).toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: VisibilityPlan;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  const isFree = Number(plan.base_price_mxn) === 0;
  const highlights = useMemo(() => buildHighlights(plan), [plan]);
  return (
    <div
      className={
        "flex flex-col rounded-xl border p-5 shadow-soft transition " +
        (isCurrent
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-card hover:border-primary/40")
      }
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">{plan.name}</h3>
          {plan.description_short ? (
            <p className="text-xs text-muted-foreground">
              {plan.description_short}
            </p>
          ) : null}
        </div>
        {isCurrent ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
            Actual
          </span>
        ) : null}
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold">
          {isFree ? "Gratis" : formatMXN(Number(plan.base_price_mxn))}
          {!isFree ? (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              / mes
            </span>
          ) : null}
        </div>
        {plan.cycles && plan.cycles.length > 1 ? (
          <p className="text-[11px] text-muted-foreground">
            Ahorra hasta{" "}
            {Math.max(...plan.cycles.map((c) => c.discount_pct ?? 0))}% en ciclo
            anual
          </p>
        ) : null}
      </div>

      <ul className="mb-5 flex-1 space-y-2 text-sm">
        {highlights.map((h, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{h}</span>
          </li>
        ))}
      </ul>

      <Button
        variant={isCurrent ? "outline" : isFree ? "outline" : "default"}
        disabled={isCurrent || isFree}
        onClick={onSelect}
        className="w-full"
      >
        {isCurrent
          ? "Plan actual"
          : isFree
            ? "Plan por defecto"
            : "Contratar"}
      </Button>
    </div>
  );
}

function buildHighlights(plan: VisibilityPlan): string[] {
  const out: string[] = [];
  const l = plan.limits ?? {};
  const v = plan.visibility_levers ?? {};
  if (l.max_photos != null) out.push(`Hasta ${l.max_photos} fotos`);
  if (l.max_products != null) out.push(`Hasta ${l.max_products} productos`);
  if (l.max_active_coupons != null)
    out.push(`Hasta ${l.max_active_coupons} cupones activos`);
  if (l.max_events != null) out.push(`Hasta ${l.max_events} eventos`);
  if (l.max_featured_campaigns != null && l.max_featured_campaigns > 0)
    out.push(`${l.max_featured_campaigns} campañas destacadas`);
  if (v.discovery_boost && v.discovery_boost > 0)
    out.push(`+${v.discovery_boost} en descubrimiento`);
  if (v.map_boost && v.map_boost > 0) out.push(`+${v.map_boost} en el mapa`);
  if (v.home_boost && v.home_boost > 0)
    out.push(`+${v.home_boost} en la home`);
  if (v.alux_weight && v.alux_weight > 0)
    out.push(`Alux te recomienda (peso ${v.alux_weight})`);
  if (v.alux_proactive) out.push("Alux te menciona proactivamente");
  if (v.badge_visible) out.push("Badge oficial visible");
  if (v.golden_pin) out.push("Pin dorado en el mapa");
  if (v.in_emails) out.push("Menciones en emails a viajeros");
  if (v.cross_destination)
    out.push(
      `Visibilidad cruzada${
        v.cross_radius_km ? ` (${v.cross_radius_km} km)` : ""
      }`,
    );
  return out.slice(0, 8);
}

function RequestDialog({
  plan,
  cycle,
  onCycleChange,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
  submitting,
}: {
  plan: VisibilityPlan | null;
  cycle: string;
  onCycleChange: (c: string) => void;
  notes: string;
  onNotesChange: (n: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog open={!!plan} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contratar {plan?.name}</DialogTitle>
          <DialogDescription>
            Elige el ciclo. El equipo de Valladolid.mx te contactará para
            coordinar el pago y activar tu paquete el mismo día hábil.
          </DialogDescription>
        </DialogHeader>

        {plan ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Ciclo
              </label>
              <Select value={cycle} onValueChange={onCycleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {plan.cycles.map((c) => (
                    <SelectItem key={c.cycle} value={c.cycle}>
                      {c.label}
                      {c.discount_pct > 0 ? ` · -${c.discount_pct}%` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Notas (opcional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Cualquier detalle que el equipo deba saber…"
                rows={3}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              "Enviar solicitud"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
