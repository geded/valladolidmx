/**
 * G8-R1-F1C-0 · Hub de acceso visual a las seis familias premium pendientes.
 *
 * ÍNDICE DE ENLACES únicamente: no renderiza superficies, no duplica
 * bloques ni presets, no toca datos productivos. Cada familia se abre en
 * su preview interno ya entregado.
 *
 * Vista INTERNA, noindex.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";

export const Route = createFileRoute("/lovable/g8-r1f1c-preview-hub")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Hub de previews premium (interno)" },
      {
        name: "description",
        content:
          "Índice interno de acceso a los previews noindex de las seis familias premium pendientes de aprobación visual.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: PreviewHub,
});

type Family = {
  key: string;
  family: string;
  preset: string;
  href: string;
  data: string;
  modes: string;
  visible: string[];
  omitted: string[];
};

const FAMILIES: Family[] = [
  {
    key: "A",
    family: "Casa de vacaciones",
    preset:
      "premium-entity-vacation-rental · vacation-rental-surface.adapter (JSON-LD VacationRental)",
    href: "/lovable/g8p2-vacation-rental-premium-preview",
    data: "Fixture neutral interno (demo interna), sin contenido publicable",
    modes: "Editorial (por defecto) · Cinematográfica disponible con portada aprobada",
    visible: [
      "Hero premium + breadcrumb territorial",
      "Propiedad completa, capacidad, dormitorios, camas, baños",
      "Amenidades, cocina, reglas, estancia mínima, check-in/out",
      "Ubicación aproximada (privacidad) + anfitrión",
      "Guardar en Mi Viaje · Alux (dock único)",
      "Reclamación discreta al pie",
    ],
    omitted: [
      "Disponibilidad y calendario (sólo con integración acreditada)",
      "Precio por noche sin acreditar",
      "Fotografía (marcador neutral)",
    ],
  },
  {
    key: "B",
    family: "Empresa turística genérica",
    preset: "Sin preset propio — BusinessSurface + adaptador genérico por categoría (pendiente)",
    href: "/lovable/g8-r1f1c-business-generic-preview",
    data: "Fixture neutral interno (demo interna)",
    modes: "Editorial (por defecto) · Cinematográfica fail-closed sin portada",
    visible: [
      "Hero + breadcrumb territorial",
      "Territorio, categoría, tipo de atención",
      "Contacto y estado de ficha",
      "Bloques adaptativos por categoría",
      "Alux · Guardar como acción secundaria",
      "Reclamación discreta al pie",
    ],
    omitted: ["Horarios no acreditados", "Reseñas y precio", "Fotografía (marcador neutral)"],
  },
  {
    key: "C",
    family: "Producto genérico",
    preset: "Sin preset propio — ProductSurface + adaptador genérico (pendiente)",
    href: "/lovable/g8-r1f1c-product-generic-preview",
    data: "Fixture neutral interno (demo interna)",
    modes: "Editorial (por defecto) · Cinematográfica fail-closed sin portada",
    visible: [
      "Hero + breadcrumb territorial",
      "Proveedor y categoría",
      "Modo de conversión único (comprar / contactar / reservar)",
      "Guardar en Mi Viaje · Alux",
    ],
    omitted: [
      "Precio y stock no acreditados (nunca inventados)",
      "offers en JSON-LD",
      "Fotografía (marcador neutral)",
    ],
  },
  {
    key: "D",
    family: "Zona territorial de destino",
    preset: "Sin preset ni ruta pública — requiere modelo/CMS (JSON-LD TouristDestination)",
    href: "/lovable/g8-r1f1c-zone-preview",
    data: "Fixture neutral interno (demo interna)",
    modes: "Editorial (por defecto) · Cinematográfica fail-closed sin portada",
    visible: [
      "Breadcrumb Inicio → Oriente Maya → Destino → Zona",
      "Narrativa territorial y mapa del polígono",
      "Colecciones: lugares, empresas, productos, eventos, rutas",
      "Alux · Explorar destinos del Oriente Maya",
    ],
    omitted: ["Colecciones vacías", "Mapa con medio gobernado", "Reclamación (no aplica)"],
  },
  {
    key: "E",
    family: "Ruta / itinerario",
    preset: "Sin preset ni CMS — requiere modelo de etapas (JSON-LD TouristTrip + ItemList)",
    href: "/lovable/g8-r1f1c-route-preview",
    data: "Fixture neutral interno (demo interna)",
    modes: "Editorial (por defecto) · Cinematográfica fail-closed sin portada",
    visible: [
      "Territorio, duración y etapas ordenadas",
      "Mapa, recomendaciones prácticas y accesibilidad",
      "Origen editorial",
      "Agregar ruta a Mi Viaje · Alux",
    ],
    omitted: ["Reservas y precios (nunca inventados)", "Fotografía (marcador neutral)"],
  },
  {
    key: "F",
    family: "Artículo / guía editorial",
    preset: "Sin preset ni /blog/$slug — requiere modelo/CMS editorial (JSON-LD Article)",
    href: "/lovable/g8-r1f1c-article-preview",
    data: "Fixture neutral interno (demo interna)",
    modes: "Editorial (por defecto) · Cinematográfica fail-closed sin portada",
    visible: [
      "Autor, fecha, standfirst y cuerpo",
      "Fuentes y contenidos relacionados",
      "CTA turísticos secundarios",
      "Mi Viaje · Alux",
    ],
    omitted: ["Imagen editorial gobernada", "Comentarios y publicidad", "Reclamación (no aplica)"],
  },
];

function PreviewHub() {
  return (
    <main className="min-h-svh bg-background pb-20">
      <div className="border-b border-border bg-muted/50 px-4 py-2 text-center text-xs text-muted-foreground">
        Vista interna G8-R1-F1C-0 · índice de enlaces · noindex · sin datos publicables · flag
        productivo en false.
      </div>

      <Container className="py-8">
        <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
          Cierre visual · seis familias premium
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Acceso directo a los previews internos. Cada familia se aprueba por separado. La Casa de
          vacaciones se incluye para compararla con Hotel y confirmar que no es un hotel renombrado.
        </p>

        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {FAMILIES.map((f) => (
            <li key={f.key} className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Familia {f.key}
              </p>
              <h2 className="mt-1 font-serif text-xl">{f.family}</h2>
              <dl className="mt-3 grid gap-2 text-xs">
                <div>
                  <dt className="uppercase tracking-[0.14em] text-muted-foreground">
                    Preset / familia
                  </dt>
                  <dd className="mt-0.5 font-mono break-words">{f.preset}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.14em] text-muted-foreground">Datos</dt>
                  <dd className="mt-0.5">{f.data}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.14em] text-muted-foreground">
                    Modos disponibles
                  </dt>
                  <dd className="mt-0.5">{f.modes}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-[0.14em] text-muted-foreground">URL interna</dt>
                  <dd className="mt-0.5 font-mono break-all">{f.href}</dd>
                </div>
              </dl>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold">Bloques visibles</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {f.visible.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold">Bloques omitidos</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {f.omitted.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <Link
                to={f.href}
                className="mt-4 inline-flex min-h-11 items-center rounded-pill bg-primary px-5 text-sm font-medium text-primary-foreground"
              >
                Abrir preview
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
