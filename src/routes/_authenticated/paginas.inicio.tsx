/**
 * /paginas/inicio — Editor productizado de la Página de Inicio.
 *
 * 15.10.4d · US-01 · "Editar la Home real desde el Studio".
 *
 * Principios:
 *  - WYSIWYG puro: se edita exactamente lo que el visitante ve.
 *  - Sin exponer conceptos técnicos (block, composition, slug, id, JSON).
 *  - Reutiliza infraestructura existente:
 *      · Experience Builder (composición + renderer + publish RPC).
 *      · Discovery Layer (PublicHeader / PublicFooter / PublicShell).
 *      · Lovable Cloud (page_compositions).
 *  - Nada nuevo se registra en engines/registries/providers.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, Loader2, X } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/paginas/inicio")({
  head: () => ({
    meta: [
      { title: "Editar página de Inicio · Valladolid.mx" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditorInicio,
});

type SaveStatus = "idle" | "saving" | "saved" | "error";

function EditorInicio() {
  const list = useServerFn(listCompositions);
  const get = useServerFn(getComposition);
  const create = useServerFn(createComposition);
  const save = useServerFn(saveCompositionDraft);
  const publish = useServerFn(publishComposition);
  const navigate = useNavigate();
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

  // Carga inicial de la composición de Inicio
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
          // Fallback muy defensivo: si por alguna razón no existiera,
          // crear una composición de Inicio vacía (el seed migró antes).
          const { id } = await create({
            data: {
              slug: "home",
              title: "Página de Inicio",
              page_type: "home",
            },
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

  // Auto-guardado con debounce (1s) — silencioso, "Guardado" al terminar.
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
    // Sólo dispara cuando cambia el árbol.
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
      // Persistir borrador antes de publicar
      await save({ data: { id: page.id, tree } });
      await publish({ data: { id: page.id, notes: "Publicado desde /paginas/inicio" } });
      // Refrescar la Home pública
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
    const next = updateNodeConfig(tree, heroNode.id, {
      ...heroNode.config,
      [field]: value,
    });
    setTree(next);
  };

  if (loadError) {
    return <FullScreenState title="No se pudo abrir el editor" detail={loadError} />;
  }
  if (!page || !tree) {
    return <FullScreenState title="Preparando el editor…" detail="Cargando tu página de Inicio." spinner />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Barra superior del editor (chrome mínimo, no técnico) */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => void navigate({ to: "/cms" })}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Volver al CMS"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Salir
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

      {/* Área de preview WYSIWYG (visitante) + panel lateral */}
      <div className="relative flex-1">
        {/* Preview: mismo header/footer/composición que ve un visitante */}
        <div className="min-h-screen">
          <PublicHeader variant="overlay" />
          <main id="main" className="pb-24">
            <CompositionRenderer
              tree={tree}
              pageType="home"
              wrap={(node, content) => {
                if (node.type !== "vmx.hero") {
                  // Otras secciones se muestran tal cual, sin herramientas
                  // (US-04 las hará editables una a una).
                  return content;
                }
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
                    {/* Etiqueta flotante (aparece al hover / seleccionado) */}
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

        {/* Panel lateral de edición del Hero — sólo cuando está seleccionado */}
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
  cta_secondary_label: string;
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
  // Muestra el texto real que ve el visitante: si el editor aún no ha
  // sobreescrito el campo, se prefill con el texto por defecto de la Home
  // para que "esté conectado con lo que hay".
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
            Cambia el texto y verás cómo queda al instante. Al terminar,
            pulsa <span className="font-semibold">Publicar cambios</span>.
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
        <input
          type="text"
          value={val("eyebrow")}
          onChange={(e) => onChange("eyebrow", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Experiencias que emocionan"
        />
      </Field>

      <Field label="Título principal" hint="El mensaje más grande de la página.">
        <textarea
          value={val("title")}
          onChange={(e) => onChange("title", e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Descubre Valladolid…"
        />
      </Field>

      <Field label="Subtítulo" hint="Frase breve debajo del título.">
        <textarea
          value={val("subtitle")}
          onChange={(e) => onChange("subtitle", e.target.value)}
          className="min-h-[70px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Cenotes, ciudades vivas…"
        />
      </Field>

      <Field label="Botón principal — texto">
        <input
          type="text"
          value={val("cta_label")}
          onChange={(e) => onChange("cta_label", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Explorar destinos"
        />
      </Field>
      <Field label="Botón principal — enlace" hint="Ruta a la que lleva el botón principal.">
        <input
          type="text"
          value={val("cta_href")}
          onChange={(e) => onChange("cta_href", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="/oriente-maya"
        />
      </Field>

      <Field label="Botón secundario — texto">
        <input
          type="text"
          value={val("cta_secondary_label")}
          onChange={(e) => onChange("cta_secondary_label", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="Ej. Arma tu viaje"
        />
      </Field>
      <Field label="Botón secundario — enlace" hint="Ruta a la que lleva el botón secundario.">
        <input
          type="text"
          value={val("cta_secondary_href")}
          onChange={(e) => onChange("cta_secondary_href", e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="/arma-tu-viaje"
        />
      </Field>
    </aside>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
}: {
  title: string;
  detail?: string;
  spinner?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      {spinner ? (
        <Loader2 className="mb-3 size-6 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
      <h1 className="text-lg font-semibold">{title}</h1>
      {detail ? (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{detail}</p>
      ) : null}
      <Link
        to="/cms"
        className="mt-6 inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Volver al CMS
      </Link>
    </div>
  );
}