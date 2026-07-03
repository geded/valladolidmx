/**
 * Experience Builder · Panel de Páginas (US-R2)
 *
 * Implementa el contrato consolidado R2.1–R2.24 del Reconciliation
 * Report. Vive dentro de `/cms/experience-builder`, reemplaza al
 * selector plano previo del Studio y NO crea nuevas rutas, editores
 * o registries — reutiliza `page-kind-registry`, `studio.functions`
 * y la Block Library existente.
 *
 * Alcance de esta historia (H-3 diferido a US-R3):
 *  - Sólo permite **modificar la Dirección Web** (slug). La lógica
 *    editorial asociada (redirect 301, canonical, sitemap, SEO,
 *    invalidación de caché) queda para US-R3.
 *
 * Alcance NO cubierto (por diseño, ver §3 del Reconciliation):
 *  - Creación real desde plantilla (US-R4). R2.13 sólo marca la flag.
 *  - Biblioteca consolidada por `allowedKinds` (US-R5).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  listStudioPages,
  createComposition,
  duplicateComposition,
  renameComposition,
  updateCompositionSlug,
  archiveComposition,
  unarchiveComposition,
  deleteComposition,
  markCompositionAsTemplate,
  type StudioPageRow,
} from "@/lib/experience-builder/studio.functions";
import {
  PAGE_KIND_REGISTRY,
  getPageKindDefinition,
  type PageKind,
  type PageKindDefinition,
} from "@/lib/experience-builder/page-kind-registry";
import { useAuth } from "@/hooks/useAuth";

/* -------------------------------------------------------------------- */
/* Utilidades locales                                                    */
/* -------------------------------------------------------------------- */

type StatusFilter = "all" | "draft" | "published" | "scheduled" | "archived";
type WorkflowFilter = "all" | "draft" | "in_review" | "approved";
type OwnershipFilter = "all" | "mine";

function slugify(v: string): string {
  return v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicPathFromKind(def: PageKindDefinition | undefined, slug: string): string {
  if (!def) return `/p/${slug}`;
  return def.publicRoutePattern.replace("{slug}", slug) || `/${slug}`;
}

function formatRelativeShort(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "hace un momento";
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.round(hr / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function derivedStatus(row: StudioPageRow): StatusFilter {
  if (row.status === "archived") return "archived";
  if (row.scheduled_publish_at) return "scheduled";
  if (row.status === "published") return "published";
  return "draft";
}

function statusLabel(s: StatusFilter): string {
  switch (s) {
    case "published":
      return "Publicada";
    case "scheduled":
      return "Programada";
    case "archived":
      return "Archivada";
    case "draft":
      return "Borrador";
    default:
      return "Todas";
  }
}

function statusChipClass(s: StatusFilter): string {
  switch (s) {
    case "published":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "scheduled":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "archived":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30";
  }
}

function workflowLabel(w: StudioPageRow["workflow_state"]): string {
  return w === "in_review" ? "En revisión" : w === "approved" ? "Aprobada" : "Draft";
}

/* -------------------------------------------------------------------- */
/* Props                                                                 */
/* -------------------------------------------------------------------- */

export interface PagesPanelProps {
  /**
   * Abre una página del Panel dentro del canvas del Studio. Recibe
   * la fila completa para que el shell pueda registrar la página en
   * su lista interna (comportamiento actual de `PagesPicker`).
   */
  onOpenPage: (page: {
    key: string;
    slug: string;
    title: string;
    description: string;
    page_type: string;
    publicPath: string;
    custom?: boolean;
  }) => void;
  /** Slugs "sistema" que ya publica el sitio (Home, Marketplace, etc.). */
  seedPages?: Array<{
    slug: string;
    title: string;
    description: string;
    page_type: string;
    publicPath: string;
    kind?: PageKind;
  }>;
}

/* -------------------------------------------------------------------- */
/* Componente principal                                                  */
/* -------------------------------------------------------------------- */

export function PagesPanel({ onOpenPage, seedPages = [] }: PagesPanelProps) {
  const { roles, user } = useAuth();
  const canDelete = roles.includes("admin") || roles.includes("super_admin");

  const list = useServerFn(listStudioPages);
  const create = useServerFn(createComposition);
  const dupe = useServerFn(duplicateComposition);
  const rename = useServerFn(renameComposition);
  const updSlug = useServerFn(updateCompositionSlug);
  const archive = useServerFn(archiveComposition);
  const unarchive = useServerFn(unarchiveComposition);
  const del = useServerFn(deleteComposition);
  const markTpl = useServerFn(markCompositionAsTemplate);

  const [rows, setRows] = useState<StudioPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<PageKind | "all">("all");
  const [workflowFilter, setWorkflowFilter] = useState<WorkflowFilter>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<
    | null
    | { mode: "rename" | "slug"; row: StudioPageRow; value: string }
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<StudioPageRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = async () => {
    try {
      const res = await list();
      setRows(res);
    } catch (e) {
      toast.error(`No se pudieron cargar las páginas: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cierra menú contextual al hacer click fuera.
  useEffect(() => {
    if (!activeMenu) return;
    const h = () => setActiveMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [activeMenu]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && derivedStatus(r) !== statusFilter) return false;
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (workflowFilter !== "all" && r.workflow_state !== workflowFilter) return false;
      if (ownershipFilter === "mine" && r.updated_by !== user?.id) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, kindFilter, workflowFilter, ownershipFilter, query, user?.id]);

  // Agrupación por kind (R2.7). Mantiene el orden del registry.
  const groups = useMemo(() => {
    const byKind = new Map<PageKind, StudioPageRow[]>();
    for (const r of filteredRows) {
      const list = byKind.get(r.kind) ?? [];
      list.push(r);
      byKind.set(r.kind, list);
    }
    return PAGE_KIND_REGISTRY.map((def) => ({
      def,
      rows: byKind.get(def.kind) ?? [],
    }));
  }, [filteredRows]);

  const isGroupOpen = (k: PageKind): boolean => openGroups[k] ?? true;
  const toggleGroup = (k: PageKind) =>
    setOpenGroups((prev) => ({ ...prev, [k]: !(prev[k] ?? true) }));

  const handleOpen = (r: StudioPageRow) => {
    const def = getPageKindDefinition(r.kind);
    onOpenPage({
      key: r.slug,
      slug: r.slug,
      title: r.title,
      description: r.description ?? "",
      page_type: r.page_type,
      publicPath: publicPathFromKind(def, r.slug),
      custom: true,
    });
  };

  const doAction = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(ok);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const onDuplicate = (r: StudioPageRow) => {
    const suggested = `${r.slug}-copia`;
    void doAction(
      r.id,
      () => dupe({ data: { id: r.id, new_slug: suggested, new_title: null } }),
      "Página duplicada.",
    );
  };

  const onArchive = (r: StudioPageRow) =>
    void doAction(r.id, () => archive({ data: { id: r.id } }), "Página archivada.");
  const onUnarchive = (r: StudioPageRow) =>
    void doAction(
      r.id,
      () => unarchive({ data: { id: r.id } }),
      "Página restaurada al borrador.",
    );
  const onMarkTemplate = (r: StudioPageRow) =>
    void doAction(
      r.id,
      () =>
        markTpl({
          data: { id: r.id, is_template: !r.is_template, template_of_kind: r.kind },
        }),
      r.is_template ? "Marca de plantilla retirada." : "Guardada como plantilla oficial.",
    );

  const submitInlineEdit = async () => {
    if (!inlineEdit) return;
    const { row, mode, value } = inlineEdit;
    setBusyId(row.id);
    try {
      if (mode === "rename") {
        await rename({ data: { id: row.id, new_title: value } });
        toast.success("Nombre actualizado.");
      } else {
        const clean = slugify(value);
        if (!clean) throw new Error("La dirección web no puede quedar vacía.");
        await updSlug({ data: { id: row.id, new_slug: clean } });
        toast.success(
          "Dirección web actualizada. El redirect editorial se aplicará en US-R3.",
        );
      }
      setInlineEdit(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const submitDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.id);
    try {
      await del({ data: { id: confirmDelete.id } });
      toast.success("Página eliminada.");
      setConfirmDelete(null);
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4">
      {/* Topbar */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
            Panel de Páginas
          </p>
          <h2 className="mt-1 text-lg font-semibold sm:text-xl">Mis páginas</h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Todas las páginas del sitio, agrupadas por tipo. Selecciona una para
            editarla dentro del Studio, sin salir del canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium hover:bg-accent"
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Plus className="size-3.5" aria-hidden /> Nueva página
          </button>
        </div>
      </header>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <label className="relative flex min-w-[220px] flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, dirección web…"
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          aria-label="Filtrar por estado"
        >
          <option value="all">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="published">Publicada</option>
          <option value="scheduled">Programada</option>
          <option value="archived">Archivada</option>
        </select>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as PageKind | "all")}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          aria-label="Filtrar por tipo de página"
        >
          <option value="all">Todos los tipos</option>
          {PAGE_KIND_REGISTRY.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <select
          value={workflowFilter}
          onChange={(e) => setWorkflowFilter(e.target.value as WorkflowFilter)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          aria-label="Filtrar por workflow"
        >
          <option value="all">Todos los workflows</option>
          <option value="draft">Draft</option>
          <option value="in_review">En revisión</option>
          <option value="approved">Aprobada</option>
        </select>
        <select
          value={ownershipFilter}
          onChange={(e) => setOwnershipFilter(e.target.value as OwnershipFilter)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          aria-label="Filtrar por autoría"
        >
          <option value="all">Todas</option>
          <option value="mine">Sólo mías</option>
        </select>
      </div>

      {/* Lista agrupada */}
      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando páginas…
        </div>
      ) : filteredRows.length === 0 && seedPages.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3">
          {groups
            .filter((g) => g.rows.length > 0)
            .map((group) => (
              <GroupBlock
                key={group.def.kind}
                def={group.def}
                rows={group.rows}
                open={isGroupOpen(group.def.kind)}
                onToggle={() => toggleGroup(group.def.kind)}
                onOpenRow={handleOpen}
                onAction={(action, row) => {
                  setActiveMenu(null);
                  switch (action) {
                    case "open":
                      return handleOpen(row);
                    case "duplicate":
                      return onDuplicate(row);
                    case "rename":
                      return setInlineEdit({ mode: "rename", row, value: row.title });
                    case "slug":
                      return setInlineEdit({ mode: "slug", row, value: row.slug });
                    case "archive":
                      return onArchive(row);
                    case "unarchive":
                      return onUnarchive(row);
                    case "delete":
                      return canDelete
                        ? setConfirmDelete(row)
                        : toast.error("Sólo administradores pueden eliminar.");
                    case "template":
                      return canDelete
                        ? onMarkTemplate(row)
                        : toast.error("Sólo administradores pueden gestionar plantillas.");
                    default:
                      return;
                  }
                }}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                busyId={busyId}
                canDelete={canDelete}
              />
            ))}
        </div>
      )}

      {showCreate ? (
        <CreatePageDialog
          onCancel={() => setShowCreate(false)}
          onSubmit={async (form) => {
            try {
              const clean = slugify(form.slug);
              if (!clean) throw new Error("La dirección web no puede quedar vacía.");
              if (rows.some((r) => r.slug === clean)) {
                throw new Error(`Ya existe una página con la dirección "${clean}".`);
              }
              await create({
                data: {
                  slug: clean,
                  title: form.title.trim() || clean,
                  description: form.description.trim() || undefined,
                  page_type: form.kind,
                },
              });
              toast.success("Página creada.");
              setShowCreate(false);
              await reload();
              const def = getPageKindDefinition(form.kind);
              onOpenPage({
                key: clean,
                slug: clean,
                title: form.title.trim() || clean,
                description: form.description.trim() || "",
                page_type: form.kind,
                publicPath: publicPathFromKind(def, clean),
                custom: true,
              });
            } catch (e) {
              throw e instanceof Error ? e : new Error(String(e));
            }
          }}
        />
      ) : null}

      {inlineEdit ? (
        <SimpleTextDialog
          title={inlineEdit.mode === "rename" ? "Renombrar página" : "Cambiar dirección web"}
          label={inlineEdit.mode === "rename" ? "Nuevo nombre" : "Nueva dirección"}
          value={inlineEdit.value}
          onChange={(v) =>
            setInlineEdit((prev) => (prev ? { ...prev, value: v } : prev))
          }
          hint={
            inlineEdit.mode === "slug"
              ? "Sólo minúsculas, números y guiones. En US-R3 se activarán redirects 301 y actualización de canonical/sitemap."
              : undefined
          }
          onCancel={() => setInlineEdit(null)}
          onSubmit={submitInlineEdit}
          busy={busyId === inlineEdit.row.id}
        />
      ) : null}

      {confirmDelete ? (
        <ConfirmDeleteDialog
          row={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={submitDelete}
          busy={busyId === confirmDelete.id}
        />
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Subcomponentes                                                        */
/* -------------------------------------------------------------------- */

type RowAction =
  | "open"
  | "duplicate"
  | "rename"
  | "slug"
  | "archive"
  | "unarchive"
  | "delete"
  | "template";

function GroupBlock({
  def,
  rows,
  open,
  onToggle,
  onOpenRow,
  onAction,
  activeMenu,
  setActiveMenu,
  busyId,
  canDelete,
}: {
  def: PageKindDefinition;
  rows: StudioPageRow[];
  open: boolean;
  onToggle: () => void;
  onOpenRow: (r: StudioPageRow) => void;
  onAction: (a: RowAction, r: StudioPageRow) => void;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  busyId: string | null;
  canDelete: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2 text-left hover:bg-muted/50"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />
          )}
          <Layers className="size-3.5 text-primary" aria-hidden />
          <h3 className="truncate text-sm font-semibold">{def.label}</h3>
          <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {rows.length}
          </span>
          {def.singleton ? (
            <span className="rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
              Única
            </span>
          ) : null}
        </div>
      </button>
      {open ? (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <PageRow
              key={r.id}
              row={r}
              def={def}
              onOpen={() => onOpenRow(r)}
              onAction={onAction}
              menuOpen={activeMenu === r.id}
              toggleMenu={(e) => {
                e.stopPropagation();
                setActiveMenu(activeMenu === r.id ? null : r.id);
              }}
              busy={busyId === r.id}
              canDelete={canDelete}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function PageRow({
  row,
  def,
  onOpen,
  onAction,
  menuOpen,
  toggleMenu,
  busy,
  canDelete,
}: {
  row: StudioPageRow;
  def: PageKindDefinition;
  onOpen: () => void;
  onAction: (a: RowAction, r: StudioPageRow) => void;
  menuOpen: boolean;
  toggleMenu: (e: React.MouseEvent) => void;
  busy: boolean;
  canDelete: boolean;
}) {
  const status = derivedStatus(row);
  const publicPath = publicPathFromKind(def, row.slug);
  const archived = row.status === "archived";

  const onKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      onOpen();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onAction(archived ? "unarchive" : "archive", row);
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
      e.preventDefault();
      onAction("duplicate", row);
    }
  };

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className="group relative flex flex-col gap-1 px-3 py-2 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/60 sm:flex-row sm:items-center sm:gap-3"
      aria-label={`Abrir ${row.title}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <FileText className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-semibold">{row.title}</span>
          {row.is_template ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              <Star className="size-2.5" aria-hidden /> Plantilla
            </span>
          ) : null}
          {row.editing_lock ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title={`Editando: ${row.editing_lock.user_name}`}
            >
              <Lock className="size-2.5" aria-hidden />
              {row.editing_lock.user_name || "Bloqueada"}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] hover:bg-accent"
          >
            {publicPath}
            <ExternalLink className="size-2.5" aria-hidden />
          </a>
          <span className="opacity-60">·</span>
          <span>
            {row.author_name || "Sistema"} · {formatRelativeShort(row.updated_at)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${statusChipClass(status)}`}
        >
          {statusLabel(status)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <GitBranch className="size-2.5" aria-hidden />
          {workflowLabel(row.workflow_state)}
        </span>
        {row.has_unpublished_changes && row.status !== "archived" ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-blue-400/40 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300"
            title="Cambios sin publicar"
          >
            <Pencil className="size-2.5" aria-hidden /> Cambios
          </span>
        ) : null}
        {row.scheduled_publish_at ? (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
            title={`Publicación programada: ${new Date(row.scheduled_publish_at).toLocaleString("es-MX")}`}
          >
            <CalendarClock className="size-2.5" aria-hidden />
            {new Date(row.scheduled_publish_at).toLocaleString("es-MX", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
        <div className="relative">
          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Más acciones"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MoreHorizontal className="size-3.5" aria-hidden />
            )}
          </button>
          {menuOpen ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-border bg-popover p-1 text-xs shadow-lg"
            >
              <MenuItem icon={Eye} label="Abrir" onClick={() => onAction("open", row)} />
              <MenuItem
                icon={Copy}
                label="Duplicar"
                shortcut="⌘D"
                onClick={() => onAction("duplicate", row)}
              />
              <MenuItem
                icon={Pencil}
                label="Renombrar"
                onClick={() => onAction("rename", row)}
              />
              <MenuItem
                icon={ExternalLink}
                label="Cambiar dirección web"
                onClick={() => onAction("slug", row)}
              />
              <MenuItem
                icon={Star}
                label={row.is_template ? "Quitar de plantillas" : "Guardar como plantilla"}
                onClick={() => onAction("template", row)}
                disabled={!canDelete}
              />
              <div className="my-1 border-t border-border" />
              {archived ? (
                <MenuItem
                  icon={ArchiveRestore}
                  label="Restaurar"
                  onClick={() => onAction("unarchive", row)}
                />
              ) : (
                <MenuItem
                  icon={Archive}
                  label="Archivar"
                  shortcut="Del"
                  onClick={() => onAction("archive", row)}
                />
              )}
              <MenuItem
                icon={Trash2}
                label="Eliminar…"
                danger
                onClick={() => onAction("delete", row)}
                disabled={!canDelete}
              />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
  shortcut,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
  shortcut?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left disabled:opacity-40 ${
        danger ? "text-destructive hover:bg-destructive/10" : "hover:bg-accent"
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="flex-1">{label}</span>
      {shortcut ? (
        <span className="text-[10px] text-muted-foreground">{shortcut}</span>
      ) : null}
    </button>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
      <Layers className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h3 className="mt-2 text-sm font-semibold">Aún no hay páginas</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Crea una nueva página desde una plantilla oficial para empezar.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
      >
        <Plus className="size-3.5" aria-hidden /> Nueva página
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Diálogos                                                              */
/* -------------------------------------------------------------------- */

function CreatePageDialog({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (form: {
    kind: PageKind;
    title: string;
    slug: string;
    description: string;
  }) => Promise<void>;
}) {
  const { roles } = useAuth();
  const allowedKinds = PAGE_KIND_REGISTRY.filter((k) =>
    k.requiredRoles.some((r) => roles.includes(r)),
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<PageKind>(allowedKinds[0]?.kind ?? "custom");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const slugTouched = useRef(false);
  const def = getPageKindDefinition(kind);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onSubmit({ kind, title, slug, description: desc });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
              Nueva página · Paso {step} de 2
            </p>
            <h3 className="text-sm font-semibold">
              {step === 1 ? "Elige el tipo de página" : "Detalles de la página"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {step === 1 ? (
          <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {allowedKinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => {
                  setKind(k.kind);
                  setStep(2);
                }}
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                  kind === k.kind ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="text-sm font-semibold">{k.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{k.description}</div>
                <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {k.slugPattern}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[11px]">
              Tipo: <strong>{def?.label ?? kind}</strong>{" "}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="ml-1 text-primary underline"
              >
                cambiar
              </button>
            </div>
            <label className="block text-xs font-medium">
              Nombre
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched.current) setSlug(slugify(e.target.value));
                }}
                required
                autoFocus
                className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                placeholder="Ej. Campaña Verano 2026"
              />
            </label>
            <label className="block text-xs font-medium">
              Dirección web
              <div className="mt-1 flex items-center gap-1">
                <span className="rounded-md bg-muted px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {def?.slugPattern.replace("{slug}", "") || "/"}
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    slugTouched.current = true;
                    setSlug(slugify(e.target.value));
                  }}
                  required={!def?.singleton}
                  disabled={def?.singleton}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm disabled:opacity-60"
                  placeholder={def?.singleton ? "(automático)" : "identificador"}
                />
              </div>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                Sólo minúsculas, números y guiones.
              </span>
            </label>
            <label className="block text-xs font-medium">
              Descripción (opcional)
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="mt-1 min-h-[70px] w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            {err ? <p className="text-xs text-destructive">{err}</p> : null}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Atrás
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-3.5" aria-hidden />
                )}
                Crear y abrir
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SimpleTextDialog({
  title,
  label,
  value,
  onChange,
  hint,
  onCancel,
  onSubmit,
  busy,
}: {
  title: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  onCancel: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="block text-xs font-medium">
            {label}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
              required
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
          {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
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
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({
  row,
  onCancel,
  onConfirm,
  busy,
}: {
  row: StudioPageRow;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState("");
  const required = row.slug;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-destructive/40 bg-card p-4 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-destructive">Eliminar página</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Vas a eliminar <strong>{row.title}</strong> ({row.slug}) y todas sus revisiones.
          Esta acción es irreversible.
        </p>
        <label className="mt-2 block text-xs font-medium">
          Escribe <code className="font-mono">{required}</code> para confirmar:
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
          />
        </label>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={text !== required || busy}
            className="inline-flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-95 disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : (
              <Trash2 className="size-3.5" aria-hidden />
            )}
            Eliminar definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}