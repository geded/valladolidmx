/**
 * /paginas — Selector visual de páginas públicas editables.
 *
 * 15.10.4d · Puente hacia US-17 (Navegación visual entre páginas).
 * Permite al usuario no técnico ver TODAS las páginas del sitio y
 * escoger cuál quiere editar. Sólo "Inicio" es WYSIWYG en Sprint 1;
 * el resto se marca como "Próximamente" para no romper expectativas.
 *
 * No crea infraestructura nueva: sólo lista rutas ya existentes.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Lock, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/paginas/")({
  head: () => ({
    meta: [
      { title: "Páginas del sitio · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginasIndex,
});

interface PageItem {
  key: string;
  title: string;
  description: string;
  publicPath: string;
  editorPath?: string; // undefined = aún no editable WYSIWYG
  status: "editable" | "soon";
  soonLabel?: string;
}

const PAGES: PageItem[] = [
  {
    key: "home",
    title: "Inicio",
    description: "Página principal que ve todo visitante al llegar a Valladolid.mx.",
    publicPath: "/",
    editorPath: "/paginas/inicio",
    status: "editable",
  },
  {
    key: "experiencias",
    title: "Experiencias",
    description: "Catálogo de experiencias turísticas.",
    publicPath: "/experiencias",
    status: "soon",
    soonLabel: "US-04",
  },
  {
    key: "hoteles",
    title: "Hoteles",
    description: "Hospedaje disponible en el destino.",
    publicPath: "/hoteles",
    status: "soon",
    soonLabel: "US-04",
  },
  {
    key: "restaurantes",
    title: "Restaurantes",
    description: "Gastronomía local y recomendada.",
    publicPath: "/restaurantes",
    status: "soon",
    soonLabel: "US-04",
  },
  {
    key: "eventos",
    title: "Eventos",
    description: "Agenda de eventos y actividades.",
    publicPath: "/eventos",
    status: "soon",
    soonLabel: "US-04",
  },
  {
    key: "empresas",
    title: "Empresas",
    description: "Directorio de empresas locales.",
    publicPath: "/empresas",
    status: "soon",
    soonLabel: "US-04",
  },
  {
    key: "marketplace",
    title: "Marketplace",
    description: "Tienda y reservaciones.",
    publicPath: "/marketplace",
    status: "soon",
    soonLabel: "US-05",
  },
  {
    key: "arma-tu-viaje",
    title: "Arma tu viaje",
    description: "Planificador interactivo del viaje.",
    publicPath: "/arma-tu-viaje",
    status: "soon",
    soonLabel: "US-05",
  },
  {
    key: "alux",
    title: "Alux (IA)",
    description: "Superficie de conversación con Alux.",
    publicPath: "/alux",
    status: "soon",
    soonLabel: "US-05",
  },
  {
    key: "oriente-maya",
    title: "Oriente Maya",
    description: "Portal territorial del Oriente Maya.",
    publicPath: "/oriente-maya",
    status: "soon",
    soonLabel: "US-05",
  },
];

function PaginasIndex() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => void navigate({ to: "/cms" })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Volver al CMS
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Editor
          </p>
          <h1 className="truncate text-sm font-semibold">Páginas del sitio</h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Elige una página
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            ¿Qué página quieres editar?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona cualquier página del sitio para verla y modificarla tal
            como la ven los visitantes. En este momento sólo la página de
            <strong> Inicio </strong> está lista para edición visual. El resto
            se irá habilitando en las próximas entregas.
          </p>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAGES.map((p) => {
            const editable = p.status === "editable" && p.editorPath;
            const cardBase =
              "flex h-full flex-col justify-between rounded-2xl border p-5 transition-colors";
            const cardCls = editable
              ? `${cardBase} border-primary/30 bg-primary/5 hover:bg-primary/10`
              : `${cardBase} border-border bg-card opacity-80`;
            const inner = (
              <>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold">{p.title}</h3>
                    {editable ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        <Pencil className="size-2.5" aria-hidden /> Editable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <Lock className="size-2.5" aria-hidden /> Próximamente
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.description}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {p.publicPath}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  {editable ? (
                    <span className="text-xs font-semibold text-primary">
                      Abrir editor →
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {p.soonLabel ? `Se habilita en ${p.soonLabel}` : "Se habilita pronto"}
                    </span>
                  )}
                  <a
                    href={p.publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-accent"
                    aria-label={`Ver ${p.title} en el sitio`}
                  >
                    Ver <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </>
            );
            if (editable && p.editorPath) {
              return (
                <Link key={p.key} to={p.editorPath} className={cardCls}>
                  {inner}
                </Link>
              );
            }
            return (
              <div key={p.key} className={cardCls} aria-disabled="true">
                {inner}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}