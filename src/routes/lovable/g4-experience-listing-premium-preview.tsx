/**
 * Preview interna (noindex) del listado maestro de Experiencias.
 * Lee el MISMO contrato público real que `/experiencias`; sin fixtures.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { ExperiencesListingSurface } from "@/components/experience-premium/ExperiencesListingSurface";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";

type Estado = "regional" | "valladolid";

export const Route = createFileRoute("/lovable/g4-experience-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { estado?: Estado } =>
    search.estado === "valladolid" ? { estado: "valladolid" } : {},
  loaderDeps: ({ search }) => ({ estado: search.estado ?? "regional" }),
  head: () => ({
    meta: [
      { title: "Experiencias · Revisión visual del listado" },
      {
        name: "description",
        content: "Revisión responsive del listado premium de experiencias con lecturas reales.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => ({
    estado: deps.estado as Estado,
    dto: await getPublicListing({
      data: {
        family: "experiencias",
        destino: deps.estado === "valladolid" ? "valladolid" : null,
      },
    }),
  }),
  component: ExperienceListingPreview,
});

function ExperienceListingPreview() {
  const { dto, estado } = Route.useLoaderData();
  return (
    <PublicShell variant="default" compactCrumbsOnMobile>
      <div className="mb-4 flex w-full gap-2">
        {(["regional", "valladolid"] as const).map((option) => (
          <Link
            key={option}
            to="/lovable/g4-experience-listing-premium-preview"
            search={option === "valladolid" ? { estado: "valladolid" } : {}}
            className={`min-h-11 rounded-pill border px-4 text-sm leading-[2.75rem] ${
              estado === option ? "border-primary bg-primary/10" : "border-border bg-background"
            }`}
          >
            {option === "regional" ? "Oriente Maya" : "Valladolid"}
          </Link>
        ))}
      </div>
      <ExperiencesListingSurface
        dto={dto}
        reviewNotice="Superficie de revisión interna · lecturas reales, no indexable."
      />
    </PublicShell>
  );
}
