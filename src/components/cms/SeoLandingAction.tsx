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
import { Link as LinkIcon, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuth } from "@/hooks/useAuth";
import { LandingPerformanceCard } from "@/components/cms/LandingPerformanceCard";
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
        res.created
          ? "Página para Google creada como borrador."
          : "Esta ficha ya tenía su página para Google; la abrimos.",
      );
      void navigate({
        to: "/cms/experience-builder",
        search: { page: res.id, mode: undefined, block: undefined },
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error && error.message === "seo_landing_entity_not_found"
          ? "No encontramos esta ficha. Guarda primero y vuelve a intentarlo."
          : "No fue posible crear la página para Google.",
      ),
  });

  if (!allowed || !entityId) return null;

  const state = resolution.data?.state ?? "none";
  const existingId = resolution.data?.composition?.id ?? null;
  const existingSlug = resolution.data?.composition?.slug ?? null;
  /* Texto del botón en lenguaje de editor (la etiqueta técnica de
   * `resolution.actionLabel` se conserva para el Experience Builder). */
  const label =
    state === "none"
      ? "Crear página para Google"
      : state === "draft"
        ? "Revisar y publicar"
        : "Abrir y cambiar";
  const promoPath = existingSlug ? `/l/${existingSlug}` : null;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Página especial para Google y campañas
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {state === "none"
              ? "Es una página extra de esta ficha, pensada para aparecer en Google y para anuncios o redes. Se arma sola con los datos reales de la ficha y empieza como borrador: nadie la ve hasta que la publiques."
              : state === "draft"
                ? "Esta ficha ya tiene su página para Google en borrador (nunca se crean copias). Ábrela para revisarla y publicarla."
                : "Esta ficha ya tiene su página para Google publicada. Ábrela en el constructor para cambiar textos o fotos."}
          </p>
        </div>
        <button
          type="button"
          disabled={resolution.isLoading || create.isPending}
          onClick={() => {
            if (existingId) {
              void navigate({
                to: "/cms/experience-builder",
                search: { page: existingId, mode: undefined, block: undefined },
              });
              return;
            }
            create.mutate();
          }}
          className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-focus disabled:opacity-60"
        >
          {create.isPending ? "Creando…" : label}
        </button>
      </div>

      {promoPath ? (
        <div className="mt-3 rounded-xl border border-border bg-surface p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Enlace de promoción
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <a
              href={promoPath}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 break-all text-sm font-medium text-primary underline underline-offset-4 ring-focus"
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden />
              {promoPath}
            </a>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(`${window.location.origin}${promoPath}`)
                  .then(() => toast.success("Enlace copiado."))
                  .catch(() => toast.error("No fue posible copiar el enlace."));
              }}
              className="rounded-pill border border-border px-3 py-1 text-xs font-medium ring-focus"
            >
              Copiar
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {state === "published"
              ? "Publicada: ya aparece en Google y puedes usar este enlace en anuncios y redes."
              : "En borrador: el enlace funcionará cuando publiques la página."}
          </p>
          {state === "published" ? <LandingPerformanceCard landingPath={promoPath} /> : null}
        </div>
      ) : null}
    </section>
  );
}
