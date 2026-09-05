/**
 * Preview interna del listado de eventos (noindex). Lee datos reales por
 * el mismo contrato público que `/eventos`, con dos estados de revisión:
 * `regional` (todo el Oriente Maya) y `valladolid` (contexto bloqueado).
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/discovery";
import { ListingPremiumSurfaceFromDTO } from "@/components/listing-premium/ListingPremiumSurface";
import { getPublicListing } from "@/lib/listings/listing-public-reads.functions";

type Estado = "regional" | "valladolid";

export const Route = createFileRoute("/lovable/g4-event-listing-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { estado?: Estado } =>
    search.estado === "valladolid" ? { estado: "valladolid" } : {},
  loaderDeps: ({ search }) => ({ estado: search.estado ?? "regional" }),
  head: () => ({
    meta: [
      { title: "Eventos · Revisión visual" },
      {
        name: "description",
        content: "Revisión responsive del listado territorial de eventos con datos reales.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => {
    const destino = deps.estado === "valladolid" ? "valladolid" : null;
    const [dto, regional] = await Promise.all([
      getPublicListing({ data: { family: "eventos", destino } }),
      destino
        ? getPublicListing({ data: { family: "eventos", destino: null } })
        : Promise.resolve(null),
    ]);
    const nearby = regional
      ? regional.items.filter((item) => !dto.items.some((local) => local.id === item.id))
      : [];
    return { dto, nearby, estado: deps.estado as Estado };
  },
  component: EventListingPremiumPreview,
});

function EventListingPremiumPreview() {
  const { dto, nearby, estado } = Route.useLoaderData();
  return (
    <PublicShell variant="default">
      <div className="mx-auto flex w-full max-w-[86rem] gap-2 px-4 pt-4 sm:px-6 lg:px-8">
        {(["regional", "valladolid"] as const).map((option) => (
          <Link
            key={option}
            to="/lovable/g4-event-listing-premium-preview"
            search={option === "valladolid" ? { estado: "valladolid" } : {}}
            className={`min-h-9 rounded-full border px-4 text-xs font-semibold leading-9 ${
              estado === option
                ? "border-[#0d4b38] bg-[#0d4b38] text-white"
                : "border-[#ded7c9] text-[#0d4b38]"
            }`}
          >
            {option === "regional" ? "Regional" : "Valladolid"}
          </Link>
        ))}
      </div>
      <ListingPremiumSurfaceFromDTO
        dto={dto}
        nearbyItems={nearby}
        lockedDestinationLabel={
          estado === "valladolid" ? (dto.destinationLabel ?? "Valladolid") : null
        }
      />
    </PublicShell>
  );
}
