/**
 * Ola A2 · Consola de Conocimiento de Alux (RAG)
 * Editor CRUD sencillo para curar entradas territoriales/turísticas
 * que Alux consumirá vía embeddings.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ALUX_KNOWLEDGE_CATEGORIES,
  ALUX_KB_LOCALES,
  deleteAluxKnowledge,
  listAluxKnowledge,
  listAluxKnowledgeLocaleCoverage,
  markAluxTranslationReviewed,
  searchAluxKnowledge,
  translateAluxKnowledgeEntry,
  upsertAluxKnowledge,
  type AluxKbLocale,
  type AluxKnowledgeCategory,
  type AluxKnowledgeEntry,
  type AluxKnowledgeStatus,
} from "@/lib/alux/knowledge.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2, Sparkles, Plus, Languages, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cms/alux/conocimiento")({
  head: () => ({
    meta: [
      { title: "Base de conocimiento de Alux · CMS" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxKnowledgePage,
});

type Draft = {
  id: string | null;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: AluxKnowledgeCategory;
  tags: string;
  source_url: string;
  priority: number;
  status: AluxKnowledgeStatus;
};

const EMPTY_DRAFT: Draft = {
  id: null,
  slug: "",
  title: "",
  summary: "",
  body: "",
  category: "cultura",
  tags: "",
  source_url: "",
  priority: 0,
  status: "draft",
};

function draftFromEntry(e: AluxKnowledgeEntry): Draft {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    summary: e.summary ?? "",
    body: e.body,
    category: e.category,
    tags: (e.tags ?? []).join(", "),
    source_url: e.source_url ?? "",
    priority: e.priority,
    status: e.status,
  };
}

function AluxKnowledgePage() {
  const qc = useQueryClient();
  const list = useServerFn(listAluxKnowledge);
  const save = useServerFn(upsertAluxKnowledge);
  const del = useServerFn(deleteAluxKnowledge);
  const search = useServerFn(searchAluxKnowledge);
  const coverageFn = useServerFn(listAluxKnowledgeLocaleCoverage);
  const translateFn = useServerFn(translateAluxKnowledgeEntry);
  const markReviewedFn = useServerFn(markAluxTranslationReviewed);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["alux-knowledge"],
    queryFn: () => list(),
  });

  const { data: coverage = [] } = useQuery({
    queryKey: ["alux-knowledge-coverage"],
    queryFn: () => coverageFn(),
  });

  const coverageByEntry = useMemo(() => {
    const map = new Map<string, Map<AluxKbLocale, (typeof coverage)[number]>>();
    for (const c of coverage) {
      const inner = map.get(c.entry_id) ?? new Map();
      inner.set(c.locale, c);
      map.set(c.entry_id, inner);
    }
    return map;
  }, [coverage]);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ title: string; category: string; similarity: number; slug: string }>
  >([]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        id: draft.id,
        slug: draft.slug || undefined,
        title: draft.title.trim(),
        summary: draft.summary.trim() ? draft.summary.trim() : null,
        body: draft.body.trim(),
        category: draft.category,
        tags: draft.tags
          .split(/[,\n]/)
          .map((t) => t.trim())
          .filter(Boolean),
        source_url: draft.source_url.trim() ? draft.source_url.trim() : null,
        priority: draft.priority,
        status: draft.status,
      };
      return save({ data: payload });
    },
    onSuccess: () => {
      toast.success(
        draft.status === "published"
          ? "Entrada publicada y embebida."
          : "Entrada guardada.",
      );
      setDraft(EMPTY_DRAFT);
      qc.invalidateQueries({ queryKey: ["alux-knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Entrada eliminada.");
      if (draft.id) setDraft(EMPTY_DRAFT);
      qc.invalidateQueries({ queryKey: ["alux-knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const searchMut = useMutation({
    mutationFn: (q: string) => search({ data: { query: q } }),
    onSuccess: (rows) =>
      setSearchResults(
        rows.map((r) => ({
          title: r.title,
          category: r.category,
          slug: r.slug,
          similarity: r.similarity,
        })),
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  const translateMut = useMutation({
    mutationFn: (v: { entryId: string; locales: AluxKbLocale[]; overwrite?: boolean }) =>
      translateFn({ data: v }),
    onSuccess: (res) => {
      const ok = res.results.filter((r) => r.ok).length;
      const fail = res.results.length - ok;
      toast.success(
        `Traducción: ${ok} ok${fail ? ` · ${fail} omitidas/fallidas` : ""}`,
      );
      qc.invalidateQueries({ queryKey: ["alux-knowledge-coverage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewMut = useMutation({
    mutationFn: (v: { entryId: string; locale: AluxKbLocale }) =>
      markReviewedFn({ data: v }),
    onSuccess: () => {
      toast.success("Traducción marcada como revisada.");
      qc.invalidateQueries({ queryKey: ["alux-knowledge-coverage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const total = entries.length;
    const published = entries.filter((e) => e.status === "published").length;
    const embedded = entries.filter((e) => e.embedded_at).length;
    const nonEsLocales = ALUX_KB_LOCALES.filter((l) => l !== "es").length;
    const expected = published * nonEsLocales;
    const translated = coverage.filter(
      (c) => c.locale !== "es" && c.embedded,
    ).length;
    return { total, published, embedded, translated, expected };
  }, [entries, coverage]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Alux · Ola A2
        </p>
        <h1 className="text-3xl font-serif">Base de conocimiento</h1>
        <p className="text-muted-foreground max-w-2xl">
          Entradas curadas del Oriente Maya que Alux usa para responder con
          contexto real (cultura, clima, transporte, gastronomía, FAQs).
          Publicar genera automáticamente el embedding.
        </p>
        <div className="flex gap-2 pt-2 flex-wrap">
          <Badge variant="secondary">{stats.total} entradas</Badge>
          <Badge>{stats.published} publicadas</Badge>
          <Badge variant="outline">{stats.embedded} con embedding</Badge>
          <Badge variant="outline">
            {stats.translated}/{stats.expected} traducciones IA
          </Badge>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* Editor */}
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">
              {draft.id ? "Editar entrada" : "Nueva entrada"}
            </h2>
            {draft.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDraft(EMPTY_DRAFT)}
              >
                <Plus className="h-4 w-4 mr-1" /> Nueva
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ej. Clima en Valladolid por temporada"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) =>
                    setDraft({ ...draft, category: v as AluxKnowledgeCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALUX_KNOWLEDGE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) =>
                    setDraft({ ...draft, status: v as AluxKnowledgeStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="published">Publicada (genera embedding)</SelectItem>
                    <SelectItem value="archived">Archivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Resumen (opcional)</Label>
              <Textarea
                value={draft.summary}
                rows={2}
                onChange={(e) =>
                  setDraft({ ...draft, summary: e.target.value })
                }
                placeholder="Resumen breve; si existe, se usa como snippet inyectado al prompt."
              />
            </div>

            <div>
              <Label>Cuerpo (Markdown)</Label>
              <Textarea
                value={draft.body}
                rows={12}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Explicación completa. Alux la usará textualmente."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Etiquetas (coma-separadas)</Label>
                <Input
                  value={draft.tags}
                  onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                  placeholder="valladolid, clima, temporada"
                />
              </div>
              <div>
                <Label>Prioridad (0–100)</Label>
                <Input
                  type="number"
                  value={draft.priority}
                  min={0}
                  max={100}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      priority: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Fuente / URL (opcional)</Label>
              <Input
                value={draft.source_url}
                onChange={(e) =>
                  setDraft({ ...draft, source_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => saveMut.mutate()}
                disabled={
                  saveMut.isPending ||
                  draft.title.trim().length < 4 ||
                  draft.body.trim().length < 20
                }
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {saveMut.isPending
                  ? "Guardando…"
                  : draft.status === "published"
                    ? "Publicar y embeber"
                    : "Guardar"}
              </Button>
              {draft.id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm("¿Eliminar entrada?")) deleteMut.mutate(draft.id!);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              )}
            </div>
          </div>

          {draft.id && (
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Traducciones (RAG multilingüe)
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    ES es la fuente canónica. Los otros idiomas se generan
                    con IA y quedan como borrador editorial hasta que las revises.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    translateMut.mutate({
                      entryId: draft.id!,
                      locales: ALUX_KB_LOCALES.filter((l) => l !== "es"),
                    })
                  }
                  disabled={translateMut.isPending}
                >
                  {translateMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Languages className="h-3.5 w-3.5 mr-1" />
                  )}
                  Traducir faltantes
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ALUX_KB_LOCALES.map((loc) => {
                  const c = coverageByEntry.get(draft.id!)?.get(loc);
                  const isEs = loc === "es";
                  const state = !c
                    ? "missing"
                    : !c.embedded
                      ? "no-emb"
                      : c.source === "human" || isEs
                        ? "reviewed"
                        : "ai";
                  return (
                    <div
                      key={loc}
                      className="flex items-center justify-between rounded-lg border px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono uppercase">{loc}</span>
                        {state === "missing" && (
                          <Badge variant="outline" className="text-[10px]">
                            faltante
                          </Badge>
                        )}
                        {state === "ai" && (
                          <Badge variant="secondary" className="text-[10px]">
                            IA
                          </Badge>
                        )}
                        {state === "reviewed" && (
                          <Badge className="text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> revisada
                          </Badge>
                        )}
                        {state === "no-emb" && (
                          <Badge variant="outline" className="text-[10px]">
                            sin embedding
                          </Badge>
                        )}
                      </div>
                      {!isEs && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() =>
                              translateMut.mutate({
                                entryId: draft.id!,
                                locales: [loc],
                                overwrite: !!c,
                              })
                            }
                            disabled={translateMut.isPending}
                            title={c ? "Regenerar con IA" : "Traducir con IA"}
                          >
                            <Languages className="h-3.5 w-3.5" />
                          </Button>
                          {c && state === "ai" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() =>
                                reviewMut.mutate({ entryId: draft.id!, locale: loc })
                              }
                              disabled={reviewMut.isPending}
                              title="Marcar como revisada"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Lista + búsqueda */}
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Probar retrieval
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ej. ¿Cuándo llueve en Valladolid?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim().length >= 3)
                    searchMut.mutate(query.trim());
                }}
              />
              <Button
                variant="outline"
                onClick={() => searchMut.mutate(query.trim())}
                disabled={searchMut.isPending || query.trim().length < 3}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <ul className="text-sm space-y-1 pt-2">
                {searchResults.map((r) => (
                  <li key={r.slug} className="flex justify-between gap-2 border-t pt-1">
                    <span className="truncate">
                      <Badge variant="outline" className="mr-2">
                        {r.category}
                      </Badge>
                      {r.title}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {(r.similarity * 100).toFixed(0)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card">
            <div className="p-4 border-b">
              <h2 className="font-serif text-xl">Entradas</h2>
            </div>
            {isLoading ? (
              <div className="p-4 text-muted-foreground text-sm">Cargando…</div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                Aún no hay entradas. Crea la primera desde el editor.
              </div>
            ) : (
              <ul className="divide-y">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="p-4 hover:bg-muted/40 cursor-pointer"
                    onClick={() => setDraft(draftFromEntry(e))}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {e.summary ?? e.body.slice(0, 120)}
                        </div>
                        <div className="flex gap-0.5 mt-1 flex-wrap">
                          {ALUX_KB_LOCALES.map((loc) => {
                            const c = coverageByEntry.get(e.id)?.get(loc);
                            const ok = !!c?.embedded;
                            return (
                              <span
                                key={loc}
                                className={`text-[9px] font-mono uppercase px-1 rounded ${
                                  ok
                                    ? "bg-primary/10 text-primary"
                                    : "bg-muted text-muted-foreground/60"
                                }`}
                                title={
                                  c
                                    ? c.source === "human"
                                      ? "Revisada"
                                      : c.source === "canonical"
                                        ? "Canónica"
                                        : "Traducción IA"
                                    : "Faltante"
                                }
                              >
                                {loc}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant={
                            e.status === "published"
                              ? "default"
                              : e.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {e.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {e.category}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}