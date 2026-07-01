/**
 * VisualStudio — Modo Visual (WYSIWYG) del Experience Builder único.
 *
 * 15.10.4d · Unificación (post-US-01):
 *  - Un único Studio en /cms/experience-builder con dos modos.
 *  - Modo Visual (este componente) es el predeterminado para empresarios.
 *  - No expone JSON, IDs, slugs, composition, block, schema.
 *  - Reutiliza infra existente: page_compositions, CompositionRenderer,
 *    Discovery PublicHeader/PublicFooter. Cero infraestructura nueva.
 *
 * Superficies editables en esta entrega:
 *  - Home → Hero (título, subtítulo, eyebrow, CTAs). Otras secciones
 *    quedan marcadas "Próximamente" (habilitación en US-04).
 *  - Resto de páginas del sitio → placeholder "Próximamente" con
 *    enlace para verlas en el sitio (habilitación progresiva).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Loader2, Lock, Pencil, X } from "lucide-react";

import {
  listCompositions,
  getComposition,
  createComposition,
  saveCompositionDraft,
  publishComposition,
  type CompositionDetail,
} from "@/lib/experience-builder/studio.functions";
import {
  updateNodeConfig,
  type CompositionNode,
  type CompositionTree,
} from "@/lib/experience-builder/composition-tree";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { PublicHeader, PublicFooter } from "@/components/discovery";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n/context";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SitePage {
  key: string;
  title: string;
  description: string;
  publicPath: string;
  status: "editable" | "soon";
  soonLabel?: string;
}

const SITE_PAGES: SitePage[] = [
  {
    key: "home",
    title: "Inicio",
    description: "Página principal que ve todo visitante al llegar a Valladolid.mx.",
    publicPath: "/",
    status: "editable",
  },
  { key: "experiencias", title: "Experiencias", description: "Catálogo de experiencias turísticas.", publicPath: "/experiencias", status: "soon", soonLabel: "US-04" },
  { key: "hoteles", title: "Hoteles", description: "Hospedaje disponible en el destino.", publicPath: "/hoteles", status: "soon", soonLabel: "US-04" },
  { key: "restaurantes", title: "Restaurantes", description: "Gastronomía local y recomendada.", publicPath: "/restaurantes", status: "soon", soonLabel: "US-04" },
  { key: "eventos", title: "Eventos", description: "Agenda de eventos y actividades.", publicPath: "/eventos", status: "soon", soonLabel: "US-04" },
  { key: "empresas", title: "Empresas", description: "Directorio de empresas locales.", publicPath: "/empresas", status: "soon", soonLabel: "US-04" },
  { key: "marketplace", title: "Marketplace", description: "Tienda y reservaciones.", publicPath: "/marketplace", status: "soon", soonLabel: "US-05" },
  { key: "arma-tu-viaje", title: "Arma tu viaje", description: "Planificador interactivo del viaje.", publicPath: "/arma-tu-viaje", status: "soon", soonLabel: "US-05" },
  { key: "alux", title: "Alux (IA)", description: "Superficie de conversación con Alux.", publicPath: "/alux", status: "soon", soonLabel: "US-05" },
  { key: "oriente-maya", title: "Oriente Maya", description: "Portal territorial del Oriente Maya.", publicPath: "/oriente-maya", status: "soon", soonLabel: "US-05" },
];

export function VisualStudio() {
  const [openKey, setOpenKey] = useState<string | null>(null);
  if (openKey === "home") {
    return <HomeVisualEditor onExit={() => setOpenKey(null)} />;
  }
  return <PagesPicker onOpen={(k) => setOpenKey(k)} />;
}

/* --------------------------------------------------------------------- */

function PagesPicker({ onOpen }: { onOpen: (key: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <header className="max-w-2xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
          Elige una página
        </p>
        <h2 className="mt-2 text-2xl font-semibold">¿Qué página quieres editar?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona cualquier página del sitio para verla y modificarla tal como
          la ven los visitantes. En esta entrega la <strong>página de Inicio</strong> ya
          es editable. El resto se irá habilitando en las próximas historias del sprint.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_PAGES.map((p) => {
          const editable = p.status === "editable";
          const cardBase =
            "flex h-full flex-col justify-between rounded-2xl border p-5 text-left transition-colors";
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
                <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {p.publicPath}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {editable ? (
                  <span className="text-xs font-semibold text-primary">Abrir editor →</span>
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
          if (editable) {
            return (
              <button key={p.key} type="button" onClick={() => onOpen(p.key)} className={cardCls}>
                {inner}
              </button>
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
  );
}

/* --------------------------------------------------------------------- */

function HomeVisualEditor({ onExit }: { onExit: () => void }) {
  const list = useServerFn(listCompositions);
  const get = useServerFn(getComposition);
  const create = useServerFn(createComposition);
  const save = useServerFn(saveCompositionDraft);
  const publish = useServerFn(publishComposition);
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const canPublish = roles.includes("admin") || roles.includes("super_admin");

  const [page, setPage] = useState<CompositionDetail | null>(null);
  const [tree, setTree] = useState<CompositionTree | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await list();
        const home = all.find((c) => c.page_type === "home") ?? null;
        let detail: CompositionDetail | null = null;
        if (home) {
          detail = await get({ data: { id: home.id } });
        } else {
          const { id } = await create({
            data: { slug: "home", title: "Página de Inicio", page_type: "home" },
          });
          detail = await get({ data: { id } });
        }
        if (cancelled || !detail) return;
        setPage(detail);
        setTree(detail.current_draft);
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [list, get, create]);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!page || !tree) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = window.setTimeout(() => {
      void save({ data: { id: page.id, tree } })
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 900);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  const heroNode: CompositionNode | null = useMemo(() => {
    if (!tree) return null;
    return tree.root.children.find((n) => n.type === "vmx.hero") ?? null;
  }, [tree]);

  const selectedNode = useMemo(
    () => (tree && selectedId ? tree.root.children.find((n) => n.id === selectedId) ?? null : null),
    [tree, selectedId],
  );

  const onPublish = async () => {
    if (!page || !tree) return;
    setPublishing(true);
    setMessage(null);
    try {
      await save({ data: { id: page.id, tree } });
      await publish({ data: { id: page.id, notes: "Publicado desde Modo Visual" } });
      await queryClient.invalidateQueries({ queryKey: ["eb", "published-home", "default"] });
      setMessage("Cambios publicados en el sitio.");
    } catch (e) {
      setMessage(`No se pudo publicar: ${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  const updateHeroField = (field: keyof HeroFieldMap, value: string) => {
    if (!heroNode || !tree) return;
    const next = updateNodeConfig(tree, heroNode.id, { ...heroNode.config, [field]: value });
    setTree(next);
  };

  if (loadError) return <FullScreenState title="No se pudo abrir el editor" detail={loadError} onExit={onExit} />;
  if (!page || !tree) return <FullScreenState title="Preparando el editor…" detail="Cargando tu página de Inicio." spinner onExit={onExit} />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Volver al listado de páginas"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Páginas
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Editando
          </p>
          <h1 className="truncate text-sm font-semibold">Página de Inicio</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SaveIndicator status={saveStatus} />
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Ver en el sitio
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          {canPublish ? (
            <button
              type="button"
              onClick={() => void onPublish()}
              disabled={publishing}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {publishing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Publicando…
                </>
              ) : (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Publicar cambios
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Sólo administradores pueden publicar.
            </span>
          )}
        </div>
      </div>

      {message ? (
        <div className="border-b border-border bg-primary/5 px-4 py-2 text-center text-xs text-foreground">
          {message}
        </div>
      ) : null}

      <div className="relative flex-1">
        <div className="min-h-screen">
          <PublicHeader variant="overlay" />
          <main id="main" className="pb-24">
            <CompositionRenderer
              tree={tree}
              pageType="home"
              wrap={(node, content) => {
                if (node.type !== "vmx.hero") return content;
                const isSelected = selectedId === node.id;
                return (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(node.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(node.id);
                      }
                    }}
                    className={`group relative cursor-pointer outline-none ring-inset transition-shadow ${
                      isSelected ? "ring-4 ring-primary" : "hover:ring-4 hover:ring-primary/40"
                    }`}
                    aria-label="Editar Hero"
                  >
                    <span
                      className={`pointer-events-none absolute left-4 top-4 z-30 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-lg transition-opacity ${
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      {isSelected ? "Editando: Hero" : "Editar Hero"}
                    </span>
                    {content}
                  </div>
                );
              }}
            />
          </main>
          <PublicFooter />
        </div>

        {selectedNode && selectedNode.type === "vmx.hero" ? (
          <HeroPanel
            node={selectedNode}
            onChange={updateHeroField}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */

interface HeroFieldMap {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_href: string;
  cta_secondary_label: string;
  cta_secondary_href: string;
}

function HeroPanel({
  node,
  onChange,
  onClose,
}: {
  node: CompositionNode;
  onChange: (field: keyof HeroFieldMap, value: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cfg = node.config as Record<string, unknown>;
  const defaults: Record<string, string> = {
    eyebrow: t("hero.eyebrow"),
    title: t("hero.title"),
    subtitle: t("hero.subtitle"),
    cta_label: t("hero.cta_primary"),
    cta_secondary_label: t("hero.cta_secondary"),
    cta_href: "/oriente-maya",
    cta_secondary_href: "/arma-tu-viaje",
  };
  const val = (k: string) => {
    const v = cfg[k];
    if (typeof v === "string" && v.length > 0) return v;
    return defaults[k] ?? "";
  };

  return (
    <aside
      className="fixed right-0 top-[52px] z-50 flex h-[calc(100vh-52px)] w-[360px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-border bg-card p-5 shadow-xl"
      aria-label="Herramientas para editar el Hero"
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Sección seleccionada
          </p>
          <h2 className="text-lg font-semibold">Hero</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Cambia el texto y verás cómo queda al instante. Al terminar, pulsa{" "}
            <span className="font-semibold">Publicar cambios</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Cerrar herramientas"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <Field label="Frase superior" hint="Aparece en cursiva sobre el título.">
        <input type="text" value={val("eyebrow")} onChange={(e) => onChange("eyebrow", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Experiencias que emocionan" />
      </Field>

      <Field label="Título principal" hint="El mensaje más grande de la página.">
        <textarea value={val("title")} onChange={(e) => onChange("title", e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Descubre Valladolid…" />
      </Field>

      <Field label="Subtítulo" hint="Frase breve debajo del título.">
        <textarea value={val("subtitle")} onChange={(e) => onChange("subtitle", e.target.value)}
          className="min-h-[70px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Cenotes, ciudades vivas…" />
      </Field>

      <Field label="Botón principal — texto">
        <input type="text" value={val("cta_label")} onChange={(e) => onChange("cta_label", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Explorar destinos" />
      </Field>
      <Field label="Botón principal — enlace" hint="Ruta a la que lleva el botón principal.">
        <input type="text" value={val("cta_href")} onChange={(e) => onChange("cta_href", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="/oriente-maya" />
      </Field>

      <Field label="Botón secundario — texto">
        <input type="text" value={val("cta_secondary_label")} onChange={(e) => onChange("cta_secondary_label", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Arma tu viaje" />
      </Field>
      <Field label="Botón secundario — enlace" hint="Ruta a la que lleva el botón secundario.">
        <input type="text" value={val("cta_secondary_href")} onChange={(e) => onChange("cta_secondary_href", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="/arma-tu-viaje" />
      </Field>
    </aside>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-foreground">{label}</label>
      {children}
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Guardando…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
        <Check className="size-3" aria-hidden /> Guardado
      </span>
    );
  }
  if (status === "error") {
    return <span className="text-[11px] text-destructive">No se pudo guardar.</span>;
  }
  return null;
}

function FullScreenState({
  title,
  detail,
  spinner,
  onExit,
}: {
  title: string;
  detail?: string;
  spinner?: boolean;
  onExit: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {spinner ? (
        <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      <h1 className="text-lg font-semibold">{title}</h1>
      {detail ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{detail}</p> : null}
      <button
        type="button"
        onClick={onExit}
        className="mt-6 inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Volver al listado
      </button>
    </div>
  );
}