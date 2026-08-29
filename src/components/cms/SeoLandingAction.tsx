/**
 * G8-R1-C+L · CL3 — Acción contextual "Crear Landing SEO".
 *
 * Presentación pura: la autorización efectiva vive en las server functions
 * y en RLS. Aquí sólo se oculta el botón para roles sin capacidad editorial.
 *
 * Comportamiento:
 *  - Sin landing: crea un borrador `kind=landing` con la plantilla
 *    `premium-seo-landing` (autoridad Zazil, presentación Editorial) llena
 *    únicamente con datos reales de la entidad.
 *  - Con landing existente: abre la existente (idempotente, jamás duplica).
 */
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import {
  canManageSeoLandings,
  type SeoLandingEntityType,
} from "@/lib/experience-builder/seo-landing/seo-landing-creation";
import {
  createSeoLandingDraft,
  resolveSeoLandingForEntity,
} from "@/lib/experience-builder/seo-landing/seo-landing-creation.functions";

interface Props {
  entityType: SeoLandingEntityType;
  entityId: string;
}

export function SeoLandingAction({ entityType, entityId }: Props) {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resolveFn = useServerFn(resolveSeoLandingForEntity);
  const createFn = useServerFn(createSeoLandingDraft);
  const allowed = canManageSeoLandings(roles);

  const resolution = useQuery({
    queryKey: ["eb", "seo-landing", entityType, entityId],
    queryFn: () => resolveFn({ data: { entityType, entityId } }),
    enabled: allowed && Boolean(entityId),
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { entityType, entityId } }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["eb", "seo-landing", entityType, entityId] });
      toast.success(
        res.created ? "Landing SEO creada como borrador." : "Esta entidad ya tenía Landing SEO.",
      );
      void navigate({ to: "/cms/experience-builder", search: { page: res.id } });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message === "seo_landing_entity_not_found"
          ? "No se encontró la entidad de origen."
          : "No fue posible crear la Landing SEO.",
      ),
  });

  if (!allowed || !entityId) return null;

  const state = resolution.data?.state ?? "none";
  const existingId = resolution.data?.composition?.id ?? null;
  const label = resolution.data?.actionLabel ?? "Crear Landing SEO";

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Landing SEO premium
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "none"
              ? "Crea una landing editorial con la plantilla oficial. Nace como borrador no indexable y sólo usa datos reales de esta ficha."
              : state === "draft"
                ? "Esta ficha ya tiene una Landing SEO en borrador. No se crean duplicados."
                : "Esta ficha tiene una Landing SEO publicada. Adminístrala desde el Experience Builder."}
          </p>
        </div>
        <button
          type="button"
          disabled={resolution.isLoading || create.isPending}
          onClick={() => {
            if (existingId) {
              void navigate({ to: "/cms/experience-builder", search: { page: existingId } });
              return;
            }
            create.mutate();
          }}
          className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-focus disabled:opacity-60"
        >
          {create.isPending ? "Creando…" : label}
        </button>
      </div>
    </section>
  );
}
