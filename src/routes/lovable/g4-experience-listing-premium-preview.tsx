/**
 * Preview interna (noindex) del listado maestro de Experiencias.
 *
 * Lote 3E — fuente canónica única (`products` · `product_type='experiencia'`):
 *  · `publicado` → la MISMA lectura pública de `/experiencias` (sólo
 *                  registros publicados de empresas publicadas).
 *  · `revision`  → registros publicados + en revisión (incluye los DEMO
 *                  administrables), leídos con la sesión de editor/admin y
 *                  RLS aplicada como esa persona. Sin sesión editorial no hay
 *                  datos: nunca se recurre a fixtures locales.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PublicShell } from "@/components/discovery";
import { ExperiencesListingSurface } from "@/components/experience-premium/ExperiencesListingSurface";
import {
  getExperiencesListing,
  getExperiencesReviewListing,
} from "@/lib/experiences/experience-public-reads.functions";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

type Modo = "publicado" | "revision";

const REVIEW_NOTICE =
  "Superficie de revisión interna · registros publicados y en revisión (DEMO marcados) · no indexable.";
const PUBLIC_NOTICE = "Superficie de revisión interna · lecturas CMS publicadas · no indexable.";

export const Route = createFileRoute("/lovable/g4-experience-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { modo?: Modo; destino?: string } => ({
    ...(search.modo === "revision" ? { modo: "revision" as const } : {}),
    ...(typeof search.destino === "string" && search.destino
      ? { destino: search.destino }
      : {}),
  }),
  loaderDeps: ({ search }) => ({
    modo: (search.modo ?? "publicado") as Modo,
    destino: search.destino ?? null,
  }),
  head: () => ({
    meta: [
      { title: "Experiencias · Revisión visual del listado" },
      {
        name: "description",
        content: "Revisión responsive del listado premium de experiencias. Superficie interna.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => {
    const published = await getExperiencesListing({ data: { destino: deps.destino } });
    return { modo: deps.modo, destino: deps.destino, published };
  },
  component: ExperienceListingPreview,
});

const MODOS: readonly { id: Modo; label: string }[] = [
  { id: "publicado", label: "Publicado (lectura pública)" },
  { id: "revision", label: "En revisión (sesión editorial)" },
];

function ExperienceListingPreview() {
  const { modo, destino, published } = Route.useLoaderData();
  return (
    <PublicShell variant="default" compactCrumbsOnMobile>
      <div className="mb-4 flex w-full flex-wrap gap-2">
        {MODOS.map((option) => (
          <Link
            key={option.id}
            to="/lovable/g4-experience-listing-premium-preview"
            search={{
              ...(option.id === "revision" ? { modo: "revision" as const } : {}),
              ...(destino ? { destino } : {}),
            }}
            className={`min-h-11 rounded-pill border px-4 text-sm leading-[2.75rem] ${
              modo === option.id ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
      {modo === "revision" ? (
        <ReviewListing destino={destino} />
      ) : (
        <ExperiencesListingSurface
          dto={published.dto}
          reviewNotice={PUBLIC_NOTICE}
          attributeAxes={published.axes}
          attributeValueLabels={published.valueLabels}
        />
      )}
    </PublicShell>
  );
}

function ReviewListing({ destino }: { destino: string | null }) {
  const { session, loading } = useAuth();
  const fetchReview = useServerFn(getExperiencesReviewListing);
  const query = useQuery({
    queryKey: ["experiences", "review-listing", destino, session?.user.id ?? null],
    queryFn: () => fetchReview({ data: { destino } }),
    enabled: !loading && Boolean(session),
    retry: false,
    staleTime: 30_000,
  });

  if (loading || query.isPending) {
    if (!loading && !session) {
      return (
        <p role="status" className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
          Inicia sesión con una cuenta editorial para revisar los registros en revisión.
        </p>
      );
    }
    return (
      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : "";
    return (
      <p role="alert" className="rounded-2xl border border-destructive/40 p-6 text-sm">
        {message.includes("forbidden")
          ? "Tu cuenta no tiene permisos editoriales para revisar estos registros."
          : "No fue posible cargar los registros en revisión."}
      </p>
    );
  }
  return (
    <ExperiencesListingSurface
      dto={query.data.dto}
      reviewNotice={REVIEW_NOTICE}
      attributeAxes={query.data.axes}
      attributeValueLabels={query.data.valueLabels}
    />
  );
}
