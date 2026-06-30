/**
 * /_authenticated/cms/experience-builder/pages
 *
 * Studio editorial sobre el modelo `eb_*` (Etapa 15.10.4b · Fase 2).
 *
 * Principios respetados:
 *  - Renderer único: Studio, Preview y Producción usan el MISMO
 *    CompositionRenderer.
 *  - Auto-Inspector generado desde Block Contract.
 *  - Variables Dinámicas con whitelist segura.
 *  - surface_type (kind) tratado como metadato — el editor no se
 *    especializa por tipo de página.
 *  - Toda escritura pasa por server functions + RPCs SECURITY DEFINER.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ebListPages,
  ebGetPage,
  ebUpsertPage,
  ebSavePageVersion,
  ebListPageVersions,
  ebRestorePageVersion,
  ebPublishPage,
  ebUnpublishPage,
  ebListThemes,
  ebIssuePreviewToken,
  type EbPageSummary,
  type EbPageDetail,
  type EbVersionSummary,
  type EbThemeSummary,
} from "@/lib/experience-builder/eb-studio.functions";
import { listBlockLibrary } from "@/lib/experience-builder/experience-builder.functions";
import {
  appendToRoot,
  duplicateRootNode,
  moveRootNode,
  newNodeId,
  removeNode,
  updateNodeConfig,
  EMPTY_TREE,
  type CompositionNode,
  type CompositionTree,
} from "@/lib/experience-builder/composition-tree";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import { buildDemoContext } from "@/lib/experience-builder/dynamic-variables";
import { getBlock } from "@/lib/experience-builder/block-registry";
import { AutoInspector } from "@/components/experience-builder/AutoInspector";
import type { BlockContract } from "@/lib/experience-builder/block-contract";

export const Route = createFileRoute("/_authenticated/cms/experience-builder/pages")({
  head: () => ({
    meta: [
      { title: "Experience Builder · Pages Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PagesStudio,
});

type Breakpoint = "desktop" | "tablet" | "mobile";
const BP_WIDTH: Record<Breakpoint, string> = {
  desktop: "w-full",
  tablet: "w-[768px]",
  mobile: "w-[390px]",
};

interface LibraryEntry {
  type: string;
  category: string;
  display_name: string;
  description: string | null;
  version: string;
}

const FAV_KEY = "eb:favorites";
const RECENT_KEY = "eb:recents";

function readSet(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}
function writeSet(key: string, v: string[]) { localStorage.setItem(key, JSON.stringify(v)); }

function PagesStudio() {
  const listPagesFn = useServerFn(ebListPages);
  const getPageFn = useServerFn(ebGetPage);
  const upsertPageFn = useServerFn(ebUpsertPage);
  const saveVersionFn = useServerFn(ebSavePageVersion);
  const listVersionsFn = useServerFn(ebListPageVersions);
  const restoreVersionFn = useServerFn(ebRestorePageVersion);
  const publishFn = useServerFn(ebPublishPage);
  const unpublishFn = useServerFn(ebUnpublishPage);
  const listThemesFn = useServerFn(ebListThemes);
  const issueTokenFn = useServerFn(ebIssuePreviewToken);
  const listLibFn = useServerFn(listBlockLibrary);

  const [pages, setPages] = useState<EbPageSummary[]>([]);
  const [active, setActive] = useState<EbPageDetail | null>(null);
  const [tree, setTree] = useState<CompositionTree>(EMPTY_TREE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<EbVersionSummary[]>([]);
  const [themes, setThemes] = useState<EbThemeSummary[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "static" | "smart" | "fav" | "recent">("all");
  const [bp, setBp] = useState<Breakpoint>("desktop");
  const [status, setStatus] = useState("Listo.");
  const [dirty, setDirty] = useState(false);

  const demoCtx = useMemo(() => buildDemoContext(), []);

  useEffect(() => {
    void (async () => {
      try {
        const [ps, ts, lib] = await Promise.all([listPagesFn(), listThemesFn(), listLibFn()]);
        setPages(ps);
        setThemes(ts);
        setLibrary(lib as unknown as LibraryEntry[]);
        setFavorites(readSet(FAV_KEY));
        setRecents(readSet(RECENT_KEY));
      } catch (e) {
        setStatus(`Error: ${(e as Error).message}`);
      }
    })();
  }, [listPagesFn, listThemesFn, listLibFn]);

  // Autosave borrador (debounce 1s) — guarda el tree en eb_pages.tree
  useEffect(() => {
    if (!active || !dirty) return;
    const t = setTimeout(() => {
      void upsertPageFn({
        data: {
          id: active.id, slug: active.slug, name: active.name,
          kind: active.kind, scope: active.scope, tenant_id: active.tenant_id,
          theme_id: active.theme_id, tree,
        },
      })
        .then(() => { setDirty(false); setStatus("Borrador guardado."); })
        .catch((e) => setStatus(`Error al guardar: ${e.message}`));
    }, 1000);
    return () => clearTimeout(t);
  }, [tree, dirty, active, upsertPageFn]);

  const selectedNode = useMemo(
    () => (selectedId ? findInTree(tree, selectedId) : null),
    [tree, selectedId],
  );
  const selectedContract: BlockContract | null = useMemo(
    () => (selectedNode ? getBlock(selectedNode.type) ?? null : null),
    [selectedNode],
  );

  const filteredLib = useMemo(() => {
    return library.filter((b) => {
      if (filter === "fav" && !favorites.includes(b.type)) return false;
      if (filter === "recent" && !recents.includes(b.type)) return false;
      if ((filter === "static" || filter === "smart") && b.category !== filter) return false;
      if (search && !`${b.display_name} ${b.type} ${b.description ?? ""}`.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [library, filter, favorites, recents, search]);

  const openPage = async (id: string) => {
    const detail = await getPageFn({ data: { id } });
    if (!detail) { setStatus("No encontrada."); return; }
    setActive(detail);
    setTree(detail.tree ?? EMPTY_TREE);
    setSelectedId(null);
    setDirty(false);
    const vs = await listVersionsFn({ data: { page_id: id } });
    setVersions(vs);
    setStatus("Cargada.");
  };

  const onCreate = async () => {
    const slug = window.prompt("Slug interno (único)"); if (!slug) return;
    const name = window.prompt("Nombre editorial", slug) ?? slug;
    const kind = (window.prompt("Tipo (landing/institutional/campaign/site_section)", "landing") ?? "landing") as EbPageDetail["kind"];
    try {
      const { id } = await upsertPageFn({ data: { slug, name, kind, scope: "global" } });
      setPages(await listPagesFn());
      await openPage(id);
    } catch (e) { setStatus(`Error: ${(e as Error).message}`); }
  };

  const touchRecent = (type: string) => {
    const next = [type, ...recents.filter((t) => t !== type)].slice(0, 10);
    setRecents(next); writeSet(RECENT_KEY, next);
  };
  const toggleFav = (type: string) => {
    const next = favorites.includes(type) ? favorites.filter((t) => t !== type) : [...favorites, type];
    setFavorites(next); writeSet(FAV_KEY, next);
  };

  const addBlock = (entry: LibraryEntry) => {
    const contract = getBlock(entry.type);
    const config: Record<string, unknown> = {};
    if (contract) for (const [k, d] of Object.entries(contract.schema)) if (d.default !== undefined) config[k] = d.default;
    const node: CompositionNode = { id: newNodeId(), type: entry.type, version: entry.version, config };
    setTree((t) => appendToRoot(t, node));
    setSelectedId(node.id);
    touchRecent(entry.type);
    setDirty(true);
  };

  const updateField = (next: Record<string, unknown>) => {
    if (!selectedNode) return;
    setTree((t) => updateNodeConfig(t, selectedNode.id, next));
    setDirty(true);
  };

  const move = (dir: -1 | 1) => {
    if (!selectedId) return;
    const idx = tree.root.children.findIndex((n) => n.id === selectedId);
    if (idx < 0) return;
    setTree((t) => moveRootNode(t, idx, idx + dir)); setDirty(true);
  };

  const onSaveVersion = async () => {
    if (!active) return;
    const note = window.prompt("Nota de versión (opcional)", "") ?? "";
    await upsertPageFn({ data: { id: active.id, slug: active.slug, name: active.name, kind: active.kind, scope: active.scope, tenant_id: active.tenant_id, theme_id: active.theme_id, tree } });
    await saveVersionFn({ data: { page_id: active.id, note } });
    setVersions(await listVersionsFn({ data: { page_id: active.id } }));
    setDirty(false);
    setStatus("Versión guardada.");
  };

  const onRestore = async (v: EbVersionSummary) => {
    if (!active) return;
    if (!window.confirm(`Restaurar versión del ${new Date(v.created_at).toLocaleString()}?`)) return;
    await restoreVersionFn({ data: { page_id: active.id, version_id: v.id } });
    await openPage(active.id);
    setStatus("Versión restaurada.");
  };

  const onPublish = async () => {
    if (!active) return;
    const note = window.prompt(`Publicar "${active.name}". Nota (opcional):`, "");
    if (note === null) return;
    await upsertPageFn({ data: { id: active.id, slug: active.slug, name: active.name, kind: active.kind, scope: active.scope, tenant_id: active.tenant_id, theme_id: active.theme_id, tree } });
    await publishFn({ data: { page_id: active.id, note } });
    setPages(await listPagesFn());
    await openPage(active.id);
    setStatus("Publicada.");
  };

  const onUnpublish = async () => {
    if (!active) return;
    if (!window.confirm("Despublicar esta página?")) return;
    await unpublishFn({ data: { page_id: active.id } });
    setPages(await listPagesFn());
    await openPage(active.id);
  };

  const onPreviewTab = async () => {
    if (!active) return;
    await upsertPageFn({ data: { id: active.id, slug: active.slug, name: active.name, kind: active.kind, scope: active.scope, tenant_id: active.tenant_id, theme_id: active.theme_id, tree } });
    const { token } = await issueTokenFn({ data: { page_id: active.id, ttl_minutes: 60 } });
    window.open(`/preview/${token}`, "_blank", "noopener");
  };

  const onChangeTheme = async (themeId: string) => {
    if (!active) return;
    await upsertPageFn({ data: { id: active.id, slug: active.slug, name: active.name, kind: active.kind, scope: active.scope, tenant_id: active.tenant_id, theme_id: themeId || null, tree } });
    await openPage(active.id);
  };

  const activeTheme = themes.find((t) => t.id === active?.theme_id) ?? null;
  const themeStyle = useMemo(() => buildThemeStyle(activeTheme?.tokens), [activeTheme]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Experience Builder · Pages</h1>
          <p className="text-xs text-muted-foreground">15.10.4b Fase 2 · Motor universal de composición</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{status}</span>
          {dirty ? <Badge variant="secondary">Sin guardar</Badge> : null}
        </div>
      </header>

      {!active ? (
        <PagesList pages={pages} onOpen={openPage} onCreate={onCreate} />
      ) : (
        <div className="grid grid-cols-12 gap-4">
          {/* Library */}
          <aside className="col-span-12 lg:col-span-3 rounded-lg border border-border bg-card/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Biblioteca</h2>
              <Button size="sm" variant="ghost" onClick={() => setActive(null)}>← Pages</Button>
            </div>
            <input
              type="search" placeholder="Buscar bloque…" value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
            />
            <div className="mb-2 flex flex-wrap gap-1 text-[10px]">
              {(["all", "static", "smart", "fav", "recent"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)}
                  className={`rounded-full px-2 py-0.5 ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {f}
                </button>
              ))}
            </div>
            <ul className="grid gap-1 max-h-[60vh] overflow-y-auto pr-1">
              {filteredLib.map((b) => {
                const c = getBlock(b.type);
                const bps = c?.responsive?.breakpoints ?? [];
                return (
                  <li key={b.type}>
                    <div className="rounded-md border border-border bg-background px-2 py-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" onClick={() => addBlock(b)} className="flex-1 text-left hover:underline">
                          <div className="font-semibold">{b.display_name}</div>
                          <div className="text-[10px] text-muted-foreground">{b.type}</div>
                          {b.description ? <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{b.description}</div> : null}
                        </button>
                        <button type="button" onClick={() => toggleFav(b.type)} title="Favorito"
                          className={`text-base leading-none ${favorites.includes(b.type) ? "text-amber-500" : "text-muted-foreground"}`}>★</button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[9px]">{b.category}</Badge>
                        {bps.length > 0 ? <Badge variant="outline" className="text-[9px]">{bps.map((x) => x[0].toUpperCase()).join("/")}</Badge> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
              {filteredLib.length === 0 ? <li className="text-xs text-muted-foreground">Sin bloques.</li> : null}
            </ul>
          </aside>

          {/* Canvas + topbar */}
          <section className="col-span-12 lg:col-span-6 rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{active.kind}</Badge>
              <Badge variant="outline" className="text-[10px]">{active.scope}</Badge>
              <Badge variant={active.status === "published" ? "default" : "secondary"} className="text-[10px]">{active.status}</Badge>
              <div className="ml-auto flex items-center gap-1">
                {(["desktop", "tablet", "mobile"] as Breakpoint[]).map((b) => (
                  <button key={b} type="button" onClick={() => setBp(b)}
                    className={`rounded px-2 py-1 text-[10px] ${bp === b ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 pb-2">
              <Button size="sm" variant="outline" onClick={() => move(-1)} disabled={!selectedId}>↑</Button>
              <Button size="sm" variant="outline" onClick={() => move(1)} disabled={!selectedId}>↓</Button>
              <Button size="sm" variant="outline" onClick={() => { if (selectedId) { setTree((t) => duplicateRootNode(t, selectedId)); setDirty(true); } }} disabled={!selectedId}>Duplicar</Button>
              <Button size="sm" variant="outline" onClick={() => { if (selectedId) { setTree((t) => removeNode(t, selectedId)); setSelectedId(null); setDirty(true); } }} disabled={!selectedId}>Eliminar</Button>
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="outline" onClick={onSaveVersion}>Guardar versión</Button>
                <Button size="sm" variant="outline" onClick={onPreviewTab}>Preview ↗</Button>
                {active.status === "published"
                  ? <Button size="sm" variant="outline" onClick={onUnpublish}>Despublicar</Button>
                  : <Button size="sm" onClick={onPublish}>Publicar</Button>}
              </div>
            </div>
            <div className="overflow-x-auto rounded-md bg-card/30 p-3">
              <div className={`mx-auto ${BP_WIDTH[bp]} transition-all`} style={themeStyle}>
                <CompositionRenderer
                  tree={tree}
                  studio
                  variableContext={demoCtx}
                  wrap={(node, content) => (
                    <div
                      key={node.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                      className={`rounded-md border ${selectedId === node.id ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-border"} p-1 transition-colors`}
                    >
                      {content}
                    </div>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Inspector + Theme + Versions */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-card/40 p-3">
              {selectedNode && selectedContract ? (
                <AutoInspector
                  contract={selectedContract}
                  config={selectedNode.config as Record<string, unknown>}
                  onChange={updateField}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Selecciona un bloque en el Canvas para editarlo.</p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <h3 className="text-sm font-semibold">Tema</h3>
              <select
                value={active.theme_id ?? ""}
                onChange={(e) => void onChangeTheme(e.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <option value="">— Sin tema (predeterminado) —</option>
                {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3">
              <h3 className="text-sm font-semibold">Versiones</h3>
              <ul className="mt-2 grid gap-1 text-xs max-h-60 overflow-y-auto">
                {versions.length === 0 ? <li className="text-muted-foreground">Sin versiones.</li> : versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1">
                    <span className="truncate">{new Date(v.created_at).toLocaleString()}{v.note ? ` · ${v.note}` : ""}</span>
                    <Button size="sm" variant="ghost" onClick={() => onRestore(v)}>Restaurar</Button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PagesList({ pages, onOpen, onCreate }: { pages: EbPageSummary[]; onOpen: (id: string) => void; onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Páginas</h2>
        <Button size="sm" onClick={onCreate}>Nueva</Button>
      </div>
      <ul className="grid gap-2">
        {pages.length === 0 ? <li className="text-xs text-muted-foreground">Aún no hay páginas.</li> : pages.map((p) => (
          <li key={p.id}>
            <button onClick={() => onOpen(p.id)} className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">/{p.slug} · {p.kind} · {p.scope}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function findInTree(tree: CompositionTree, id: string): CompositionNode | null {
  const stack = [...tree.root.children];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.id === id) return cur;
    if (cur.children) stack.push(...cur.children);
  }
  return null;
}

function buildThemeStyle(tokens?: Record<string, unknown> | null): React.CSSProperties {
  if (!tokens || typeof tokens !== "object") return {};
  const style: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens)) {
    if (typeof v === "string" || typeof v === "number") {
      const cssKey = k.startsWith("--") ? k : `--${k.replace(/_/g, "-")}`;
      style[cssKey] = String(v);
    }
  }
  return style as React.CSSProperties;
}