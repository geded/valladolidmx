/**
 * /cms/visibilidad/spotlight — Ola 7.8 · Founder Spotlight
 *
 * Consola admin para activar sobre-exposición manual de una empresa
 * durante un período. Independiente de los paquetes de visibilidad.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { Sparkles, Search, Loader2, Power } from "lucide-react";
import {
  listFounderSpotlights,
  createFounderSpotlight,
  deactivateFounderSpotlight,
  searchBusinessesForSpotlight,
  type SpotlightRow,
} from "@/lib/visibility/founder-spotlight.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/cms/visibilidad/spotlight")({
  head: () => ({
    meta: [
      { title: "Founder Spotlight · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SpotlightPage,
});

function fmtDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Merida",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function SpotlightPage() {
  const qc = useQueryClient();
  const list = useServerFn(listFounderSpotlights);
  const create = useServerFn(createFounderSpotlight);
  const deactivate = useServerFn(deactivateFounderSpotlight);
  const search = useServerFn(searchBusinessesForSpotlight);

  const q = useQuery({
    queryKey: ["cms-spotlights"],
    queryFn: () => list({ data: {} }) as Promise<SpotlightRow[]>,
  });

  const [businessQuery, setBusinessQuery] = useState("");
  const [selected, setSelected] = useState<{ id: string; display_name: string } | null>(null);
  const [reason, setReason] = useState("");
  const [headline, setHeadline] = useState("");
  const [days, setDays] = useState(7);
  const [boost, setBoost] = useState(1000);

  const searchQuery = useQuery({
    queryKey: ["spotlight-search", businessQuery],
    queryFn: () => search({ data: { q: businessQuery } }),
    enabled: businessQuery.trim().length >= 2 && !selected,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecciona una empresa");
      return create({
        data: {
          business_id: selected.id,
          reason: reason.trim(),
          headline: headline.trim() || null,
          boost,
          days,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Spotlight activo por ${days} días`);
      setSelected(null);
      setBusinessQuery("");
      setReason("");
      setHeadline("");
      setDays(7);
      setBoost(1000);
      qc.invalidateQueries({ queryKey: ["cms-spotlights"] });
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "Error al crear spotlight";
      toast.error(msg);
    },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => deactivate({ data: { id } }),
    onSuccess: () => {
      toast.success("Spotlight desactivado");
      qc.invalidateQueries({ queryKey: ["cms-spotlights"] });
    },
    onError: () => toast.error("No se pudo desactivar"),
  });

  const active = useMemo(
    () =>
      (q.data ?? []).filter(
        (s) => s.is_active && new Date(s.ends_at).getTime() > Date.now(),
      ),
    [q.data],
  );
  const history = useMemo(
    () => (q.data ?? []).filter((s) => !active.some((a) => a.id === s.id)),
    [q.data, active],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary">
          CMS Studio · Visibilidad
        </p>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="size-6 text-warning" aria-hidden /> Founder Spotlight
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Da sobre-exposición manual a una empresa por un período limitado.
          Se suma al boost del paquete contratado y aparece con un
          distintivo especial en discovery.
        </p>
      </header>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activar nuevo Spotlight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Empresa</Label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">{selected.display_name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelected(null)}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  className="pl-8"
                  placeholder="Busca por nombre o slug…"
                  value={businessQuery}
                  onChange={(e) => setBusinessQuery(e.target.value)}
                />
                {searchQuery.data && searchQuery.data.length > 0 && (
                  <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-card shadow-soft">
                    {searchQuery.data.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSelected({ id: b.id, display_name: b.display_name });
                          setBusinessQuery("");
                        }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <div className="font-medium">{b.display_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {b.slug}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Distintivo visible (opcional)</Label>
            <Input
              id="headline"
              placeholder="Ej. Destacado por Valladolid"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={60}
            />
            <p className="text-[11px] text-muted-foreground">
              Aparece como badge dorado sobre la tarjeta. Si lo dejas en
              blanco, se usa "Destacado por Valladolid".
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo interno *</Label>
            <Textarea
              id="reason"
              placeholder="Contexto para el equipo (p. ej. lanzamiento del hotel, colaboración especial…)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="days">Duración (días)</Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="boost">Boost extra</Label>
              <Input
                id="boost"
                type="number"
                min={100}
                max={100000}
                step={100}
                value={boost}
                onChange={(e) => setBoost(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Se suma al ranking. 1000 = por encima de cualquier paquete.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => createMut.mutate()}
              disabled={!selected || reason.trim().length < 3 || createMut.isPending}
            >
              {createMut.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Activar Spotlight
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activos */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Spotlights activos ({active.length})
        </h2>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : active.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ningún spotlight activo ahora mismo.
          </p>
        ) : (
          <div className="grid gap-3">
            {active.map((s) => (
              <SpotlightCard
                key={s.id}
                row={s}
                onDeactivate={() => deactivateMut.mutate(s.id)}
                busy={deactivateMut.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Historial ({history.length})
          </h2>
          <div className="grid gap-2">
            {history.map((s) => (
              <SpotlightCard key={s.id} row={s} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SpotlightCard({
  row,
  onDeactivate,
  busy,
  muted,
}: {
  row: SpotlightRow;
  onDeactivate?: () => void;
  busy?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-4 shadow-soft ${
        muted ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              {row.business?.display_name ?? "—"}
            </p>
            {row.headline && (
              <Badge variant="outline" className="border-warning/50 text-warning">
                {row.headline}
              </Badge>
            )}
            <Badge variant="secondary">+{row.boost} boost</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{row.reason}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {fmtDate(row.starts_at)} → {fmtDate(row.ends_at)}
          </p>
        </div>
        {onDeactivate && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDeactivate}
            disabled={busy}
          >
            <Power className="mr-2 size-4" aria-hidden />
            Desactivar
          </Button>
        )}
      </div>
    </div>
  );
}