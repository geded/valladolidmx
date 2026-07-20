import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listVisibilityPlans,
  upsertVisibilityPlan,
  toggleVisibilityPlan,
  duplicateVisibilityPlan,
  type VisibilityPlan,
  type VisibilityLevers,
  type VisibilityLimits,
  type VisibilityCycle,
} from "@/lib/visibility/visibility-plans.functions";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/visibilidad")({
  head: () => ({
    meta: [
      { title: "Paquetes de Visibilidad · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: VisibilidadPage,
});

function VisibilidadPage() {
  const listFn = useServerFn(listVisibilityPlans);
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["cms", "visibility-plans"],
    queryFn: () => listFn(),
  });
  const [editing, setEditing] = useState<Partial<VisibilityPlan> | null>(null);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">CMS · Comercial</p>
          <h1 className="text-2xl font-serif mt-1">Paquetes de Visibilidad</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Catálogo comercial editable. Ajusta precio, ciclos, límites, palancas de visibilidad
            y reglas comerciales de cada paquete. Los cambios se aplican en runtime — no hay
            lógica hardcodeada por nivel.
          </p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              slug: "",
              name: "",
              base_price_mxn: 0,
              badge_variant: "standard",
              color_token: "muted",
              display_order: (plans.length || 0) + 1,
              is_active: true,
              is_public: true,
              cycles: [{ cycle: "monthly", discount_pct: 0, label: "Mensual" }],
              limits: {},
              visibility_levers: {},
              commercial_rules: { auto_renew_default: true, grace_days: 3, requires_admin_approval: false },
              reporting: { bi_enabled: false, csv_export: false, monthly_email_report: false },
            })
          }
        >
          + Nuevo paquete
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onEdit={() => setEditing(plan)} />
          ))}
        </div>
      )}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {editing && (
            <PlanEditor
              plan={editing}
              onDone={() => setEditing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PlanRow({ plan, onEdit }: { plan: VisibilityPlan; onEdit: () => void }) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(toggleVisibilityPlan);
  const duplicateFn = useServerFn(duplicateVisibilityPlan);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["cms", "visibility-plans"] });

  const dupMutation = useMutation({
    mutationFn: () => duplicateFn({ data: { id: plan.id } }),
    onSuccess: () => {
      toast.success("Paquete duplicado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: (value: boolean) => toggleFn({ data: { id: plan.id, field: "is_active", value } }),
    onSuccess: invalidate,
  });

  return (
    <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-serif text-lg">{plan.name}</h3>
          <Badge variant="outline" className="text-[10px] uppercase">{plan.badge_variant}</Badge>
          {!plan.is_active && <Badge variant="secondary">Inactivo</Badge>}
          {!plan.is_public && <Badge variant="secondary">No visible</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          <code>{plan.slug}</code> · orden #{plan.display_order}
        </p>
        {plan.description_short && (
          <p className="text-sm text-muted-foreground mt-1">{plan.description_short}</p>
        )}
      </div>
      <div className="text-right">
        <p className="text-2xl font-semibold">${plan.base_price_mxn.toLocaleString("es-MX")}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MXN base/mes</p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={plan.is_active}
          onCheckedChange={(v) => toggleActive.mutate(v)}
          aria-label="Activo"
        />
        <Button variant="outline" size="sm" onClick={() => dupMutation.mutate()}>
          Duplicar
        </Button>
        <Button size="sm" onClick={onEdit}>Editar</Button>
      </div>
    </div>
  );
}

function PlanEditor({ plan, onDone }: { plan: Partial<VisibilityPlan>; onDone: () => void }) {
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertVisibilityPlan);
  const [form, setForm] = useState<Partial<VisibilityPlan>>({ ...plan });

  const set = <K extends keyof VisibilityPlan>(k: K, v: VisibilityPlan[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setLever = <K extends keyof VisibilityLevers>(k: K, v: VisibilityLevers[K]) =>
    setForm((f) => ({ ...f, visibility_levers: { ...(f.visibility_levers ?? {}), [k]: v } }));

  const setLimit = <K extends keyof VisibilityLimits>(k: K, v: VisibilityLimits[K]) =>
    setForm((f) => ({ ...f, limits: { ...(f.limits ?? {}), [k]: v } }));

  const save = useMutation({
    mutationFn: () =>
      upsertFn({
        data: {
          ...form,
          slug: (form.slug ?? "").trim().toLowerCase(),
          name: (form.name ?? "").trim(),
        } as never,
      }),
    onSuccess: () => {
      toast.success("Paquete guardado");
      qc.invalidateQueries({ queryKey: ["cms", "visibility-plans"] });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const levers = form.visibility_levers ?? {};
  const limits = form.limits ?? {};
  const rules = form.commercial_rules ?? {};
  const reporting = form.reporting ?? {};

  return (
    <>
      <SheetHeader>
        <SheetTitle>{form.id ? "Editar paquete" : "Nuevo paquete"}</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-8">
        <Section title="Identidad">
          <Grid>
            <Field label="Slug único">
              <Input
                value={form.slug ?? ""}
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="premium"
              />
            </Field>
            <Field label="Nombre visible">
              <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} placeholder="Premium" />
            </Field>
            <Field label="Descripción corta">
              <Input
                value={form.description_short ?? ""}
                onChange={(e) => set("description_short", e.target.value)}
              />
            </Field>
            <Field label="Orden en catálogo">
              <Input
                type="number"
                value={form.display_order ?? 0}
                onChange={(e) => set("display_order", Number(e.target.value))}
              />
            </Field>
          </Grid>
          <Field label="Descripción larga">
            <Textarea
              rows={3}
              value={form.description_long ?? ""}
              onChange={(e) => set("description_long", e.target.value)}
            />
          </Field>
          <Grid>
            <Field label="Variante de badge">
              <Input value={form.badge_variant ?? "standard"} onChange={(e) => set("badge_variant", e.target.value)} />
            </Field>
            <Field label="Color token">
              <Input value={form.color_token ?? "muted"} onChange={(e) => set("color_token", e.target.value)} />
            </Field>
          </Grid>
          <div className="flex gap-6">
            <ToggleField label="Activo" checked={!!form.is_active} onChange={(v) => set("is_active", v)} />
            <ToggleField label="Visible en catálogo público" checked={!!form.is_public} onChange={(v) => set("is_public", v)} />
          </div>
        </Section>

        <Section title="Precio y ciclos">
          <Field label="Precio base MXN / mes">
            <Input
              type="number"
              value={form.base_price_mxn ?? 0}
              onChange={(e) => set("base_price_mxn", Number(e.target.value))}
            />
          </Field>
          <CyclesEditor cycles={(form.cycles ?? []) as VisibilityCycle[]} onChange={(v) => set("cycles", v)} />
        </Section>

        <Section title="Límites operativos">
          <Grid>
            <NumField label="Máx. fotos" value={limits.max_photos} onChange={(v) => setLimit("max_photos", v)} />
            <NumField label="Máx. productos" value={limits.max_products} onChange={(v) => setLimit("max_products", v)} />
            <NumField label="Máx. cupones activos" value={limits.max_active_coupons} onChange={(v) => setLimit("max_active_coupons", v)} />
            <NumField label="Máx. eventos" value={limits.max_events} onChange={(v) => setLimit("max_events", v)} />
            <NumField label="Máx. campañas destacadas / mes" value={limits.max_featured_campaigns} onChange={(v) => setLimit("max_featured_campaigns", v)} />
          </Grid>
          <p className="text-xs text-muted-foreground">Usa <code>9999</code> para "ilimitado".</p>
        </Section>

        <Section title="Palancas de visibilidad">
          <SliderField label="Boost en Discovery" value={levers.discovery_boost ?? 0} onChange={(v) => setLever("discovery_boost", v)} />
          <SliderField label="Boost en Home" value={levers.home_boost ?? 0} onChange={(v) => setLever("home_boost", v)} />
          <SliderField label="Boost en Mapa" value={levers.map_boost ?? 0} onChange={(v) => setLever("map_boost", v)} />
          <SliderField label="Peso en Alux" value={levers.alux_weight ?? 0} onChange={(v) => setLever("alux_weight", v)} />
          <SliderField label="Peso en búsqueda" value={levers.search_weight ?? 0} onChange={(v) => setLever("search_weight", v)} />
          <div className="grid grid-cols-2 gap-4">
            <ToggleField label="Menciones proactivas de Alux" checked={!!levers.alux_proactive} onChange={(v) => setLever("alux_proactive", v)} />
            <NumField label="Máx. menciones Alux / día" value={levers.alux_daily_cap} onChange={(v) => setLever("alux_daily_cap", v)} />
            <ToggleField label="Badge visible en tarjeta" checked={!!levers.badge_visible} onChange={(v) => setLever("badge_visible", v)} />
            <ToggleField label="Pin dorado en mapa" checked={!!levers.golden_pin} onChange={(v) => setLever("golden_pin", v)} />
            <ToggleField label="Aparece en emails transaccionales" checked={!!levers.in_emails} onChange={(v) => setLever("in_emails", v)} />
            <ToggleField label="Cross-destino habilitado" checked={!!levers.cross_destination} onChange={(v) => setLever("cross_destination", v)} />
            <NumField label="Radio cross-destino (km)" value={levers.cross_radius_km} onChange={(v) => setLever("cross_radius_km", v)} />
          </div>
        </Section>

        <Section title="Reglas comerciales">
          <div className="grid grid-cols-2 gap-4">
            <ToggleField
              label="Auto-renovación por defecto"
              checked={!!rules.auto_renew_default}
              onChange={(v) => set("commercial_rules", { ...rules, auto_renew_default: v })}
            />
            <ToggleField
              label="Requiere aprobación admin"
              checked={!!rules.requires_admin_approval}
              onChange={(v) => set("commercial_rules", { ...rules, requires_admin_approval: v })}
            />
            <NumField
              label="Días de gracia tras vencer"
              value={rules.grace_days}
              onChange={(v) => set("commercial_rules", { ...rules, grace_days: v })}
            />
          </div>
        </Section>

        <Section title="Reportes">
          <div className="grid grid-cols-2 gap-4">
            <ToggleField label="Métricas BI habilitadas" checked={!!reporting.bi_enabled} onChange={(v) => set("reporting", { ...reporting, bi_enabled: v })} />
            <ToggleField label="Exportación CSV" checked={!!reporting.csv_export} onChange={(v) => set("reporting", { ...reporting, csv_export: v })} />
            <ToggleField label="Reporte mensual por email" checked={!!reporting.monthly_email_report} onChange={(v) => set("reporting", { ...reporting, monthly_email_report: v })} />
          </div>
        </Section>

        <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4 border-t">
          <Button variant="outline" onClick={onDone}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar paquete"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
    </Field>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function SliderField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <Label>{label}</Label>
        <span className="text-muted-foreground tabular-nums">{value}</span>
      </div>
      <Slider value={[value]} min={0} max={100} step={5} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function CyclesEditor({ cycles, onChange }: { cycles: VisibilityCycle[]; onChange: (v: VisibilityCycle[]) => void }) {
  const update = (i: number, patch: Partial<VisibilityCycle>) => {
    onChange(cycles.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };
  const add = () => onChange([...cycles, { cycle: "custom", discount_pct: 0, label: "Nuevo" }]);
  const remove = (i: number) => onChange(cycles.filter((_, idx) => idx !== i));
  return (
    <div className="space-y-2">
      <Label className="text-xs">Ciclos disponibles</Label>
      {cycles.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_100px_auto] gap-2 items-center">
          <Input value={c.cycle} onChange={(e) => update(i, { cycle: e.target.value })} placeholder="monthly" />
          <Input value={c.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Mensual" />
          <Input
            type="number"
            value={c.discount_pct}
            onChange={(e) => update(i, { discount_pct: Number(e.target.value) })}
            placeholder="0"
          />
          <Button variant="ghost" size="sm" onClick={() => remove(i)}>×</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>+ Agregar ciclo</Button>
      <p className="text-xs text-muted-foreground">Descuento en % sobre el precio base para ciclos largos.</p>
    </div>
  );
}