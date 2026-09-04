/**
 * Preview interna (noindex) del listado maestro de Experiencias.
 *
 * Dos modos, ambos por el MISMO contrato público:
 *  · `real`  → lecturas CMS publicadas (`getPublicListing`).
 *  · `demo`  → dataset DEMO tipado (`experience-demo-dataset`), usado para
 *              la revisión "ninguna plantilla vacía". No escribe en la base.
 *
 * La superficie pública `/experiencias` NUNCA usa el dataset DEMO.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { ExperiencesListingSurface } from "@/components/experience-premium/ExperiencesListingSurface";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";
import {
  EXPERIENCE_DEMO_ATTRIBUTE_AXES,
  EXPERIENCE_DEMO_NOTICE,
  EXPERIENCE_DEMO_VALUE_LABELS,
  buildExperienceDemoListingDTO,
} from "@/lib/experiences/experience-demo-dataset";

type Modo = "demo" | "real";

export const Route = createFileRoute("/lovable/g4-experience-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { modo?: Modo; destino?: string } => ({
    ...(search.modo === "real" ? { modo: "real" as const } : {}),
    ...(typeof search.destino === "string" && search.destino
      ? { destino: search.destino }
      : {}),
  }),
  loaderDeps: ({ search }) => ({
    modo: (search.modo ?? "demo") as Modo,
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
    if (deps.modo === "real") {
      return {
        modo: deps.modo,
        destino: deps.destino,
        dto: await getPublicListing({
          data: { family: "experiencias", destino: deps.destino },
        }),
      };
    }
    return {
      modo: deps.modo,
      destino: deps.destino,
      dto: buildExperienceDemoListingDTO(deps.destino),
    };
  },
  component: ExperienceListingPreview,
});

const MODOS: readonly { id: Modo; label: string }[] = [
  { id: "demo", label: "Contenido de demostración" },
  { id: "real", label: "Datos reales publicados" },
];

function ExperienceListingPreview() {
  const { dto, modo } = Route.useLoaderData();
  const isDemo = modo === "demo";
  return (
    <PublicShell variant="default" compactCrumbsOnMobile>
      <div className="mb-4 flex w-full flex-wrap gap-2">
        {MODOS.map((option) => (
          <Link
            key={option.id}
            to="/lovable/g4-experience-listing-premium-preview"
            search={option.id === "real" ? { modo: "real" as const } : {}}
            className={`min-h-11 rounded-pill border px-4 text-sm leading-[2.75rem] ${
              modo === option.id ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <ExperiencesListingSurface
        dto={dto}
        reviewNotice={
          isDemo
            ? EXPERIENCE_DEMO_NOTICE
            : "Superficie de revisión interna · lecturas CMS reales, no indexable."
        }
        attributeAxes={isDemo ? EXPERIENCE_DEMO_ATTRIBUTE_AXES : []}
        attributeValueLabels={isDemo ? EXPERIENCE_DEMO_VALUE_LABELS : {}}
      />
    </PublicShell>
  );
}
