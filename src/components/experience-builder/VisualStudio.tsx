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
  GripVertical,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Redo2,
  Search,
  Share2,
  Trash2,
  Undo2,
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
  issueCompositionPreviewLink,
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
import { FONT_FAMILY_OPTIONS, type BlockAppearance } from "@/lib/experience-builder/appearance";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type ChromeArea = "header" | "footer";

const HEADER_CHROME_ID = "__chrome_header";
const FOOTER_CHROME_ID = "__chrome_footer";
const SEO_CHROME_ID = "__chrome_seo";

const DEFAULT_SEO_CONFIG: CompositionJsonObject = {
  title: "",
  description: "",
  og_image: "",
  canonical: "",
  noindex: false,
};

const seoChromeContract: BlockContract = {
  type: "vmx.chrome.seo",
  category: "static",
  version: "1.0.0",
  display_name: "SEO de la página",
  description: "Metadatos para buscadores y redes sociales (title, description, imagen de compartir).",
  schema: {
    title: { type: "text", label: "Título (title)", description: "Ideal: 50–60 caracteres." },
    description: { type: "rich_text", label: "Descripción (meta description)", description: "Ideal: 140–160 caracteres." },
    og_image: { type: "media", label: "Imagen de compartir (og:image)", accepts: ["image/*"] },
    canonical: { type: "url", label: "URL canónica" },
    noindex: { type: "boolean", label: "Ocultar de buscadores (noindex)", default: false },
  },
  capabilities: { soporta_seo: true },
};

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
  buttons: [
    {
      kind: "cta",
      label: "Arma tu Viaje",
      href: "/arma-tu-viaje",
      icon: "Compass",
      variant: "primary",
      visible: true,
    },
    {
      kind: "language",
      label: "Idioma",
      href: "",
      icon: "",
      variant: "ghost",
      visible: true,
    },
    {
      kind: "user_menu",
      label: "Iniciar sesión",
      href: "",
      icon: "User",
      variant: "primary",
      visible: true,
    },
    {
      kind: "menu_toggle",
      label: "Menú",
      href: "",
      icon: "Menu",
      variant: "ghost",
      visible: true,
    },
  ],
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
  description:
    "Barra superior del sitio. Compartida por todas las páginas. Cada campo aquí abajo indica dónde aparece.",
  schema: {
    buttons: {
      type: "list",
      label: "Botones del header (orden de izquierda a derecha)",
      description:
        "Arrastra ▲/▼ para reordenar. Puedes ocultar cualquier botón sin borrarlo, o agregar botones nuevos. Los botones de sistema (Idioma, Menú, Sesión) sólo se pueden ocultar/reordenar; los CTA y enlaces personalizados también se pueden borrar.",
      item: {
        type: "object",
        label: "Botón",
        fields: {
          kind: {
            type: "select",
            label: "Tipo",
            description:
              "CTA = botón destacado con enlace. Enlace = botón simple. Los de sistema conectan idioma, sesión o menú móvil.",
            default: "cta",
            options: [
              { value: "cta", label: "Botón destacado (CTA)" },
              { value: "custom_link", label: "Enlace personalizado" },
              { value: "language", label: "Sistema · Selector de idioma" },
              { value: "user_menu", label: "Sistema · Sesión / Iniciar sesión" },
              { value: "menu_toggle", label: "Sistema · Menú móvil (hamburguesa)" },
            ],
          },
          label: {
            type: "text",
            label: "Texto visible",
            description: "Etiqueta del botón. Los de sistema usan su texto propio si lo dejas vacío.",
          },
          href: {
            type: "url",
            label: "Enlace",
            description: "Sólo aplica a CTA y enlaces personalizados.",
          },
          icon: {
            type: "select",
            label: "Ícono",
            description: "Ícono opcional a la izquierda del texto.",
            default: "",
            options: [
              { value: "", label: "Sin ícono" },
              { value: "Compass", label: "Brújula (Arma tu viaje)" },
              { value: "Globe", label: "Globo (Idiomas)" },
              { value: "User", label: "Usuario" },
              { value: "Menu", label: "Menú (hamburguesa)" },
              { value: "MapPin", label: "Pin de mapa" },
              { value: "Phone", label: "Teléfono" },
              { value: "Mail", label: "Correo" },
              { value: "ShoppingBag", label: "Bolsa (Comprar)" },
              { value: "Heart", label: "Corazón (Favoritos)" },
              { value: "Sparkles", label: "Chispas" },
              { value: "Calendar", label: "Calendario" },
              { value: "Search", label: "Búsqueda" },
              { value: "Info", label: "Info" },
            ],
          },
          variant: {
            type: "select",
            label: "Estilo",
            description: "Primario = color de marca. Secundario = borde. Fantasma = sólo texto.",
            default: "primary",
            options: [
              { value: "primary", label: "Primario (sólido)" },
              { value: "secondary", label: "Secundario (contorno)" },
              { value: "ghost", label: "Fantasma (sin fondo)" },
              { value: "light", label: "Claro (translúcido sobre foto)" },
            ],
          },
          size: {
            type: "select",
            label: "Tamaño",
            default: "md",
            options: [
              { value: "xs", label: "Extra pequeño" },
              { value: "sm", label: "Pequeño" },
              { value: "md", label: "Mediano (por defecto)" },
              { value: "lg", label: "Grande" },
            ],
          },
          visible: {
            type: "boolean",
            label: "Visible",
            default: true,
            description: "Desactiva para ocultar el botón sin borrarlo.",
          },
        },
      },
    },
    nav: {
      type: "list",
      label: "Menú principal (enlaces del centro/derecha del header)",
      description:
        "Los enlaces que se ven en la barra superior, junto al logotipo. Se muestran de izquierda a derecha en el orden de esta lista.",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto visible", required: true, description: "Lo que lee el visitante (ej. \"Destinos\")." },
          href: { type: "url", label: "A dónde va", required: true, description: "URL destino (ej. /destinos)." },
        },
      },
    },
    cta_label: {
      type: "text",
      label: "Botón destacado — texto",
      description: "Botón resaltado a la derecha del header. Ej.: \"Arma tu viaje\". Déjalo vacío para ocultarlo.",
    },
    cta_href: {
      type: "url",
      label: "Botón destacado — enlace",
      description: "Enlace del botón destacado del header.",
    },
    show_language: {
      type: "boolean",
      label: "Mostrar selector de idiomas",
      default: true,
      description: "Muestra el globo de idiomas en el extremo derecho del header.",
    },
    show_user_menu: {
      type: "boolean",
      label: "Mostrar acceso de usuario",
      default: true,
      description: "Muestra el avatar/menú de sesión (Iniciar sesión / Mi cuenta) a la derecha del header.",
    },
  },
  capabilities: { soporta_preview: true, soporta_i18n: true },
};

const footerChromeContract: BlockContract = {
  type: "vmx.chrome.footer",
  category: "static",
  version: "1.0.0",
  display_name: "Pie de página",
  description:
    "Franja inferior del sitio. Compartida por todas las páginas. Cada campo aquí abajo indica en qué parte del pie aparece.",
  schema: {
    tagline: {
      type: "text",
      label: "Descripción bajo el logotipo",
      description: "Frase corta que aparece debajo del logotipo, en la primera columna del pie.",
    },
    explore_links: {
      type: "list",
      label: "Columna \"Explorar\" (2ª columna)",
      description: "Enlaces de la segunda columna del pie. Se listan verticalmente.",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto visible", required: true },
          href: { type: "url", label: "A dónde va", required: true },
        },
      },
    },
    platform_links: {
      type: "list",
      label: "Columna \"Plataforma\" (3ª columna)",
      description: "Enlaces de la tercera columna del pie.",
      item: {
        type: "object",
        label: "Enlace",
        fields: {
          label: { type: "text", label: "Texto visible", required: true },
          href: { type: "url", label: "A dónde va", required: true },
        },
      },
    },
    legal_label: {
      type: "text",
      label: "Texto legal (barra inferior · izquierda)",
      description: "Aparece en la franja inferior del pie, a la izquierda (ej. \"© 2026 Valladolid.mx\").",
    },
    privacy_label: {
      type: "text",
      label: "Texto privacidad (barra inferior · derecha)",
      description: "Enlace corto de la franja inferior a la derecha (ej. \"Privacidad\").",
    },
    show_language: {
      type: "boolean",
      label: "Mostrar selector de idiomas",
      default: true,
      description: "Muestra el selector de idiomas en la barra inferior del pie.",
    },
  },
  capabilities: { soporta_preview: true, soporta_i18n: true },
};

function getChromeConfig(tree: CompositionTree, area: ChromeArea): CompositionJsonObject {
  const defaults = area === "header" ? DEFAULT_HEADER_CONFIG : DEFAULT_FOOTER_CONFIG;
  return { ...defaults, ...(tree.chrome?.[area] ?? {}) };
}

function getSeoConfig(tree: CompositionTree): CompositionJsonObject {
  return { ...DEFAULT_SEO_CONFIG, ...(tree.chrome?.seo ?? {}) };
}

interface SitePage {
  key: string;
  slug: string;
  page_type: string;
  title: string;
  description: string;
  publicPath: string;
  status: "editable" | "soon";
  soonLabel?: string;
  custom?: boolean;
}

type CompoSummary = {
  id: string;
  slug: string;
  status: string;
  page_type: string;
  title?: string;
};

function pickCompositionBySlug<T extends CompoSummary>(items: T[], slug: string, pageType: string): T | null {
  const wantedSlug = normalizePageKey(slug);
  const matches = items.filter((item) => normalizePageKey(item.slug) === wantedSlug);
  return (
    matches.find((item) => item.page_type === pageType && item.status === "published") ??
    matches.find((item) => item.page_type === pageType) ??
    matches.find((item) => item.status === "published") ??
    matches[0] ??
    null
  );
}

const SITE_PAGES: SitePage[] = [
  { key: "home", slug: "home", page_type: "home", title: "Inicio",
    description: "Página principal que ve todo visitante al llegar a Valladolid.mx.",
    publicPath: "/", status: "editable" },
  { key: "experiencias", slug: "experiencias", page_type: "landing", title: "Experiencias",
    description: "Catálogo de experiencias turísticas.", publicPath: "/p/experiencias", status: "editable" },
  { key: "hoteles", slug: "hoteles", page_type: "landing", title: "Hoteles",
    description: "Hospedaje disponible en el destino.", publicPath: "/p/hoteles", status: "editable" },
  { key: "restaurantes", slug: "restaurantes", page_type: "landing", title: "Restaurantes",
    description: "Gastronomía local y recomendada.", publicPath: "/p/restaurantes", status: "editable" },
  { key: "eventos", slug: "eventos", page_type: "landing", title: "Eventos",
    description: "Agenda de eventos y actividades.", publicPath: "/p/eventos", status: "editable" },
  { key: "empresas", slug: "empresas", page_type: "landing", title: "Empresas",
    description: "Directorio de empresas locales.", publicPath: "/p/empresas", status: "editable" },
  { key: "marketplace", slug: "marketplace", page_type: "landing", title: "Marketplace",
    description: "Tienda y reservaciones.", publicPath: "/p/marketplace", status: "editable" },
  { key: "arma-tu-viaje", slug: "arma-tu-viaje", page_type: "landing", title: "Arma tu viaje",
    description: "Planificador interactivo del viaje.", publicPath: "/p/arma-tu-viaje", status: "editable" },
  { key: "alux", slug: "alux", page_type: "landing", title: "Alux (IA)",
    description: "Superficie de conversación con Alux.", publicPath: "/p/alux", status: "editable" },
  { key: "oriente-maya", slug: "oriente-maya", page_type: "landing", title: "Oriente Maya",
    description: "Portal territorial del Oriente Maya.", publicPath: "/p/oriente-maya", status: "editable" },
];

export interface VisualStudioProps {
  page?: string | null;
  onSelectPage?: (key: string | null) => void;
  /** Modo Profesional: revela editor JSON, biblioteca de reutilizables y metadatos técnicos. */
  advanced?: boolean;
}

export function VisualStudio({ page = null, onSelectPage, advanced = false }: VisualStudioProps = {}) {
  const [internalKey, setInternalKey] = useState<string | null>(page);
  const [customPages, setCustomPages] = useState<SitePage[]>([]);
  const openKey = normalizePageKey(page ?? internalKey);
  const setOpen = (k: string | null) => {
    const next = normalizePageKey(k);
    setInternalKey(next);
    onSelectPage?.(next);
  };
  const allPages = useMemo(() => [...SITE_PAGES, ...customPages], [customPages]);
  const activePage = openKey
    ? allPages.find((p) => normalizePageKey(p.key) === openKey) ?? null
    : null;
  if (activePage) {
    return <PageVisualEditor pageDef={activePage} onExit={() => setOpen(null)} advanced={advanced} />;
  }
  return (
    <PagesPicker
      customPages={customPages}
      onOpen={(k) => setOpen(k)}
      onCreated={(p) => {
        setCustomPages((prev) => (prev.some((x) => x.key === p.key) ? prev : [...prev, p]));
        setOpen(p.key);
      }}
    />
  );
}

/* --------------------------------------------------------------------- */

function PagesPicker({
  onOpen,
  customPages,
  onCreated,
}: {
  onOpen: (key: string) => void;
  customPages: SitePage[];
  onCreated: (page: SitePage) => void;
}) {
  const listAll = useServerFn(listCompositions);
  const create = useServerFn(createComposition);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [dbPages, setDbPages] = useState<SitePage[]>([]);
  const knownKeys = useMemo(
    () => new Set([...SITE_PAGES.map((p) => normalizePageKey(p.key)), ...customPages.map((p) => normalizePageKey(p.key))]),
    [customPages],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await listAll();
        if (cancelled) return;
        const extras: SitePage[] = all
          .filter((c) => !knownKeys.has(normalizePageKey(c.slug)))
          .map((c) => ({
            key: normalizePageKey(c.slug) ?? c.slug,
            slug: normalizePageKey(c.slug) ?? c.slug,
            page_type: c.page_type,
            title: c.title,
            description: c.description ?? "Página personalizada creada desde el editor.",
            publicPath: `/p/${c.slug}`,
            status: "editable" as const,
            custom: true,
          }));
        setDbPages(extras);
      } catch {
        /* silencioso — el picker sigue funcionando */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listAll, knownKeys]);

  const allPages = useMemo(
    () => [...SITE_PAGES, ...customPages, ...dbPages],
    [customPages, dbPages],
  );

  const handleCreate = async (form: { title: string; slug: string; description: string }) => {
    setCreating(true);
    setCreateError(null);
    try {
      const cleanSlug = form.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!cleanSlug) {
        setCreateError("El identificador (slug) no puede quedar vacío.");
        setCreating(false);
        return;
      }
      if (allPages.some((p) => p.slug === cleanSlug)) {
        setCreateError(`Ya existe una página con el identificador "${cleanSlug}".`);
        setCreating(false);
        return;
      }
      await create({
        data: {
          slug: cleanSlug,
          title: form.title.trim() || cleanSlug,
          description: form.description.trim() || undefined,
          page_type: "landing",
        },
      });
      const created: SitePage = {
        key: cleanSlug,
        slug: cleanSlug,
        page_type: "landing",
        title: form.title.trim() || cleanSlug,
        description: form.description.trim() || "Página personalizada creada desde el editor.",
        publicPath: `/p/${cleanSlug}`,
        status: "editable",
        custom: true,
      };
      setShowCreate(false);
      onCreated(created);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Elige una página</p>
          <h2 className="mt-2 text-2xl font-semibold">¿Qué página quieres editar?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona cualquier página del sitio para verla y modificarla tal como la ven los visitantes.
            Todas las secciones ya son editables desde aquí; también puedes crear nuevas landing pages
            (videomapping, campañas, eventos especiales) y publicarlas en <code>/p/&lt;identificador&gt;</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
        >
          <Plus className="size-3.5" aria-hidden /> Crear nueva página
        </button>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allPages.map((p) => {
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
                  {p.custom ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Nueva
                    </span>
                  ) : editable ? (
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
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-background p-5 text-center transition-colors hover:bg-primary/5"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Crear nueva página</span>
          <span className="max-w-[220px] text-[11px] text-muted-foreground">
            Landing pages para videomapping, campañas, eventos especiales, promociones…
          </span>
        </button>
      </section>
      {showCreate ? (
        <CreatePageModal
          busy={creating}
          error={createError}
          onCancel={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      ) : null}
    </div>
  );
}

function CreatePageModal({
  busy, error, onCancel, onSubmit,
}: {
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (form: { title: string; slug: string; description: string }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const slugTouched = useRef(false);
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Nueva página</p>
            <h3 className="text-sm font-semibold">Crear una landing page</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit({ title, slug, description });
          }}
        >
          <label className="block text-xs font-medium">
            Título
            <input
              type="text"
              value={title}
              placeholder="Ej. Videomapping Centro Histórico"
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched.current) setSlug(slugify(e.target.value));
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              required
              autoFocus
            />
          </label>
          <label className="block text-xs font-medium">
            Identificador (URL)
            <div className="mt-1 flex items-center gap-1">
              <span className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">/p/</span>
              <input
                type="text"
                value={slug}
                placeholder="videomapping-centro"
                onChange={(e) => {
                  slugTouched.current = true;
                  setSlug(slugify(e.target.value));
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm font-mono"
                required
              />
            </div>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              Solo minúsculas, números y guiones. Ejemplo: <code>videomapping-centro</code>.
            </span>
          </label>
          <label className="block text-xs font-medium">
            Descripción interna (opcional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[70px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
              Crear y abrir editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function normalizePageKey(key: string | null | undefined): string | null {
  const clean = key?.trim().toLowerCase();
  return clean || null;
}

/* --------------------------------------------------------------------- */

function PageVisualEditor({
  pageDef,
  onExit,
  advanced = false,
}: {
  pageDef: SitePage;
  onExit: () => void;
  advanced?: boolean;
}) {
  const list = useServerFn(listCompositions);
  const get = useServerFn(getComposition);
  const create = useServerFn(createComposition);
  const save = useServerFn(saveCompositionDraft);
  const publish = useServerFn(publishComposition);
  const listRevs = useServerFn(listCompositionRevisions);
  const restore = useServerFn(restoreCompositionRevision);
  const issuePreview = useServerFn(issueCompositionPreviewLink);
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
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState<{ url: string; expires_at: string } | null>(null);
  const skipNextAutoSave = useRef(false);
  /**
   * Historial visual (US-14). Guardamos snapshots del árbol en `pastRef`
   * al aplicar cada mutación desde `commitTree`. `undo` / `redo` restauran
   * sin disparar `commitTree` de nuevo (marcan `skipHistory`). El
   * autoguardado sigue tal cual — cuando se restaura una versión, el
   * `setTree` normal se dispara y persiste el estado al backend.
   */
  const pastRef = useRef<CompositionTree[]>([]);
  const futureRef = useRef<CompositionTree[]>([]);
  const HISTORY_LIMIT = 50;
  const [historyTick, setHistoryTick] = useState(0);
  const bumpHistory = () => setHistoryTick((n) => (n + 1) % 1_000_000);
  const resetHistory = () => {
    pastRef.current = [];
    futureRef.current = [];
    bumpHistory();
  };
  const commitTree = (next: CompositionTree) => {
    if (tree) {
      pastRef.current.push(tree);
      if (pastRef.current.length > HISTORY_LIMIT) pastRef.current.shift();
      futureRef.current = [];
      bumpHistory();
    }
    setTree(next);
  };
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;
  const undo = () => {
    if (!tree || pastRef.current.length === 0) return;
    const prev = pastRef.current.pop()!;
    futureRef.current.push(tree);
    bumpHistory();
    setTree(prev);
  };
  const redo = () => {
    if (!tree || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(tree);
    bumpHistory();
    setTree(next);
  };
  /**
   * Viewport del canvas (mobile-first, coherente con la doctrina del
   * proyecto: el turismo consume mayormente en celular). Persistido
   * por usuario en localStorage.
   */
  const [deviceViewport, setDeviceViewport] = useState<DeviceViewport>(() => {
    if (typeof window === "undefined") return "mobile";
    const stored = window.localStorage.getItem("eb.canvas.device");
    return stored === "tablet" || stored === "desktop" ? stored : "mobile";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("eb.canvas.device", deviceViewport);
  }, [deviceViewport]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const all = await list();
        const existing = pickCompositionBySlug(all, pageDef.slug, pageDef.page_type);
        let detail: CompositionDetail | null = null;
        if (existing) {
          detail = (await get({ data: { id: existing.id } })) as CompositionDetail | null;
        } else {
          const { id } = await create({
            data: {
              slug: pageDef.slug,
              title: pageDef.title,
              page_type: pageDef.page_type,
              description: pageDef.description,
            },
          });
          detail = (await get({ data: { id } })) as CompositionDetail | null;
        }
        if (cancelled || !detail) return;
        setPage(detail);
        skipNextAutoSave.current = true;
        setTree(detail.current_draft);
        resetHistory();
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [list, get, create, pageDef.slug, pageDef.page_type, pageDef.title, pageDef.description]);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!page || !tree) return;
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      setSaveStatus("idle");
      return;
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = window.setTimeout(() => {
      void save({ data: { id: page.id, tree } })
        .then(() => {
          setSaveStatus("saved");
        })
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
  const selectedChrome: ChromeArea | "seo" | null =
    selectedId === HEADER_CHROME_ID
      ? "header"
      : selectedId === FOOTER_CHROME_ID
      ? "footer"
      : selectedId === SEO_CHROME_ID
      ? "seo"
      : null;
  const selectedContract = useMemo(
    () => {
      if (selectedChrome === "header") return headerChromeContract;
      if (selectedChrome === "footer") return footerChromeContract;
      if (selectedChrome === "seo") return seoChromeContract;
      return selectedNode ? getBlock(selectedNode.type) ?? null : null;
    },
    [selectedChrome, selectedNode],
  );
  const selectedConfig = useMemo(
    () => {
      if (!tree) return null;
      if (selectedChrome === "header" || selectedChrome === "footer") return getChromeConfig(tree, selectedChrome);
      if (selectedChrome === "seo") return getSeoConfig(tree);
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
      if (pageDef.page_type === "home") {
        await queryClient.invalidateQueries({ queryKey: ["eb", "published-home", "default"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["eb", "published-by-slug", pageDef.slug] });
      setMessage(`Cambios publicados en ${pageDef.publicPath}.`);
      if (showVersions) void refreshVersions();
    } catch (e) {
      setMessage(`No se pudo publicar: ${(e as Error).message}`);
    } finally {
      setPublishing(false);
    }
  };

  const updateSelectedConfig = (nextConfig: Record<string, unknown>) => {
    if (!tree) return;
    if (selectedChrome === "header" || selectedChrome === "footer") {
      commitTree({
        ...tree,
        chrome: {
          ...(tree.chrome ?? {}),
          [selectedChrome]: nextConfig as CompositionJsonObject,
        },
      });
      return;
    }
    if (selectedChrome === "seo") {
      commitTree({
        ...tree,
        chrome: {
          ...(tree.chrome ?? {}),
          seo: nextConfig as CompositionJsonObject,
        },
      });
      return;
    }
    if (!selectedNode) return;
    commitTree(updateNodeConfig(tree, selectedNode.id, nextConfig));
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
    commitTree({ ...tree, root: { children: next } });
  };

  const duplicateNode = (nodeId: string) => {
    if (!tree) return;
    const src = tree.root.children.find((n) => n.id === nodeId);
    if (!src) return;
    const clone: CompositionNode = { ...src, id: newNodeId(), config: { ...src.config } };
    const idx = tree.root.children.findIndex((n) => n.id === nodeId);
    const next = [...tree.root.children];
    next.splice(idx + 1, 0, clone);
    commitTree({ ...tree, root: { children: next } });
    setSelectedId(clone.id);
  };

  const removeNodeById = (nodeId: string) => {
    if (!tree) return;
    const next = tree.root.children.filter((n) => n.id !== nodeId);
    commitTree({ ...tree, root: { children: next } });
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
    commitTree({ ...tree, root: { children: next } });
    setSelectedId(node.id);
    setShowLibrary(false);
  };

  const insertReusable = (entry: ReusableBlock) => {
    if (!tree) return;
    const node: CompositionNode = {
      id: newNodeId(),
      type: entry.type,
      version: entry.version,
      config: JSON.parse(JSON.stringify(entry.config)) as CompositionNode["config"],
    };
    const next = [...tree.root.children, node];
    commitTree({ ...tree, root: { children: next } });
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
    const detail = (await get({ data: { id: page.id } })) as CompositionDetail | null;
    if (detail) {
      setPage(detail);
      setTree(detail.current_draft);
      resetHistory();
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
    commitTree({ ...tree, root: { children: next } });
  };

  const shareDraftPreview = async () => {
    if (!page || sharing) return;
    setSharing(true);
    try {
      const { token, expires_at } = await issuePreview({
        data: { composition_id: page.id, ttl_minutes: 60 * 24 },
      });
      const url = `${window.location.origin}/preview/composition/${token}`;
      setShareLink({ url, expires_at });
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Enlace de vista previa copiado al portapapeles.");
      } catch {
        setMessage("Enlace de vista previa generado.");
      }
    } catch (e) {
      setMessage(`No se pudo generar el enlace: ${(e as Error).message}`);
    } finally {
      setSharing(false);
    }
  };

  // Atajos de teclado: Cmd/Ctrl+Z para deshacer, Cmd/Ctrl+Shift+Z (o Ctrl+Y)
  // para rehacer. Se ignora cuando el foco está en un input, textarea o
  // elemento editable para no romper el undo nativo de los campos.
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (isEditable(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree]);

  if (loadError) return <FullScreenState title="No se pudo abrir el editor" detail={loadError} onExit={onExit} />;
  if (!page || !tree) return <FullScreenState title="Preparando el editor…" detail={`Cargando ${pageDef.title}.`} spinner onExit={onExit} />;

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
          <h1 className="truncate text-sm font-semibold">{pageDef.title}</h1>
          <p className="truncate text-[10px] text-muted-foreground">{pageDef.publicPath}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SaveIndicator status={saveStatus} />
          <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5" role="group" aria-label="Historial">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Deshacer (⌘Z / Ctrl+Z)"
              aria-label="Deshacer"
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Undo2 className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Rehacer (⇧⌘Z / Ctrl+Y)"
              aria-label="Rehacer"
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Redo2 className="size-3.5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSelectedId(HEADER_CHROME_ID)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Editar encabezado
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(FOOTER_CHROME_ID)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Editar pie
          </button>
          <button
            type="button"
            onClick={() => setSelectedId(SEO_CHROME_ID)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent ${
              selectedId === SEO_CHROME_ID
                ? "border-primary bg-primary/10 text-primary"
                : "border-primary/40 bg-primary/5 text-primary"
            }`}
            title="Título, descripción, imagen social y buscadores"
          >
            <Search className="size-3.5" aria-hidden />
            SEO y compartir
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent ${previewMode ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}
          >
            {previewMode ? "Salir de vista previa" : "Vista previa"}
          </button>
          <DeviceToggle value={deviceViewport} onChange={setDeviceViewport} />
          <button
            type="button"
            onClick={() => void openVersions()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <History className="size-3.5" aria-hidden />
            Versiones
          </button>
          <a
            href={pageDef.publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Ver en el sitio
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <button
            type="button"
            onClick={() => void shareDraftPreview()}
            disabled={sharing}
            title="Genera un enlace temporal para compartir el borrador actual sin publicarlo"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Share2 className="size-3.5" aria-hidden />
            )}
            Compartir vista previa
          </button>
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

      {advanced ? (
        <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-medium text-amber-900">
          Modo Profesional activo · se muestran controles avanzados (JSON, variables dinámicas, bloques reutilizables).
        </div>
      ) : null}

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
              <ChromeItem
                label="SEO y compartir"
                note="Título, descripción, imagen social, canonical"
                selected={selectedId === SEO_CHROME_ID}
                onSelect={() => setSelectedId(SEO_CHROME_ID)}
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
          deviceViewport={deviceViewport}
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
              simple={!advanced}
              activeBreakpoint={
                deviceViewport === "desktop" ? "lg" : deviceViewport === "tablet" ? "md" : "base"
              }
            />

            {selectedNode ? (
              <AppearancePanel
                config={selectedConfig}
                onChange={(next: Record<string, unknown>) => updateSelectedConfig(next)}
              />
            ) : null}

            {advanced && selectedNode ? (
              <AdvancedPanel
                node={selectedNode}
                config={selectedConfig}
                onChange={(next) => updateSelectedConfig(next)}
              />
            ) : null}
          </aside>
        ) : null}

        {showLibrary ? (
          <BlockLibraryModal
            advanced={advanced}
            onClose={() => setShowLibrary(false)}
            onPick={(type) => insertBlock(type)}
            onPickReusable={(entry) => insertReusable(entry)}
          />
        ) : null}
        {showVersions ? (
          <VersionsDrawer versions={versions} onClose={() => setShowVersions(false)} onRestore={doRollback} />
        ) : null}
        {shareLink ? (
          <SharePreviewModal
            url={shareLink.url}
            expiresAt={shareLink.expires_at}
            onClose={() => setShareLink(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function SharePreviewModal({
  url,
  expiresAt,
  onClose,
}: {
  url: string;
  expiresAt: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const expiresLabel = new Date(expiresAt).toLocaleString();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Compartir vista previa">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">Vista previa compartible</p>
            <h2 className="text-base font-semibold">Enlace generado</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Cerrar">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cualquiera con este enlace puede ver el borrador actual sin publicarlo. Caduca el {expiresLabel}.
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-background p-2">
          <input
            type="text"
            readOnly
            value={url}
            className="min-w-0 flex-1 bg-transparent px-1 text-xs text-foreground outline-none"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-95"
          >
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Abrir <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */

const HOME_CANVAS_WIDTH = 1280;

/** Anchos de canvas por dispositivo (px CSS reales, no escalados). */
export type DeviceViewport = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTHS: Record<DeviceViewport, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1280,
};

/**
 * Toggle segmentado Móvil / Tablet / Desktop para el canvas.
 * Default móvil — el turismo se consume mayormente en celular y así el
 * empresario ve la verdad del turista sin publicar.
 */
function DeviceToggle({
  value,
  onChange,
}: {
  value: DeviceViewport;
  onChange: (v: DeviceViewport) => void;
}) {
  const items: Array<{ id: DeviceViewport; label: string; short: string }> = [
    { id: "mobile", label: "Vista móvil (390 px)", short: "Móvil" },
    { id: "tablet", label: "Vista tablet (768 px)", short: "Tablet" },
    { id: "desktop", label: "Vista desktop (1280 px)", short: "Desktop" },
  ];
  return (
    <div
      role="group"
      aria-label="Vista previa por dispositivo"
      className="inline-flex items-center overflow-hidden rounded-md border border-border bg-background"
    >
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-pressed={active}
            title={it.label}
            className={`px-2.5 py-1.5 text-[11px] font-medium transition ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent"
            }`}
          >
            {it.short}
          </button>
        );
      })}
    </div>
  );
}

function HomeCanvas({
  tree,
  previewMode,
  deviceViewport,
  selectedId,
  onSelect,
  onSelectChrome,
  onDelete,
  onDuplicate,
  onMove,
  onReorderRoot,
}: {
  tree: CompositionTree;
  previewMode: boolean;
  deviceViewport: DeviceViewport;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSelectChrome: (area: ChromeArea) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onReorderRoot: (activeId: string, overId: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const frameWidth = DEVICE_WIDTHS[deviceViewport];
  const [metrics, setMetrics] = useState({ width: frameWidth, height: 900 });
  const rootIds = tree.root.children.map((n) => n.id);
  const rootIdSet = new Set(rootIds);
  const canvasSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleCanvasDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onReorderRoot(String(e.active.id), String(e.over.id));
  };

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
  }, [tree, previewMode, selectedId, deviceViewport]);

  // Móvil y tablet caben casi siempre a 1:1; desktop se auto-escala si el
  // contenedor del editor es más angosto que 1280.
  const scale = Math.min(1, Math.max(0.45, metrics.width / frameWidth));

  return (
    <div ref={outerRef} className="flex-1 overflow-y-auto bg-muted/20 px-3 py-3">
      <div
        className="relative mx-auto overflow-hidden rounded-lg bg-background shadow-sm ring-1 ring-border/70"
        style={{
          width: frameWidth * scale,
          height: metrics.height * scale,
        }}
      >
        <div
          ref={frameRef}
          data-eb-canvas-device={deviceViewport}
          className="absolute left-0 top-0 bg-background"
          style={{
            width: frameWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <StudioDeviceCss />
          <InertChrome label="Encabezado" selected={selectedId === HEADER_CHROME_ID} onSelect={() => onSelectChrome("header")}>
            <PublicHeader variant="overlay" config={getChromeConfig(tree, "header")} />
          </InertChrome>
          <DndContext sensors={canvasSensors} collisionDetection={closestCenter} onDragEnd={handleCanvasDragEnd}>
            <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
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
                          sortable={rootIdSet.has(node.id)}
                        >
                          {content}
                        </BlockOverlay>
                      )
                }
              />
            </SortableContext>
          </DndContext>
          <InertChrome label="Pie de página" selected={selectedId === FOOTER_CHROME_ID} onSelect={() => onSelectChrome("footer")}>
            <PublicFooter config={getChromeConfig(tree, "footer")} />
          </InertChrome>
        </div>
      </div>
    </div>
  );
}

/**
 * Fallback exclusivo del Studio: el canvas simula 390/768/1280px dentro de
 * una ventana desktop. Si algún breakpoint de viewport o container-query no
 * alcanza a recalcularse dentro del editor, estas reglas fuerzan las mismas
 * columnas que ve el sitio público para cada dispositivo seleccionado.
 */
function StudioDeviceCss() {
  return (
    <style>{`
      [data-eb-canvas-device="mobile"] [data-home-grid] {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      [data-eb-canvas-device="mobile"] [data-home-layout="consejo-alux"] {
        flex-direction: column !important;
        align-items: flex-start !important;
      }

      [data-eb-canvas-device="tablet"] [data-home-grid="destinos"],
      [data-eb-canvas-device="tablet"] [data-home-grid="categorias"],
      [data-eb-canvas-device="tablet"] [data-home-grid="empresas"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="tablet"] [data-home-grid="rutas"],
      [data-eb-canvas-device="tablet"] [data-home-grid="resenas"],
      [data-eb-canvas-device="tablet"] [data-home-grid="en-vivo"] {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="tablet"] [data-home-grid="arma-tu-viaje"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="tablet"] [data-home-layout="consejo-alux"] {
        flex-direction: row !important;
        align-items: center !important;
      }

      [data-eb-canvas-device="desktop"] [data-home-grid="destinos"],
      [data-eb-canvas-device="desktop"] [data-home-grid="rutas"],
      [data-eb-canvas-device="desktop"] [data-home-grid="resenas"] {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="desktop"] [data-home-grid="categorias"],
      [data-eb-canvas-device="desktop"] [data-home-grid="empresas"] {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="desktop"] [data-home-grid="en-vivo"] {
        grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      }
      [data-eb-canvas-device="desktop"] [data-home-grid="arma-tu-viaje"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    `}</style>
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
  onClose, onPick, advanced = false, onPickReusable,
}: {
  onClose: () => void;
  onPick: (type: string) => void;
  advanced?: boolean;
  onPickReusable?: (entry: ReusableBlock) => void;
}) {
  const blocks = useMemo(
    () =>
      listBlocks()
        .filter((b) => (b.constraints?.surfaces ?? []).includes("home"))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)),
    [],
  );
  const [reusable, setReusable] = useState<ReusableBlock[]>(() => loadReusableBlocks());
  const removeReusable = (id: string) => {
    const next = reusable.filter((r) => r.id !== id);
    saveReusableBlocks(next);
    setReusable(next);
  };
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
        {advanced && reusable.length > 0 ? (
          <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 p-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Bloques reutilizables
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {reusable.map((r) => (
                <div key={r.id} className="flex items-center gap-1 rounded-md border border-border bg-background p-2">
                  <button
                    type="button"
                    onClick={() => onPickReusable?.(r)}
                    className="min-w-0 flex-1 truncate text-left text-xs font-medium"
                    title={r.name}
                  >
                    {r.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeReusable(r.id)}
                    aria-label="Eliminar"
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
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

/* ------------------------------------------------------------------ *
 * Modo Profesional — panel avanzado + biblioteca de reutilizables
 * ------------------------------------------------------------------ */

interface ReusableBlock {
  id: string;
  name: string;
  type: string;
  version: string;
  config: Record<string, unknown>;
}

const REUSABLE_STORAGE_KEY = "vmx.eb.reusable_blocks";

function loadReusableBlocks(): ReusableBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REUSABLE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReusableBlocks(list: ReusableBlock[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REUSABLE_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function AdvancedPanel({
  node,
  config,
  onChange,
}: {
  node: CompositionNode;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  useEffect(() => {
    setJsonText(JSON.stringify(config, null, 2));
    setJsonError(null);
  }, [node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("La configuración debe ser un objeto JSON.");
        return;
      }
      onChange(parsed as Record<string, unknown>);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const saveAsReusable = () => {
    const defaultName =
      (config.heading as string) ||
      (config.title as string) ||
      node.type.replace(/^vmx\./, "");
    const name = typeof window !== "undefined"
      ? window.prompt("Nombre del bloque reutilizable", defaultName)
      : defaultName;
    if (!name) return;
    const entry: ReusableBlock = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      type: node.type,
      version: node.version,
      config: JSON.parse(JSON.stringify(config)) as Record<string, unknown>,
    };
    const next = [...loadReusableBlocks(), entry];
    saveReusableBlocks(next);
    setSavedNote(`Guardado como "${name}". Disponible en "Añadir sección".`);
    window.setTimeout(() => setSavedNote(null), 3000);
  };

  return (
    <section className="space-y-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3">
      <header className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Modo Profesional
        </p>
        <button
          type="button"
          onClick={saveAsReusable}
          className="rounded-md border border-primary/40 bg-background px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/10"
        >
          Guardar como reutilizable
        </button>
      </header>
      {savedNote ? (
        <p className="text-[10px] text-emerald-600">{savedNote}</p>
      ) : null}
      <div>
        <label className="mb-1 block text-[11px] font-semibold">
          Configuración JSON del bloque
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          className="min-h-[160px] w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px]"
          spellCheck={false}
        />
        {jsonError ? (
          <p className="mt-1 text-[10px] text-destructive">{jsonError}</p>
        ) : null}
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={applyJson}
            className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-primary-foreground hover:opacity-95"
          >
            Aplicar JSON
          </button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Tipo <code className="rounded bg-background px-1">{node.type}</code> · v{node.version}
      </p>
    </section>
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

function AppearancePanel({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const appearance = (config.__appearance as BlockAppearance | undefined) ?? {};
  const set = (key: keyof BlockAppearance, value: unknown) => {
    const next: BlockAppearance = { ...appearance, [key]: value };
    // Limpia claves vacías/cero para que no persistan overrides inertes.
    Object.keys(next).forEach((k) => {
      const v = (next as Record<string, unknown>)[k];
      if (v === "" || v === undefined || v === null || (typeof v === "number" && !Number.isFinite(v))) {
        delete (next as Record<string, unknown>)[k];
      }
    });
    onChange({ ...config, __appearance: next });
  };
  const reset = () => {
    const rest = { ...config };
    delete (rest as Record<string, unknown>).__appearance;
    onChange(rest);
  };
  const input = "w-full rounded-md border border-border bg-background px-2 py-1 text-xs";
  const num = (v: number | undefined) => (v === undefined ? "" : String(v));
  return (
    <section className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        <span>Apariencia · tipografía y tamaño</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="space-y-2 pt-1">
          <label className="block text-[11px] font-medium">
            Tipo de letra
            <select
              value={appearance.font_family ?? ""}
              onChange={(e) => set("font_family", e.target.value)}
              className={input}
            >
              {FONT_FAMILY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-medium">
            Escala del texto ({appearance.font_scale ?? 1}×)
            <input
              type="range"
              min={0.6}
              max={2.4}
              step={0.05}
              value={appearance.font_scale ?? 1}
              onChange={(e) => set("font_scale", Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block text-[11px] font-medium">
            Alineación
            <select
              value={appearance.text_align ?? ""}
              onChange={(e) => set("text_align", e.target.value)}
              className={input}
            >
              <option value="">Por defecto</option>
              <option value="left">Izquierda</option>
              <option value="center">Centro</option>
              <option value="right">Derecha</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium">
              Color texto
              <input
                type="color"
                value={appearance.text_color ?? "#111111"}
                onChange={(e) => set("text_color", e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-border bg-background"
              />
            </label>
            <label className="block text-[11px] font-medium">
              Fondo
              <input
                type="color"
                value={appearance.bg_color ?? "#ffffff"}
                onChange={(e) => set("bg_color", e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-border bg-background"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium">
              Padding vertical (px)
              <input
                type="number"
                min={0}
                max={400}
                value={num(appearance.padding_y)}
                onChange={(e) => set("padding_y", e.target.value === "" ? undefined : Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="block text-[11px] font-medium">
              Padding horizontal (px)
              <input
                type="number"
                min={0}
                max={400}
                value={num(appearance.padding_x)}
                onChange={(e) => set("padding_x", e.target.value === "" ? undefined : Number(e.target.value))}
                className={input}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-[11px] font-medium">
              Alto mínimo (px)
              <input
                type="number"
                min={0}
                max={2000}
                value={num(appearance.min_height)}
                onChange={(e) => set("min_height", e.target.value === "" ? undefined : Number(e.target.value))}
                className={input}
              />
            </label>
            <label className="block text-[11px] font-medium">
              Ancho máximo (px)
              <input
                type="number"
                min={0}
                max={2400}
                value={num(appearance.max_width)}
                onChange={(e) => set("max_width", e.target.value === "" ? undefined : Number(e.target.value))}
                className={input}
              />
            </label>
          </div>
          <label className="block text-[11px] font-medium">
            Bordes redondeados (px)
            <input
              type="number"
              min={0}
              max={80}
              value={num(appearance.radius)}
              onChange={(e) => set("radius", e.target.value === "" ? undefined : Number(e.target.value))}
              className={input}
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Restablecer apariencia
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
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
