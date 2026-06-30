/**
 * /_authenticated/cms/experience-builder — Experience Builder · Studio v0
 *
 * Etapa 15.10.2 · primer editor visual del Experience Builder.
 *
 * Principios arquitectónicos aplicados:
 *  - Canvas Agnóstico: el lienzo no conoce el tipo de página.
 *  - Layout Engine: la estructura visual reside en bloques contenedores
 *    reconocidos por el motor, no en los bloques de contenido.
 *  - Page-Type Agnostic: los tipos de página son configuración, no
 *    código del editor.
 *  - Block Contract / Block Registry: única fuente de bloques.
 *  - CMS First, BEA, Customer Case File, Alux read-only.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  listBlockLibrary,
} from "@/lib/experience-builder/experience-builder.functions";
import {
  listCompositions,
  getComposition,
  createComposition,
  saveCompositionDraft,
  createCompositionRevision,
  listCompositionRevisions,
  restoreCompositionRevision,
  publishComposition,
  unpublishComposition,
  type CompositionDetail,
  type CompositionSummary,
  type CompositionRevisionSummary,
} from "@/lib/experience-builder/studio.functions";
import {
  EMPTY_TREE,
  appendToRoot,
  duplicateRootNode,
  moveRootNode,
  newNodeId,
  removeNode,
  updateNodeConfig,
  type CompositionNode,
  type CompositionTree,
} from "@/lib/experience-builder/composition-tree";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/cms/experience-builder")({
  head: () => ({
    meta: [
      { title: "Experience Builder · Studio v0" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExperienceBuilderStudio,
});

interface LibraryEntry {
  type: string;
  category: string;
  display_name: string;
  description: string | null;
  version: string;
  schema: Record<string, FieldDef>;
  capabilities: Record<string, boolean>;
}

interface FieldDef {
  type: string;
  label: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
}

const PAGE_TYPES = [
  "generic",
  "home",
  "landing",
  "institutional",
  "destination",
  "business",
  "product",
  "campaign",
];

function ExperienceBuilderStudio() {
  const list = useServerFn(listCompositions);
  const get = useServerFn(getComposition);
  const create = useServerFn(createComposition);
  const save = useServerFn(saveCompositionDraft);
  const publish = useServerFn(createCompositionRevision);
  const listRevs = useServerFn(listCompositionRevisions);
  const restore = useServerFn(restoreCompositionRevision);
  const listLib = useServerFn(listBlockLibrary);
  const publicPublish = useServerFn(publishComposition);
  const publicUnpublish = useServerFn(unpublishComposition);
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [compositions, setCompositions] = useState<CompositionSummary[]>([]);
  const [active, setActive] = useState<CompositionDetail | null>(null);
  const [tree, setTree] = useState<CompositionTree>(EMPTY_TREE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<CompositionRevisionSummary[]>([]);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<"all" | "static" | "smart">("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("Listo.");

  // Modal state (replaces window.prompt/confirm — mejor UX en iPad/móvil)
  const [createOpen, setCreateOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState<null | "revision" | "public">(null);
  const [confirmState, setConfirmState] = useState<
    | null
    | {
        title: string;
        message: string;
        confirmLabel?: string;
        onConfirm: () => void | Promise<void>;
      }
  >(null);

  // Initial load
  useEffect(() => {
    void (async () => {
      try {
        const [libRaw, comps] = await Promise.all([listLib(), list()]);
        setLibrary(libRaw as unknown as LibraryEntry[]);
        setCompositions(comps);
      } catch (e) {
        setStatus(`Error: ${(e as Error).message}`);
      }
    })();
  }, [list, listLib]);

  // Autosave debounced
  useEffect(() => {
    if (!active || !dirty) return;
    const t = setTimeout(() => {
      void save({ data: { id: active.id, tree } })
        .then(() => {
          setDirty(false);
          setStatus("Borrador guardado automáticamente.");
        })
        .catch((e) => setStatus(`Error al guardar: ${e.message}`));
    }, 1200);
    return () => clearTimeout(t);
  }, [tree, dirty, active, save]);

  const selectedNode = useMemo(
    () => (selectedId ? tree.root.children.find((n) => n.id === selectedId) ?? null : null),
    [tree, selectedId],
  );
  const selectedContract = useMemo(
    () => (selectedNode ? library.find((l) => l.type === selectedNode.type) ?? null : null),
    [library, selectedNode],
  );

  const filteredLibrary = useMemo(
    () =>
      library.filter((b) => {
        if (filter !== "all" && b.category !== filter) return false;
        if (search && !b.display_name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [library, filter, search],
  );

  const openComposition = async (id: string) => {
    setStatus("Cargando…");
    const detail = await get({ data: { id } });
    if (!detail) {
      setStatus("No encontrada.");
      return;
    }
    setActive(detail);
    setTree(detail.current_draft ?? EMPTY_TREE);
    setSelectedId(null);
    setDirty(false);
    const revs = await listRevs({ data: { id } });
    setRevisions(revs);
    setStatus("Composición cargada.");
  };

  const onCreate = () => setCreateOpen(true);

  const submitCreate = async (input: {
    slug: string;
    title: string;
    page_type: string;
  }) => {
    try {
      const { id } = await create({
        data: input,
      });
      const comps = await list();
      setCompositions(comps);
      setCreateOpen(false);
      await openComposition(id);
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
    }
  };

  const addBlock = (entry: LibraryEntry) => {
    const config: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(entry.schema ?? {})) {
      if (def.default !== undefined) config[k] = def.default;
    }
    const node: CompositionNode = {
      id: newNodeId(),
      type: entry.type,
      version: entry.version,
      config,
    };
    setTree((t) => appendToRoot(t, node));
    setSelectedId(node.id);
    setDirty(true);
  };

  const moveSelected = (dir: -1 | 1) => {
    if (!selectedId) return;
    const idx = tree.root.children.findIndex((n) => n.id === selectedId);
    if (idx < 0) return;
    setTree((t) => moveRootNode(t, idx, idx + dir));
    setDirty(true);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    setTree((t) => duplicateRootNode(t, selectedId));
    setDirty(true);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setTree((t) => removeNode(t, selectedId));
    setSelectedId(null);
    setDirty(true);
  };

  const updateField = (key: string, value: unknown) => {
    if (!selectedNode) return;
    setTree((t) =>
      updateNodeConfig(t, selectedNode.id, { ...selectedNode.config, [key]: value }),
    );
    setDirty(true);
  };

  const saveDraft = async () => {
    if (!active) return;
    await save({ data: { id: active.id, tree } });
    setDirty(false);
    setStatus("Borrador guardado.");
  };

  const publishRevision = () => {
    if (!active) return;
    setPublishOpen("revision");
  };

  const submitPublishRevision = async (notes: string) => {
    if (!active) return;
    await save({ data: { id: active.id, tree } });
    const { revision_id } = await publish({
      data: { id: active.id, notes: notes || undefined },
    });
    const revs = await listRevs({ data: { id: active.id } });
    setRevisions(revs);
    setDirty(false);
    setPublishOpen(null);
    setStatus(`Revisión publicada (${revision_id.slice(0, 8)}).`);
  };

  const restoreRevision = (rev: CompositionRevisionSummary) => {
    if (!active) return;
    setConfirmState({
      title: `Restaurar revisión #${rev.revision_number}`,
      message:
        "Se cargará esta revisión como borrador actual. Podrás seguir editando y publicar después.",
      confirmLabel: "Restaurar",
      onConfirm: async () => {
        await restore({ data: { id: active.id, revision_id: rev.id } });
        await openComposition(active.id);
        setStatus(`Revisión #${rev.revision_number} restaurada.`);
      },
    });
  };

  const publishPublic = () => {
    if (!active) return;
    if (!isAdmin) {
      setStatus("Solo administradores pueden publicar.");
      return;
    }
    setPublishOpen("public");
  };

  const submitPublishPublic = async (notes: string) => {
    if (!active) return;
    try {
      await save({ data: { id: active.id, tree } });
      const { revision_id } = await publicPublish({
        data: { id: active.id, notes: notes || undefined },
      });
      const comps = await list();
      setCompositions(comps);
      await openComposition(active.id);
      setPublishOpen(null);
      setStatus(`Publicada (rev ${revision_id.slice(0, 8)}).`);
    } catch (e) {
      setStatus(`Error al publicar: ${(e as Error).message}`);
    }
  };

  const unpublishPublic = () => {
    if (!active) return;
    if (!isAdmin) {
      setStatus("Solo administradores pueden despublicar.");
      return;
    }
    setConfirmState({
      title: `Despublicar "${active.title}"`,
      message:
        active.page_type === "home"
          ? "La página volverá al Home legacy. Podrás volver a publicar más tarde."
          : "La versión pública dejará de servirse.",
      confirmLabel: "Despublicar",
      onConfirm: async () => {
        try {
          await publicUnpublish({ data: { id: active.id } });
          const comps = await list();
          setCompositions(comps);
          await openComposition(active.id);
          setStatus("Composición despublicada.");
        } catch (e) {
          setStatus(`Error al despublicar: ${(e as Error).message}`);
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">
            Experience Builder
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Studio v0 · Canvas agnóstico, Layout Engine, Block Registry.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{status}</span>
          {dirty ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-700">
              Sin guardar
            </span>
          ) : null}
        </div>
      </header>

      {!active ? (
        <CompositionsList
          compositions={compositions}
          onOpen={openComposition}
          onCreate={onCreate}
        />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Library panel */}
          <aside className="col-span-12 lg:col-span-3 rounded-lg border border-border bg-card/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Biblioteca</h2>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-xs text-muted-foreground hover:underline"
              >
                ← Lista
              </button>
            </div>
            <input
              type="search"
              placeholder="Buscar bloque…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <div className="mb-3 flex gap-1 text-[10px]">
              {(["all", "static", "smart"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-2 py-0.5 ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <ul className="grid gap-1">
              {filteredLibrary.map((b) => (
                <li key={b.type}>
                  <button
                    type="button"
                    onClick={() => addBlock(b)}
                    className="w-full rounded-md border border-border bg-background px-2 py-2 text-left text-xs hover:bg-accent"
                  >
                    <div className="font-semibold">{b.display_name}</div>
                    <div className="text-[10px] text-muted-foreground">{b.type}</div>
                  </button>
                </li>
              ))}
              {filteredLibrary.length === 0 ? (
                <li className="text-xs text-muted-foreground">Sin bloques.</li>
              ) : null}
            </ul>
          </aside>

          {/* Canvas */}
          <section className="col-span-12 lg:col-span-6 rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Canvas · {active.page_type}
              </div>
              <div className="ml-auto flex gap-1">
                <ToolbarButton onClick={() => moveSelected(-1)} disabled={!selectedId}>
                  ↑
                </ToolbarButton>
                <ToolbarButton onClick={() => moveSelected(1)} disabled={!selectedId}>
                  ↓
                </ToolbarButton>
                <ToolbarButton onClick={duplicateSelected} disabled={!selectedId}>
                  Duplicar
                </ToolbarButton>
                <ToolbarButton onClick={removeSelected} disabled={!selectedId}>
                  Eliminar
                </ToolbarButton>
                <ToolbarButton onClick={saveDraft}>Guardar borrador</ToolbarButton>
                <ToolbarButton onClick={publishRevision}>
                  Crear revisión
                </ToolbarButton>
                {isAdmin ? (
                  <>
                    {active.status === "published" ? (
                      <ToolbarButton onClick={unpublishPublic}>
                        Despublicar
                      </ToolbarButton>
                    ) : (
                      <ToolbarButton onClick={publishPublic}>
                        Publicar
                      </ToolbarButton>
                    )}
                  </>
                ) : null}
              </div>
            </div>
            <div className="rounded-md bg-card/30 p-3">
              <div
                className={`mb-2 text-[11px] uppercase tracking-[0.18em] ${
                  active.status === "published"
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {active.status === "published"
                  ? `Publicada · ${active.page_type} — sirviéndose al público.`
                  : "Internal Draft — esta composición no se sirve al público."}
              </div>
              <div className="flex flex-col gap-3">
                <CompositionRenderer
                  tree={tree}
                  pageType={active.page_type}
                  studio
                  wrap={(node, content) => (
                    <div
                      key={node.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(node.id);
                      }}
                      className={`rounded-md border ${
                        selectedId === node.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent hover:border-border"
                      } p-1 transition-colors`}
                    >
                      {content}
                    </div>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Inspector + revisions */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <h2 className="text-sm font-semibold">Inspector</h2>
              {!selectedNode || !selectedContract ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Selecciona un bloque en el Canvas.
                </p>
              ) : (
                <Inspector
                  node={selectedNode}
                  contract={selectedContract}
                  onChange={updateField}
                />
              )}
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <h2 className="text-sm font-semibold">Historial</h2>
              <ul className="mt-2 grid gap-1 text-xs">
                {revisions.length === 0 ? (
                  <li className="text-muted-foreground">Sin revisiones.</li>
                ) : (
                  revisions.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1"
                    >
                      <span>
                        #{r.revision_number} ·{" "}
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => void restoreRevision(r)}
                        className="text-[10px] text-primary hover:underline"
                      >
                        Restaurar
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
        </div>
      )}

      {createOpen ? (
        <CreateCompositionModal
          onClose={() => setCreateOpen(false)}
          onSubmit={submitCreate}
        />
      ) : null}

      {publishOpen ? (
        <NotesModal
          title={
            publishOpen === "public"
              ? `Publicar "${active?.title ?? ""}"`
              : "Crear revisión"
          }
          description={
            publishOpen === "public"
              ? `Reemplazará la versión pública actual del tipo "${active?.page_type ?? ""}".`
              : "Guarda un snapshot del borrador como nueva revisión interna."
          }
          confirmLabel={publishOpen === "public" ? "Publicar" : "Crear revisión"}
          onClose={() => setPublishOpen(null)}
          onSubmit={
            publishOpen === "public" ? submitPublishPublic : submitPublishRevision
          }
        />
      ) : null}

      {confirmState ? (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          onClose={() => setConfirmState(null)}
          onConfirm={async () => {
            await confirmState.onConfirm();
            setConfirmState(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CompositionsList({
  compositions,
  onOpen,
  onCreate,
}: {
  compositions: CompositionSummary[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Composiciones</h2>
        <button
          type="button"
          onClick={onCreate}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
        >
          Nueva composición
        </button>
      </div>
      {compositions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aún no hay composiciones. Crea la primera para empezar.
        </p>
      ) : (
        <>
        <p className="mb-2 text-xs text-muted-foreground">
          Toca una composición para abrirla y editarla.
        </p>
        <ul className="grid gap-2">
          {compositions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpen(c.id)}
                className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <div>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.slug} · {c.page_type} · {c.status}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.updated_at).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:underline"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateCompositionModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: { slug: string; title: string; page_type: string }) => void | Promise<void>;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [pageType, setPageType] = useState("generic");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug.trim()) return;
    setBusy(true);
    try {
      await onSubmit({
        slug: slug.trim(),
        title: title.trim() || slug.trim(),
        page_type: pageType,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Nueva composición" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1 text-xs">
          <span className="font-semibold">Slug interno (único)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="home, landing-verano, etc."
            required
            className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-semibold">Título editorial</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Home"
            className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs">
          <span className="font-semibold">Tipo de página</span>
          <select
            value={pageType}
            onChange={(e) => setPageType(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          >
            {PAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !slug.trim()}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Creando…" : "Crear"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function NotesModal({
  title,
  description,
  confirmLabel,
  onClose,
  onSubmit,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onSubmit: (notes: string) => void | Promise<void>;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(notes);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <p className="text-xs text-muted-foreground">{description}</p>
        <label className="grid gap-1 text-xs">
          <span className="font-semibold">Notas (opcional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Procesando…" : confirmLabel ?? "Confirmar"}
        </button>
      </div>
    </ModalShell>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Inspector({
  node,
  contract,
  onChange,
}: {
  node: CompositionNode;
  contract: LibraryEntry;
  onChange: (key: string, value: unknown) => void;
}) {
  const fields = Object.entries(contract.schema ?? {});
  return (
    <div className="mt-2">
      <div className="mb-3">
        <div className="text-xs font-semibold">{contract.display_name}</div>
        <div className="text-[10px] text-muted-foreground">{contract.type}</div>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Este bloque no expone campos configurables.
        </p>
      ) : (
        <div className="grid gap-3">
          {fields.map(([key, def]) => (
            <Field
              key={key}
              name={key}
              def={def}
              value={node.config[key]}
              onChange={(v) => onChange(key, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      {def.label ?? name}
      {def.required ? " *" : ""}
    </label>
  );

  switch (def.type) {
    case "select":
      return (
        <div className="grid gap-1">
          {label}
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">—</option>
            {(def.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {def.label ?? name}
        </label>
      );
    case "number":
      return (
        <div className="grid gap-1">
          {label}
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? undefined : Number(e.target.value))
            }
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      );
    case "rich_text":
      return (
        <div className="grid gap-1">
          {label}
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      );
    case "media":
    case "reference":
    case "url":
    case "color":
    case "text":
    default:
      return (
        <div className="grid gap-1">
          {label}
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      );
  }
}