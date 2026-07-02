/**
 * VisualStudio — Modo Visual (WYSIWYG) del Experience Builder único.
 *
 * Corrección US-01 (15.10.4d): editor visual de página completa.
 *  - Renderiza TODA la Home dentro del canvas, no sólo el Hero.
 *  - Cualquier bloque es seleccionable, editable y reordenable (dnd-kit).
 *  - Inspector schema-driven vía AutoInspector (reusa infra existente).
 *  - Añadir / duplicar / eliminar secciones sin JSON.
 *  - Drawer de versiones con rollback (reutiliza listCompositionRevisions +
 *    restoreCompositionRevision existentes).
 *  - Vista previa = el propio canvas (paridad 1:1 con producción).
 *  - Header/Pie global: visibles y marcados como "compartidos por el sitio";
 *    edición completa se libera cuando exista store de site chrome —
 *    fuera del alcance de esta corrección para respetar "no nueva
 *    infraestructura".
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  listCompositions,
  getComposition,
  createComposition,
  saveCompositionDraft,
  publishComposition,
  listCompositionRevisions,
  restoreCompositionRevision,
  type CompositionDetail,
  type CompositionRevisionSummary,
} from "@/lib/experience-builder/studio.functions";
import {
  updateNodeConfig,
  newNodeId,
  type CompositionNode,
  type CompositionTree,
  type CompositionJsonObject,
} from "@/lib/experience-builder/composition-tree";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { getBlock, listBlocks } from "@/lib/experience-builder/block-registry";
import type { BlockContract } from "@/lib/experience-builder/block-contract";
import { AutoInspector } from "@/components/experience-builder/AutoInspector";
import { PublicFooter, PublicHeader } from "@/components/discovery";
import { useAuth } from "@/hooks/useAuth";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ChromeArea = "header" | "footer";

const HEADER_CHROME_ID = "__chrome_header";
const FOOTER_CHROME_ID = "__chrome_footer";

const DEFAULT_HEADER_CONFIG: CompositionJsonObject = {
  nav: [
    { label: "Destinos", href: "/oriente-maya" },
    { label: "Experiencias", href: "/experiencias" },
    { label: "Arma tu Viaje", href: "/arma-tu-viaje" },
    { label: "Alux", href: "/alux" },
    { label: "Empresas", href: "/empresas" },
  ],
  cta_label: "Arma tu Viaje",
  cta_href: "/arma-tu-viaje",
  show_language: true,
  show_user_menu: true,
};

const DEFAULT_FOOTER_CONFIG: CompositionJsonObject = {
  tagline: "Plataforma oficial del Oriente Maya de Yucatán.",
  explore_links: [
    { label: "Destinos", href: "/oriente-maya" },
    { label: "Experiencias", href: "/experiencias" },
    { label: "Hoteles", href: "/hoteles" },
    { label: "Restaurantes", href: "/restaurantes" },
    { label: "Eventos", href: "/eventos" },
  ],
  platform_links: [
    { label: "Arma tu Viaje", href: "/arma-tu-viaje" },
    { label: "Alux", href: "/alux" },
    { label: "Empresas", href: "/empresas" },
  ],
  legal_label: "Aviso legal",
  privacy_label: "Privacidad",
  show_language: true,
};

const headerChromeContract: BlockContract = {
  type: "vmx.chrome.header",
  category: "static",
  version: "1.0.0",
  display_name: "Encabezado",
  description: "Navegación superior pública del sitio.",
  schema: {
    nav: {
      type: "list",
      label: "Menú principal",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto", required: true },
          href: { type: "url", label: "Enlace", required: true },
        },
      },
    },
    cta_label: { type: "text", label: "Botón destacado — texto" },
    cta_href: { type: "url", label: "Botón destacado — enlace" },
    show_language: { type: "boolean", label: "Mostrar idiomas", default: true },
    show_user_menu: { type: "boolean", label: "Mostrar acceso de usuario", default: true },
  },
  capabilities: { soporta_preview: true, soporta_i18n: true },
};

const footerChromeContract: BlockContract = {
  type: "vmx.chrome.footer",
  category: "static",
  version: "1.0.0",
  display_name: "Pie de página",
  description: "Contenido inferior público del sitio.",
  schema: {
    tagline: { type: "text", label: "Descripción" },
    explore_links: {
      type: "list",
      label: "Columna Explorar",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto", required: true },
          href: { type: "url", label: "Enlace", required: true },
        },
      },
    },
    platform_links: {
      type: "list",
      label: "Columna Plataforma",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto", required: true },
          href: { type: "url", label: "Enlace", required: true },
        },
      },
    },
    legal_label: { type: "text", label: "Texto legal" },
    privacy_label: { type: "text", label: "Texto privacidad" },
    show_language: { type: "boolean", label: "Mostrar idiomas", default: true },
  },
  capabilities: { soporta_preview: true, soporta_i18n: true },
};

function getChromeConfig(tree: CompositionTree, area: ChromeArea): CompositionJsonObject {
  const defaults = area === "header" ? DEFAULT_HEADER_CONFIG : DEFAULT_FOOTER_CONFIG;
  return { ...defaults, ...(tree.chrome?.[area] ?? {}) };
}

interface SitePage {
  key: string;
  title: string;
  description: string;
  publicPath: string;
  status: "editable" | "soon";
  soonLabel?: string;
}

type HomeSummary = {
  id: string;
  slug: string;
  status: string;
  page_type: string;
};

function pickCanonicalHomeComposition<T extends HomeSummary>(items: T[]): T | null {
  return (
    items.find((item) => item.slug === "home" && item.page_type === "home") ??
    items.find((item) => item.slug === "home") ??
    items.find((item) => item.page_type === "home" && item.status === "published") ??
    items.find((item) => item.page_type === "home") ??
    null
  );
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

export interface VisualStudioProps {
  page?: string | null;
  onSelectPage?: (key: string | null) => void;
}

export function VisualStudio({ page = null, onSelectPage }: VisualStudioProps = {}) {
  const [internalKey, setInternalKey] = useState<string | null>(page);
  const openKey = page ?? internalKey;
  const setOpen = (k: string | null) => {
    setInternalKey(k);
    onSelectPage?.(k);
  };
  if (openKey === "home") {
    return <HomeVisualEditor onExit={() => setOpen(null)} />;
  }
  return <PagesPicker onOpen={(k) => setOpen(k)} />;
}

/* --------------------------------------------------------------------- */

function PagesPicker({ onOpen }: { onOpen: (key: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <header className="max-w-2xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Elige una página</p>
        <h2 className="mt-2 text-2xl font-semibold">¿Qué página quieres editar?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecciona cualquier página del sitio para verla y modificarla tal como la ven los visitantes.
          En esta entrega la <strong>página de Inicio</strong> ya es editable. El resto se irá habilitando en las próximas historias.
        </p>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SITE_PAGES.map((p) => {
          const editable = p.status === "editable";
          const openPage = () => editable && onOpen(p.key);
          const cardBase = "flex h-full flex-col justify-between rounded-2xl border p-5 text-left transition-colors";
          const cardCls = editable
            ? `${cardBase} cursor-pointer border-primary/30 bg-primary/5 hover:bg-primary/10`
            : `${cardBase} border-border bg-card opacity-80`;
          return (
            <div
              key={p.key}
              className={cardCls}
              aria-disabled={!editable}
              role={editable ? "button" : undefined}
              tabIndex={editable ? 0 : undefined}
              onClick={openPage}
              onKeyDown={(event) => {
                if (!editable) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openPage();
                }
              }}
            >
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
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{p.publicPath}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                {editable ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(p.key);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 active:opacity-90"
                  >
                    Abrir editor →
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {p.soonLabel ? `Se habilita en ${p.soonLabel}` : "Se habilita pronto"}
                  </span>
                )}
                <a
                  href={p.publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground hover:bg-accent"
                  aria-label={`Ver ${p.title} en el sitio`}
                >
                  Ver <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>
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
  const listRevs = useServerFn(listCompositionRevisions);
  const restore = useServerFn(restoreCompositionRevision);
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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<CompositionRevisionSummary[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await list();
        const home = pickCanonicalHomeComposition(all);
        let detail: CompositionDetail | null = null;
        if (home) {
          detail = await get({ data: { id: home.id } });
        } else {
          const { id } = await create({ data: { slug: "home", title: "Página de Inicio", page_type: "home" } });
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

  const selectedNode = useMemo(
    () => (tree && selectedId ? tree.root.children.find((n) => n.id === selectedId) ?? null : null),
    [tree, selectedId],
  );
  const selectedChrome = selectedId === HEADER_CHROME_ID ? "header" : selectedId === FOOTER_CHROME_ID ? "footer" : null;
  const selectedContract = useMemo(
    () => {
      if (selectedChrome === "header") return headerChromeContract;
      if (selectedChrome === "footer") return footerChromeContract;
      return selectedNode ? getBlock(selectedNode.type) ?? null : null;
    },
    [selectedChrome, selectedNode],
  );
  const selectedConfig = useMemo(
    () => {
      if (!tree) return null;
      if (selectedChrome) return getChromeConfig(tree, selectedChrome);
      return selectedNode?.config as Record<string, unknown> | null;
    },
    [selectedChrome, selectedNode, tree],
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
      if (showVersions) void refreshVersions();
    } catch (e) {
      setMessage(`No se pudo publicar: ${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  const updateSelectedConfig = (nextConfig: Record<string, unknown>) => {
    if (!tree) return;
    if (selectedChrome) {
      setTree({
        ...tree,
        chrome: {
          ...(tree.chrome ?? {}),
          [selectedChrome]: nextConfig as CompositionJsonObject,
        },
      });
      return;
    }
    if (!selectedNode) return;
    setTree(updateNodeConfig(tree, selectedNode.id, nextConfig));
  };

  const moveNode = (nodeId: string, dir: -1 | 1) => {
    if (!tree) return;
    const idx = tree.root.children.findIndex((n) => n.id === nodeId);
    if (idx < 0) return;
    const to = Math.max(0, Math.min(tree.root.children.length - 1, idx + dir));
    if (to === idx) return;
    const next = [...tree.root.children];
    const [item] = next.splice(idx, 1);
    next.splice(to, 0, item);
    setTree({ ...tree, root: { children: next } });
  };

  const duplicateNode = (nodeId: string) => {
    if (!tree) return;
    const src = tree.root.children.find((n) => n.id === nodeId);
    if (!src) return;
    const clone: CompositionNode = { ...src, id: newNodeId(), config: { ...src.config } };
    const idx = tree.root.children.findIndex((n) => n.id === nodeId);
    const next = [...tree.root.children];
    next.splice(idx + 1, 0, clone);
    setTree({ ...tree, root: { children: next } });
    setSelectedId(clone.id);
  };

  const removeNodeById = (nodeId: string) => {
    if (!tree) return;
    const next = tree.root.children.filter((n) => n.id !== nodeId);
    setTree({ ...tree, root: { children: next } });
    if (selectedId === nodeId) setSelectedId(null);
  };

  const insertBlock = (type: string, atIndex?: number) => {
    if (!tree) return;
    const contract = getBlock(type);
    if (!contract) return;
    const config: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(contract.schema)) {
      if (def.default !== undefined) config[k] = def.default;
    }
    const node: CompositionNode = { id: newNodeId(), type: contract.type, version: contract.version, config };
    const next = [...tree.root.children];
    const idx = atIndex ?? next.length;
    next.splice(idx, 0, node);
    setTree({ ...tree, root: { children: next } });
    setSelectedId(node.id);
    setShowLibrary(false);
  };

  const refreshVersions = async () => {
    if (!page) return;
    const revs = await listRevs({ data: { id: page.id } });
    setVersions(revs);
  };
  const openVersions = async () => {
    setShowVersions(true);
    await refreshVersions();
  };
  const doRollback = async (rev: CompositionRevisionSummary) => {
    if (!page) return;
    if (typeof window !== "undefined" && !window.confirm(`Restaurar la revisión #${rev.revision_number} como borrador actual?`)) return;
    await restore({ data: { id: page.id, revision_id: rev.id } });
    const detail = await get({ data: { id: page.id } });
    if (detail) {
      setPage(detail);
      setTree(detail.current_draft);
      setSelectedId(null);
      setMessage(`Revisión #${rev.revision_number} restaurada como borrador.`);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    if (!tree || !e.over || e.active.id === e.over.id) return;
    const oldIdx = tree.root.children.findIndex((n) => n.id === e.active.id);
    const newIdx = tree.root.children.findIndex((n) => n.id === e.over!.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(tree.root.children, oldIdx, newIdx);
    setTree({ ...tree, root: { children: next } });
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
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Editando</p>
          <h1 className="truncate text-sm font-semibold">Página de Inicio</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SaveIndicator status={saveStatus} />
          <button
            type="button"
            onClick={() => setPreviewMode((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent ${previewMode ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
          >
            {previewMode ? "Salir de vista previa" : "Vista previa"}
          </button>
          <button
            type="button"
            onClick={() => void openVersions()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <History className="size-3.5" aria-hidden />
            Versiones
          </button>
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
            <span className="text-[11px] text-muted-foreground">Sólo administradores pueden publicar.</span>
          )}
        </div>
      </div>

      {message ? (
        <div className="border-b border-border bg-primary/5 px-4 py-2 text-center text-xs text-foreground">
          {message}
        </div>
      ) : null}

      <div className="relative flex flex-1">
        {!previewMode ? (
          <aside className="hidden w-72 shrink-0 border-r border-border bg-card/40 md:flex md:flex-col" aria-label="Estructura de la página">
            <div className="border-b border-border p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Estructura</p>
              <h2 className="mt-1 text-sm font-semibold">Secciones de la Home</h2>
              <p className="mt-1 text-[10px] text-muted-foreground">Arrastra para reordenar. Clic para editar.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <ChromeItem
                label="Encabezado"
                note="Menú, enlaces y botón destacado"
                selected={selectedId === HEADER_CHROME_ID}
                onSelect={() => setSelectedId(HEADER_CHROME_ID)}
              />
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={tree.root.children.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                  {tree.root.children.map((n) => (
                    <SortableSectionItem key={n.id} node={n} selected={selectedId === n.id} onSelect={() => setSelectedId(n.id)} />
                  ))}
                </SortableContext>
              </DndContext>
              <ChromeItem
                label="Pie de página"
                note="Columnas, enlaces y textos legales"
                selected={selectedId === FOOTER_CHROME_ID}
                onSelect={() => setSelectedId(FOOTER_CHROME_ID)}
              />
              <button
                type="button"
                onClick={() => setShowLibrary(true)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="size-3.5" aria-hidden /> Añadir sección
              </button>
            </div>
          </aside>
        ) : null}

        <HomeCanvas
          tree={tree}
          previewMode={previewMode}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onSelectChrome={(area) => setSelectedId(area === "header" ? HEADER_CHROME_ID : FOOTER_CHROME_ID)}
          onDelete={removeNodeById}
          onDuplicate={duplicateNode}
          onMove={moveNode}
        />

        {!previewMode && selectedContract && selectedConfig ? (
          <aside
            className="fixed right-0 top-[52px] z-40 flex h-[calc(100vh-52px)] w-[360px] max-w-[92vw] flex-col gap-4 overflow-y-auto border-l border-border bg-card p-4 shadow-xl"
            aria-label="Herramientas para editar el bloque seleccionado"
          >
            <header className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Sección seleccionada</p>
                <h2 className="truncate text-base font-semibold">{selectedContract.display_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="size-4" aria-hidden />
              </button>
            </header>

            {selectedNode ? (
              <div className="flex flex-wrap gap-1.5">
                <ToolBtn onClick={() => moveNode(selectedNode.id, -1)} icon={<ChevronUp className="size-3" />} label="Subir" />
                <ToolBtn onClick={() => moveNode(selectedNode.id, 1)} icon={<ChevronDown className="size-3" />} label="Bajar" />
                <ToolBtn onClick={() => duplicateNode(selectedNode.id)} icon={<Copy className="size-3" />} label="Duplicar" />
                <ToolBtn onClick={() => removeNodeById(selectedNode.id)} icon={<Trash2 className="size-3" />} label="Eliminar" tone="danger" />
              </div>
            ) : null}

            <AutoInspector
              contract={selectedContract}
              config={selectedConfig}
              onChange={(next) => updateSelectedConfig(next)}
              simple
            />
          </aside>
        ) : null}

        {showLibrary ? (
          <BlockLibraryModal onClose={() => setShowLibrary(false)} onPick={(type) => insertBlock(type)} />
        ) : null}
        {showVersions ? (
          <VersionsDrawer versions={versions} onClose={() => setShowVersions(false)} onRestore={doRollback} />
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */

const HOME_CANVAS_WIDTH = 1280;

function HomeCanvas({
  tree,
  previewMode,
  selectedId,
  onSelect,
  onSelectChrome,
  onDelete,
  onDuplicate,
  onMove,
}: {
  tree: CompositionTree;
  previewMode: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectChrome: (area: ChromeArea) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [metrics, setMetrics] = useState({ width: HOME_CANVAS_WIDTH, height: 900 });

  useEffect(() => {
    const measure = () => {
      const width = outerRef.current?.clientWidth ?? HOME_CANVAS_WIDTH;
      const height = frameRef.current?.scrollHeight ?? 900;
      setMetrics((current) =>
        Math.abs(current.width - width) > 1 || Math.abs(current.height - height) > 1
          ? { width, height }
          : current,
      );
    };

    measure();
    const frame = frameRef.current;
    const outer = outerRef.current;
    const observer = new ResizeObserver(measure);
    if (frame) observer.observe(frame);
    if (outer) observer.observe(outer);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tree, previewMode, selectedId]);

  const scale = Math.min(1, Math.max(0.45, metrics.width / HOME_CANVAS_WIDTH));

  return (
    <div ref={outerRef} className="flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
      <div
        className="relative mx-auto overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-border/70"
        style={{
          width: HOME_CANVAS_WIDTH * scale,
          height: metrics.height * scale,
        }}
      >
        <div
          ref={frameRef}
          className="absolute left-0 top-0 bg-background"
          style={{
            width: HOME_CANVAS_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <InertChrome label="Encabezado" selected={selectedId === HEADER_CHROME_ID} onSelect={() => onSelectChrome("header")}>
            <PublicHeader variant="overlay" config={getChromeConfig(tree, "header")} />
          </InertChrome>
          <CompositionRenderer
            tree={tree}
            pageType="home"
            wrap={
              previewMode
                ? undefined
                : (node, content) => (
                    <BlockOverlay
                      key={node.id}
                      node={node}
                      selected={selectedId === node.id}
                      onSelect={() => onSelect(node.id)}
                      onDelete={() => onDelete(node.id)}
                      onDuplicate={() => onDuplicate(node.id)}
                      onMoveUp={() => onMove(node.id, -1)}
                      onMoveDown={() => onMove(node.id, 1)}
                    >
                      {content}
                    </BlockOverlay>
                  )
            }
          />
          <InertChrome label="Pie de página" selected={selectedId === FOOTER_CHROME_ID} onSelect={() => onSelectChrome("footer")}>
            <PublicFooter config={getChromeConfig(tree, "footer")} />
          </InertChrome>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */

function InertChrome({
  label, selected, onSelect, children,
}: { label: string; selected: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative cursor-pointer outline-none ring-inset ${selected ? "ring-4 ring-primary" : "hover:ring-2 hover:ring-primary/40"}`}
      aria-label={`Editar ${label}`}
    >
      <div className="pointer-events-none select-none opacity-90" aria-hidden>
        {children}
      </div>
      <span className={`pointer-events-none absolute left-3 top-3 z-30 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-lg transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
        {label}
      </span>
    </div>
  );
}

function ChromeItem({
  label, note, selected, onSelect,
}: { label: string; note: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`mb-2 w-full rounded-md border px-3 py-2 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-dashed border-border bg-muted/30 hover:bg-accent"}`}
    >
      <p className="text-[11px] font-semibold text-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground">{note}</p>
    </button>
  );
}

function SortableSectionItem({
  node, selected, onSelect,
}: {
  node: CompositionNode;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const contract = getBlock(node.type);
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mb-1 flex items-center gap-1 rounded-md border px-2 py-1.5 text-left text-xs ${
        selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-accent"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
        className="cursor-grab text-muted-foreground active:cursor-grabbing"
      >
        ⋮⋮
      </button>
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 flex-1 truncate text-left font-medium"
      >
        {contract?.display_name ?? node.type}
      </button>
    </div>
  );
}

function BlockOverlay({
  node, selected, onSelect, onDelete, onDuplicate, onMoveUp, onMoveDown, children,
}: {
  node: CompositionNode;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}) {
  const contract = getBlock(node.type);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);
  return (
    <div
      ref={ref}
      data-node-id={node.id}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative cursor-pointer outline-none ring-inset transition-shadow ${
        selected ? "ring-4 ring-primary" : "hover:ring-2 hover:ring-primary/40"
      }`}
      aria-label={`Editar ${contract?.display_name ?? node.type}`}
    >
      <span
        className={`pointer-events-none absolute left-3 top-3 z-30 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground shadow-lg transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {contract?.display_name ?? node.type}
      </span>
      {selected ? (
        <div className="pointer-events-auto absolute right-3 top-3 z-30 flex gap-1 rounded-full bg-background/95 p-1 shadow-lg ring-1 ring-border">
          <IconBtn onClick={(e) => { e.stopPropagation(); onMoveUp(); }} icon={<ChevronUp className="size-3" />} label="Subir" />
          <IconBtn onClick={(e) => { e.stopPropagation(); onMoveDown(); }} icon={<ChevronDown className="size-3" />} label="Bajar" />
          <IconBtn onClick={(e) => { e.stopPropagation(); onDuplicate(); }} icon={<Copy className="size-3" />} label="Duplicar" />
          <IconBtn onClick={(e) => { e.stopPropagation(); onDelete(); }} icon={<Trash2 className="size-3" />} label="Eliminar" tone="danger" />
        </div>
      ) : null}
      {/* Bloqueamos interacciones internas: en modo edición los clics
          siempre seleccionan el bloque en vez de navegar/enviar. */}
      <div className="pointer-events-none select-none">{children}</div>
    </div>
  );
}

function IconBtn({
  onClick, icon, label, tone,
}: { onClick: (e: React.MouseEvent) => void; icon: React.ReactNode; label: string; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-foreground hover:bg-accent ${tone === "danger" ? "hover:text-destructive" : ""}`}
    >
      {icon}
    </button>
  );
}

function ToolBtn({
  onClick, icon, label, tone,
}: { onClick: () => void; icon: React.ReactNode; label: string; tone?: "danger" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent ${tone === "danger" ? "hover:border-destructive hover:text-destructive" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}

function BlockLibraryModal({
  onClose, onPick,
}: { onClose: () => void; onPick: (type: string) => void }) {
  const blocks = useMemo(
    () =>
      listBlocks()
        .filter((b) => (b.constraints?.surfaces ?? []).includes("home"))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [],
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Añadir una sección</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {blocks.map((b) => (
            <button
              key={b.type}
              type="button"
              onClick={() => onPick(b.type)}
              className="rounded-md border border-border bg-background p-3 text-left hover:border-primary hover:bg-accent"
            >
              <p className="text-xs font-semibold">{b.display_name}</p>
              {b.description ? (
                <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{b.description}</p>
              ) : null}
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{b.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionsDrawer({
  versions, onClose, onRestore,
}: {
  versions: CompositionRevisionSummary[];
  onClose: () => void;
  onRestore: (rev: CompositionRevisionSummary) => void | Promise<void>;
}) {
  return (
    <div
      className="fixed right-0 top-[52px] z-50 flex h-[calc(100vh-52px)] w-[380px] max-w-[92vw] flex-col gap-3 border-l border-border bg-card p-4 shadow-xl"
      aria-label="Historial de versiones"
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Historial</p>
          <h2 className="text-base font-semibold">Versiones publicadas</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Cerrar historial"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {versions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aún no hay versiones publicadas.</p>
        ) : (
          versions.map((v) => (
            <div key={v.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold">Revisión #{v.revision_number}</p>
                <button
                  type="button"
                  onClick={() => void onRestore(v)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium hover:bg-accent"
                >
                  Restaurar
                </button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(v.created_at).toLocaleString()}</p>
              {v.notes ? <p className="mt-1 text-[11px] text-foreground">{v.notes}</p> : null}
            </div>
          ))
        )}
      </div>
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
  title, detail, spinner, onExit,
}: {
  title: string;
  detail?: string;
  spinner?: boolean;
  onExit: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {spinner ? <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" aria-hidden /> : null}
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
