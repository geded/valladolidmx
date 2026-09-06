/**
 * Preview interna (noindex) de la FICHA CANÓNICA de Experiencia.
 *
 * Autoridad de render: `ExperiencePremiumSurface` (la misma superficie que
 * usa la ruta canónica `/producto/{slug}` para la familia experiencia/tour).
 *
 * Lote 3E — fuente canónica única (`products`):
 *  · `?slug=`                → producto publicado (lectura pública real).
 *  · `?slug=&modo=revision`  → producto publicado o en revisión (DEMO
 *                              administrables) con sesión editorial y RLS.
 *  · sin `slug`              → estado vacío honesto con las experiencias
 *                              publicadas disponibles. Nunca fixtures locales.
 */
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PublicShell } from "@/components/discovery";
import { ExperiencePremiumSurface } from "@/components/experience-premium/ExperiencePremiumSurface";
import {
  buildExperienceVMFromProduct,
  type ExperiencePremiumVM,
} from "@/components/experience-premium/experience-premium-vm";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { getMarketplaceProductBySlug } from "@/lib/catalog/marketplace-reads.functions";
import {
  getExperienceReviewDetail,
  getExperiencesListing,
} from "@/lib/experiences/experience-public-reads.functions";

type Modo = "publicado" | "revision";

const PUBLIC_NOTICE = "Superficie de revisión interna · datos reales publicados · no indexable.";
const REVIEW_NOTICE =
  "Superficie de revisión interna · registro en revisión (DEMO administrable) · no indexable.";

export const Route = createFileRoute("/lovable/g4-experience-premium-preview")({
  validateSearch: (search: Record<string, unknown>): { slug?: string; modo?: Modo } => ({
    ...(typeof search.slug === "string" && search.slug ? { slug: search.slug } : {}),
    ...(search.modo === "revision" ? { modo: "revision" as const } : {}),
  }),
  loaderDeps: ({ search }) => ({
    slug: search.slug ?? null,
    modo: (search.modo ?? "publicado") as Modo,
  }),
  head: () => ({
    meta: [
      { title: "Experiencia · Revisión visual de la ficha canónica" },
      {
        name: "description",
        content: "Vista previa interna de la ficha premium de Experiencia. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  loader: async ({ deps }) => {
    if (deps.modo === "revision") {
      return { modo: deps.modo, slug: deps.slug, vm: null, available: [] as AvailableItem[] };
    }
    if (deps.slug) {
      const product = await getMarketplaceProductBySlug({ data: { slug: deps.slug } }).catch(
        () => null,
      );
      if (product) {
        return {
          modo: deps.modo,
          slug: deps.slug,
          vm: { ...buildExperienceVMFromProduct(product), demoNotice: PUBLIC_NOTICE },
          available: [] as AvailableItem[],
        };
      }
    }
    const listing = await getExperiencesListing({ data: {} }).catch(() => null);
    const available: AvailableItem[] = (listing?.dto.items ?? [])
      .filter((item) => typeof item.href === "string" && item.href.startsWith("/producto/"))
      .map((item) => ({
        slug: String(item.href).replace(/^\/producto\//, ""),
        name: item.name,
      }));
    return { modo: deps.modo, slug: deps.slug, vm: null, available };
  },
  component: ExperiencePremiumPreview,
});

interface AvailableItem {
  slug: string;
  name: string;
}

function crumbsFor(vm: ExperiencePremiumVM) {
  return [
    { label: "Inicio", to: "/" },
    { label: "Oriente Maya", to: "/oriente-maya" },
    ...(vm.destinationSlug
      ? [
          {
            label: vm.destinationLabel ?? vm.destinationSlug,
            to: `/oriente-maya/${vm.destinationSlug}`,
          },
        ]
      : []),
    { label: "Experiencias", to: "/experiencias" },
    { label: vm.name },
  ];
}

function ExperiencePremiumPreview() {
  const { modo, slug, vm, available } = Route.useLoaderData();

  if (modo === "revision") return <ReviewDetail slug={slug} />;

  if (!vm) {
    return (
      <PublicShell variant="default" compactCrumbsOnMobile>
        <section
          role="status"
          className="rounded-2xl border border-border p-6 text-sm text-muted-foreground"
        >
          <p className="font-medium text-foreground">
            {slug
              ? "Esa experiencia no está publicada o no existe."
              : "Elige una experiencia publicada para revisar su ficha."}
          </p>
          {available.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {available.map((item) => (
                <li key={item.slug}>
                  <Link
                    to="/lovable/g4-experience-premium-preview"
                    search={{ slug: item.slug }}
                    className="inline-flex min-h-11 items-center rounded-pill border border-border px-4"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2">Aún no hay experiencias publicadas.</p>
          )}
        </section>
      </PublicShell>
    );
  }

  return <ExperienceSurface vm={vm} />;
}

function ExperienceSurface({ vm }: { vm: ExperiencePremiumVM }) {
  return (
    <PublicShell variant="default" crumbs={crumbsFor(vm)} compactCrumbsOnMobile>
      <ExperiencePremiumSurface
        vm={vm}
        aluxSlot={
          <TourismAluxPanel
            title="¿Esta experiencia encaja en tu viaje?"
            description="Alux la compara con tu contexto y la guarda en Mi Viaje."
            task={`Ayúdame a decidir si la experiencia "${vm.name}" encaja en mi viaje por el Oriente Maya de Yucatán.`}
            prompts={["Con niños", "Medio día", "Cerca del centro", "Naturaleza"]}
          />
        }
      />
    </PublicShell>
  );
}

function ReviewDetail({ slug }: { slug: string | null }) {
  const { session, loading } = useAuth();
  const fetchDetail = useServerFn(getExperienceReviewDetail);
  const query = useQuery({
    queryKey: ["experiences", "review-detail", slug, session?.user.id ?? null],
    queryFn: () => fetchDetail({ data: { slug: slug ?? "" } }),
    enabled: !loading && Boolean(session) && Boolean(slug),
    retry: false,
    staleTime: 30_000,
  });

  let body: React.ReactNode;
  if (!slug) {
    body = <Notice>Indica `?slug=` de la experiencia a revisar.</Notice>;
  } else if (!loading && !session) {
    body = <Notice>Inicia sesión con una cuenta editorial para revisar este registro.</Notice>;
  } else if (loading || query.isPending) {
    body = <Skeleton className="h-[60vh] rounded-2xl" aria-busy="true" />;
  } else if (query.isError) {
    const message = query.error instanceof Error ? query.error.message : "";
    body = (
      <Notice role="alert">
        {message.includes("forbidden")
          ? "Tu cuenta no tiene permisos editoriales para revisar este registro."
          : "No fue posible cargar el registro."}
      </Notice>
    );
  } else if (!query.data) {
    body = (
      <Notice>No existe una experiencia publicada o en revisión con ese identificador.</Notice>
    );
  } else {
    const vm = { ...buildExperienceVMFromProduct(query.data), demoNotice: REVIEW_NOTICE };
    return <ExperienceSurface vm={vm} />;
  }

  return (
    <PublicShell variant="default" compactCrumbsOnMobile>
      {body}
    </PublicShell>
  );
}

function Notice({
  children,
  role = "status",
}: {
  children: React.ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <p role={role} className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
      {children}
    </p>
  );
}
