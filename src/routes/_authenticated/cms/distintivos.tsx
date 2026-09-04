/**
 * /_authenticated/cms/distintivos — Autoridad institucional (Lote 3B · C).
 *
 * Administra qué destinos ostentan cada distintivo institucional. El
 * registry sigue siendo la fuente de verdad del CONTRATO del distintivo
 * (iconografía, color, prioridad, verificación); aquí sólo se administra
 * la AUTORIDAD vigente. Los campos vienen precargados con la autoridad
 * actual: guardar sin cambios no altera ninguna superficie pública.
 *
 * Sólo super_admin / admin (validado en servidor).
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  INSTITUTIONAL_BADGE_REGISTRY,
  type BadgeKind,
} from "@/lib/experience-builder/blocks/experience-institutional-badges/institutional-badges.registry";
import {
  getInstitutionalAuthorityAdmin,
  updateInstitutionalAuthoritySettings,
} from "@/lib/institutional/institutional-authority.functions";
import { INSTITUTIONAL_AUTHORITY_QUERY_KEY } from "@/lib/institutional/institutional-context";

export const Route = createFileRoute("/_authenticated/cms/distintivos")({
  head: () => ({
    meta: [
      { title: "Distintivos institucionales · CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content: "Autoridad institucional vigente: destinos que ostentan cada distintivo oficial.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InstitutionalAuthorityPage,
});

/** Distintivos con autoridad territorial (los demás no se restringen por destino). */
const RESTRICTABLE_KINDS = (Object.keys(INSTITUTIONAL_BADGE_REGISTRY) as BadgeKind[]).filter(
  (kind) => Boolean(INSTITUTIONAL_BADGE_REGISTRY[kind].restrictedSlugs),
);

/** Autoridad de referencia = fallback declarado en el registry. */
function registryFallback(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kind of RESTRICTABLE_KINDS) {
    out[kind] = (INSTITUTIONAL_BADGE_REGISTRY[kind].restrictedSlugs ?? []).join(", ");
  }
  return out;
}

function toPayload(form: Record<string, string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [kind, value] of Object.entries(form)) {
    out[kind] = value
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }
  return out;
}

function InstitutionalAuthorityPage() {
  const fetchAuthority = useServerFn(getInstitutionalAuthorityAdmin);
  const saveAuthority = useServerFn(updateInstitutionalAuthoritySettings);
  const queryClient = useQueryClient();
  const fallback = useMemo(registryFallback, []);
  const [form, setForm] = useState<Record<string, string>>(fallback);

  const authorityQ = useQuery({
    queryKey: ["admin", "institutional", "authority"],
    queryFn: () => fetchAuthority(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!authorityQ.data) return;
    setForm((prev) => {
      const next = { ...prev };
      for (const kind of RESTRICTABLE_KINDS) {
        const slugs = authorityQ.data?.[kind];
        if (slugs) next[kind] = slugs.join(", ");
      }
      return next;
    });
  }, [authorityQ.data]);

  const save = useMutation({
    mutationFn: (values: Record<string, string>) => saveAuthority({ data: toPayload(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "institutional", "authority"] });
      queryClient.invalidateQueries({ queryKey: INSTITUTIONAL_AUTHORITY_QUERY_KEY });
      toast.success("Autoridad institucional guardada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Distintivos
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Autoridad institucional</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Destinos que ostentan cada distintivo oficial, separados por comas. Los campos vienen
          precargados con la autoridad vigente: si se dejan tal cual, nada cambia en las páginas
          públicas.
        </p>
      </header>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        {RESTRICTABLE_KINDS.map((kind) => (
          <div key={kind} className="space-y-2">
            <Label htmlFor={`badge-${kind}`}>{INSTITUTIONAL_BADGE_REGISTRY[kind].label}</Label>
            <Input
              id={`badge-${kind}`}
              value={form[kind] ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, [kind]: event.target.value }))}
              disabled={authorityQ.isLoading || save.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Identificadores de destino separados por comas. Valor de referencia:{" "}
              {fallback[kind] || "—"}
            </p>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={save.isPending || authorityQ.isLoading}>
            {save.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => setForm(fallback)}
          >
            Restaurar valores actuales
          </Button>
        </div>
      </form>
    </div>
  );
}
