/**
 * G8-R1-F1D · Hub canario del Release Candidate visual.
 *
 * Modo de revisión interno para Founder / Admin / Editor. NO crea
 * renderers paralelos: todos los enlaces apuntan a las rutas, resolutores,
 * adaptadores y plantillas productivas con datos reales. Sólo añade un
 * índice navegable con el estado acreditado de cada entidad.
 *
 * Invariantes: noindex,nofollow · cero publicación · cero cambio de estado ·
 * flag `omxds_visual_v1_contracts_enabled` intacto.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Container } from "@/components/layout/Container";
import {
  listReleaseCandidateCatalog,
  type RcEntityRow,
} from "@/lib/omxds/presentation/rc-canary.functions";

export const Route = createFileRoute("/_authenticated/cms/rc-visual")({
  head: () => ({
    meta: [
      { title: "Release Candidate visual · revisión interna" },
      {
        name: "description",
        content:
          "Hub canario interno para recorrer Home, destinos, listados y las nueve familias premium con datos reales antes de la activación pública.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: RcVisualHub,
});

/* ------------------------------------------------------------------ *
 * Fase 1 · Mapa real de activación del flag
 * ------------------------------------------------------------------ */

type MatrixRow = {
  route: string;
  offComponent: string;
  onComponent: string;
  preset: string;
  cmsSource: string;
  content: string;
  media: string;
  seo: string;
  alux: string;
  trip: string;
  risk: string;
  rollback: string;
};

const ACTIVATION_MATRIX: MatrixRow[] = [
  {
    route: "/ (Home)",
    offComponent: "Home compuesta (page_compositions)",
    onComponent: "Idéntica — el flag no interviene en Home",
    preset: "home premium (composición)",
    cmsSource: "page_compositions",
    content: "Publicado",
    media: "Medios gobernados o marcador neutral",
    seo: "head() propio + canonical",
    alux: "Dock único",
    trip: "Guardar disponible",
    risk: "Bajo",
    rollback: "n/a (no depende del flag)",
  },
  {
    route: "/oriente-maya/$destino",
    offComponent: "DestinationSurface estándar",
    onComponent: "DestinationSurface con contratos visuales OMXDS v1",
    preset: "destination microsite",
    cmsSource: "destinations + composición",
    content: "Publicado",
    media: "Portada gobernada opcional",
    seo: "canonical territorial",
    alux: "Contexto territorial",
    trip: "Sí",
    risk: "Medio",
    rollback: "flag OFF",
  },
  {
    route: "/oriente-maya/$destino/$categoria/$empresa",
    offComponent: "BusinessSurface estándar",
    onComponent: "BusinessSurface + contratos visuales (hotel / restaurante / genérica)",
    preset: "premium-entity-business*",
    cmsSource: "businesses + provenance",
    content: "Draft / approved / published",
    media: "G8-M1 o marcador neutral",
    seo: "canonical + JSON-LD",
    alux: "Sí",
    trip: "Sí",
    risk: "Medio",
    rollback: "flag OFF",
  },
  {
    route: "/oriente-maya/$destino/$categoria/$empresa/$producto",
    offComponent: "ProductSurface estándar",
    onComponent: "ProductSurface + contratos visuales (experiencia / tour / genérico)",
    preset: "premium-entity-product*",
    cmsSource: "products",
    content: "Publicado / draft",
    media: "G8-M1 o marcador neutral",
    seo: "canonical + JSON-LD sin offers inventados",
    alux: "Sí",
    trip: "Sí",
    risk: "Medio",
    rollback: "flag OFF",
  },
  {
    route: "/eventos/$slug",
    offComponent: "EventSurface estándar",
    onComponent: "EventSurface + contratos visuales",
    preset: "premium-entity-event",
    cmsSource: "events",
    content: "Publicado",
    media: "G8-M1 o marcador neutral",
    seo: "canonical + Event JSON-LD",
    alux: "Sí",
    trip: "Sí",
    risk: "Bajo",
    rollback: "flag OFF",
  },
  {
    route: "/oriente-maya/$destino/lugares/$slug",
    offComponent: "PlaceSurface estándar",
    onComponent: "PlacePremiumSurface (Editorial / Cinematográfica)",
    preset: "premium-entity-place",
    cmsSource: "points_of_interest",
    content: "Publicado / draft",
    media: "G8-M1 o marcador neutral",
    seo: "canonical + TouristAttraction",
    alux: "Sí",
    trip: "Sí",
    risk: "Medio",
    rollback: "flag OFF",
  },
  {
    route: "Listados (/hoteles, /restaurantes, /experiencias, /eventos, /casas-de-vacaciones, /que-hacer)",
    offComponent: "TourismListingSurface estándar",
    onComponent: "Misma superficie con contratos de tarjeta OMXDS v1",
    preset: "listing premium G5",
    cmsSource: "lecturas públicas reales",
    content: "Sólo entidades publicadas",
    media: "Tarjetas con marcador neutral cuando falta portada",
    seo: "head() propio por listado",
    alux: "Dock único",
    trip: "Sí",
    risk: "Bajo",
    rollback: "flag OFF",
  },
  {
    route: "/l/$slug (Landing SEO)",
    offComponent: "Landing editorial estándar",
    onComponent: "Landing editorial forzada a Editorial (sin selector)",
    preset: "landing SEO",
    cmsSource: "editorial_routes",
    content: "Publicado",
    media: "Gobernado",
    seo: "canonical propio",
    alux: "No intrusivo",
    trip: "No",
    risk: "Bajo",
    rollback: "flag OFF",
  },
];

/** Verificado por código: rutas que hoy consultan realmente el flag. */
const FLAG_CONSUMERS = [
  "src/routes/oriente-maya/$destino.index.tsx",
  "src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx",
  "src/routes/producto.$slug.tsx",
  "src/routes/eventos.$slug.tsx",
];

/* ------------------------------------------------------------------ *
 * Recorridos fijos
 * ------------------------------------------------------------------ */

const CORE_SURFACES: { label: string; href: string; note: string }[] = [
  { label: "Home", href: "/", note: "Composición publicada" },
  { label: "Oriente Maya (región)", href: "/oriente-maya", note: "Índice territorial" },
  { label: "Destino · Valladolid", href: "/oriente-maya/valladolid", note: "Microsite de destino" },
  { label: "Hoteles", href: "/hoteles", note: "Listado premium" },
  { label: "Restaurantes", href: "/restaurantes", note: "Listado premium" },
  { label: "Experiencias", href: "/experiencias", note: "Listado premium" },
  { label: "Eventos", href: "/eventos", note: "Listado premium" },
  { label: "Casas de vacaciones", href: "/casas-de-vacaciones", note: "Listado premium" },
  { label: "Qué hacer", href: "/que-hacer", note: "Listado premium" },
];

const INTERNAL_PREVIEWS: { label: string; href: string }[] = [
  { label: "Zona territorial (DEMO VISUAL · NO PUBLICABLE)", href: "/lovable/g8-r1f1c-zone-preview" },
  { label: "Ruta / itinerario (DEMO VISUAL · NO PUBLICABLE)", href: "/lovable/g8-r1f1c-route-preview" },
  {
    label: "Artículo / guía editorial (DEMO VISUAL · NO PUBLICABLE)",
    href: "/lovable/g8-r1f1c-article-preview",
  },
  {
    label: "Casa de vacaciones (demo interna)",
    href: "/lovable/g8p2-vacation-rental-premium-preview",
  },
  { label: "Hub de familias F1C-0", href: "/lovable/g8-r1f1c-preview-hub" },
];

const FAMILY_LABEL: Record<string, string> = {
  hotel: "Hotel",
  restaurant: "Restaurante",
  vacation_rental: "Casa de vacaciones",
  business_generic: "Empresa turística genérica",
  event: "Evento",
  experience: "Experiencia",
  tour: "Tour",
  product_generic: "Producto genérico",
  place: "Lugar / atractivo",
};

const FAMILY_ORDER = [
  "hotel",
  "restaurant",
  "vacation_rental",
  "business_generic",
  "event",
  "experience",
  "tour",
  "product_generic",
  "place",
];

/* ------------------------------------------------------------------ *
 * UI
 * ------------------------------------------------------------------ */

function Chip({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "ok" | "warn" }) {
  const cls =
    tone === "ok"
      ? "bg-success/10 text-success"
      : tone === "warn"
        ? "bg-warning/10 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[11px] ${cls}`}>
      {children}
    </span>
  );
}

function EntityRow({ e }: { e: RcEntityRow }) {
  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-serif text-base">{e.label}</h3>
        <Chip tone={e.editorialState === "published" ? "ok" : "warn"}>{e.editorialState}</Chip>
        <Chip>{e.effectiveMode === "cinematic" ? "Cinematográfica" : "Editorial"}</Chip>
        <Chip tone={e.hasApprovedCover ? "ok" : "warn"}>
          {e.hasApprovedCover ? "Portada aprobada" : "Marcador neutral"}
        </Chip>
        <Chip>{`Revisión: ${e.reviewState}`}</Chip>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{e.familyReason}</p>
      {e.fallbackReason ? (
        <p className="mt-1 text-xs text-warning">Fallback Editorial: {e.fallbackReason}</p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] break-all text-muted-foreground">
        {e.canonicalPath ?? "sin ruta canónica — bloqueada técnicamente"}
      </p>
      {e.canonicalPath ? (
        <a
          href={e.canonicalPath}
          className="mt-3 inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          Abrir ficha real
        </a>
      ) : (
        <span className="mt-3 inline-flex min-h-11 items-center rounded-pill bg-muted px-5 text-sm text-muted-foreground">
          No navegable
        </span>
      )}
    </li>
  );
}

function RcVisualHub() {
  const fetchCatalog = useServerFn(listReleaseCandidateCatalog);
  const { data, isLoading, error } = useQuery({
    queryKey: ["rc-visual-catalog"],
    queryFn: () => fetchCatalog(),
  });

  const entities = data?.entities ?? [];
  const byFamily = new Map<string, RcEntityRow[]>();
  for (const e of entities) {
    const key = e.family ?? "sin_clasificar";
    const list = byFamily.get(key) ?? [];
    list.push(e);
    byFamily.set(key, list);
  }

  return (
    <div className="pb-20">
      <div className="rounded-2xl border border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
        Canary interno G8-R1-F1D · Founder / Admin / Editor · noindex,nofollow · cero publicación ·
        flag <code>omxds_visual_v1_contracts_enabled</code> sin modificar.
      </div>

      <Container className="px-0 py-8">
        <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
          Release Candidate visual · recorrido completo
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Todos los enlaces abren rutas, resolutores y plantillas productivas con datos reales. Las
          entidades en <em>draft</em> o <em>in review</em> son navegables sólo desde este canary
          autenticado y nunca se indexan. La ausencia de fotografía resuelve Editorial con marcador
          neutral y jamás bloquea la navegación.
        </p>

        <section className="mt-10">
          <h2 className="font-serif text-xl">Superficies base</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CORE_SURFACES.map((s) => (
              <li key={s.href} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
                <a
                  href={s.href}
                  className="mt-3 inline-flex min-h-11 items-center rounded-pill border border-border px-4 text-sm"
                >
                  Abrir
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Las nueve familias con entidades reales</h2>
          {isLoading ? <p className="mt-3 text-sm text-muted-foreground">Cargando catálogo…</p> : null}
          {error || data?.readError ? (
            <p className="mt-3 text-sm text-destructive">
              No fue posible leer el catálogo real. Nada se sustituye con fixtures.
            </p>
          ) : null}
          <div className="mt-4 space-y-8">
            {FAMILY_ORDER.map((fam) => {
              const rows = byFamily.get(fam) ?? [];
              return (
                <div key={fam}>
                  <h3 className="font-serif text-lg">
                    {FAMILY_LABEL[fam]}{" "}
                    <span className="text-sm text-muted-foreground">({rows.length})</span>
                  </h3>
                  {rows.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Sin entidades reales acreditadas todavía. Consulta el preview interno marcado
                      como demostración no publicable.
                    </p>
                  ) : (
                    <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                      {rows.slice(0, 12).map((e) => (
                        <EntityRow key={`${e.kind}:${e.id}`} e={e} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {(byFamily.get("sin_clasificar") ?? []).length > 0 ? (
              <div>
                <h3 className="font-serif text-lg">
                  Sin clasificación acreditada (estándar fail-closed){" "}
                  <span className="text-sm text-muted-foreground">
                    ({byFamily.get("sin_clasificar")?.length})
                  </span>
                </h3>
                <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                  {(byFamily.get("sin_clasificar") ?? []).slice(0, 12).map((e) => (
                    <EntityRow key={`${e.kind}:${e.id}`} e={e} />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Previews internos (no publicables)</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {INTERNAL_PREVIEWS.map((p) => (
              <li key={p.href} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm">{p.label}</p>
                <Link
                  to={p.href}
                  className="mt-3 inline-flex min-h-11 items-center rounded-pill border border-border px-4 text-sm"
                >
                  Abrir preview
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl">Mapa real de activación del flag</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Rutas que consultan hoy el flag por código:{" "}
            <span className="font-mono text-xs">{FLAG_CONSUMERS.join(" · ")}</span>. El resto de
            superficies no depende del flag.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead className="bg-muted/60">
                <tr>
                  {[
                    "Ruta",
                    "Flag OFF",
                    "Flag ON",
                    "Preset",
                    "Fuente CMS",
                    "Contenido",
                    "Medios",
                    "SEO",
                    "Alux",
                    "Mi Viaje",
                    "Riesgo",
                    "Rollback",
                  ].map((h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ACTIVATION_MATRIX.map((r) => (
                  <tr key={r.route} className="border-t border-border align-top">
                    <td className="px-3 py-2 font-mono">{r.route}</td>
                    <td className="px-3 py-2">{r.offComponent}</td>
                    <td className="px-3 py-2">{r.onComponent}</td>
                    <td className="px-3 py-2">{r.preset}</td>
                    <td className="px-3 py-2">{r.cmsSource}</td>
                    <td className="px-3 py-2">{r.content}</td>
                    <td className="px-3 py-2">{r.media}</td>
                    <td className="px-3 py-2">{r.seo}</td>
                    <td className="px-3 py-2">{r.alux}</td>
                    <td className="px-3 py-2">{r.trip}</td>
                    <td className="px-3 py-2">{r.risk}</td>
                    <td className="px-3 py-2">{r.rollback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </Container>
    </div>
  );
}
