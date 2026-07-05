/**
 * /_authenticated/cms/ — Resumen del CMS Studio (Ola 1 · Etapa 1).
 *
 * Pantalla inicial del shell administrativo. Presenta el inventario de
 * entidades CMS que se irán habilitando en las siguientes etapas, sin
 * exponer datos ni mutaciones. Cumple VISUAL-GATES-CHECKLIST.
 */
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cms/")({
  head: () => ({
    meta: [
      { title: "CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content:
          "Panel administrativo del CMS Studio de Valladolid.mx.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CmsDashboard,
});

interface EntityCard {
  key: string;
  name: string;
  description: string;
  to: string;
}

const ENTITIES: EntityCard[] = [
  { key: "tourism_regions", name: "Regiones turísticas", description: "Regiones que agrupan destinos del territorio.", to: "/cms/regiones" },
  { key: "destinations", name: "Destinos", description: "Pueblos, ciudades y enclaves del Oriente Maya.", to: "/cms/destinos" },
  { key: "destination_zones", name: "Zonas de destino", description: "Sub-áreas y barrios dentro de cada destino.", to: "/cms/zonas" },
  { key: "business_categories", name: "Categorías", description: "Taxonomía oficial de empresas y productos.", to: "/cms/categorias" },
  { key: "businesses", name: "Empresas", description: "Fichas editoriales de empresas locales.", to: "/cms/empresas" },
  { key: "products", name: "Productos", description: "Experiencias, hoteles, restaurantes, eventos y más.", to: "/cms/productos" },
  { key: "media_assets", name: "Media", description: "Biblioteca multimedia compartida.", to: "/cms/media" },
  { key: "reviews", name: "Reseñas", description: "Moderación de reseñas y respuestas.", to: "/cms/reviews" },
];

function CmsDashboard() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          Administración editorial
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          CMS Studio
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Panel administrativo de Valladolid.mx. Gobierna el contenido editorial,
          la taxonomía y la moderación desde un único lugar.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/cms/experience-builder"
          search={{ mode: "visual", page: undefined, block: undefined }}
          className="group flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Editor de páginas
          </p>
          <h2 className="mt-1 text-lg font-semibold">Abrir Experience Builder</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Studio único (Modo Visual por defecto, Profesional opcional para
            administradores). Elige cualquier página y edítala como la ven
            los visitantes.
          </p>
          <span className="mt-2 text-xs font-semibold text-primary">
            Abrir Studio →
          </span>
        </Link>
        <Link
          to="/cms/experience-builder"
          search={{ mode: "visual", page: "home", block: undefined }}
          className="group flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-accent"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Acceso rápido
          </p>
          <h2 className="mt-1 text-lg font-semibold">Editar página de Inicio</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Abre el Studio en Modo Visual y selecciona la página de Inicio
            para editarla y publicarla en un clic.
          </p>
          <span className="mt-2 text-xs font-semibold text-foreground">
            Abrir Studio →
          </span>
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Entidades gobernadas
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTITIES.map((e) => (
            <Link
              key={e.key}
              to={e.to}
              className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
            >
              <h3 className="text-base font-semibold">{e.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {e.description}
              </p>
              <span className="mt-2 inline-block text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Abrir →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-xl border border-dashed border-border bg-card/40 p-5">
        <h2 className="text-sm font-semibold">Workflow editorial</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Todas las transiciones se ejecutarán mediante{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">
            transition_content_status
          </code>{" "}
          conforme a 13.4. Estados oficiales:
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {["draft", "in_review", "approved", "published", "archived"].map(
            (s, i, arr) => (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-border bg-background px-3 py-1 font-medium">
                  {s}
                </span>
                {i < arr.length - 1 && (
                  <span aria-hidden className="text-muted-foreground">
                    →
                  </span>
                )}
              </li>
            ),
          )}
        </ol>
      </section>
    </div>
  );
}