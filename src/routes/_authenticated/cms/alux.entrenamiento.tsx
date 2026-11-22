/**
 * CRM · Fase 4 — Entrenamiento de Alux (solo administradores).
 * Ficha oficial de cada destino (Base de conocimiento, categoría «destinos»)
 * y preguntas que Alux no supo contestar. Guardar publica al instante y
 * aplica en la ventana de Alux y en WhatsApp.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft } from "lucide-react";
import {
  listDestinationBriefs,
  listKnowledgeGaps,
  updateKnowledgeGap,
  type DestinationBriefRow,
} from "@/lib/alux/training.functions";
import { upsertAluxKnowledge } from "@/lib/alux/knowledge.functions";
import {
  GAP_CHANNEL_LABEL,
  GAP_REASON_LABEL,
  destinationBriefSlug,
  parseBriefTags,
  type GapStatus,
} from "@/lib/alux/knowledge-gaps";
import { meridaDateTime } from "@/lib/time/merida";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/alux/entrenamiento")({
  head: () => ({
    meta: [
      { title: "Entrenamiento de Alux · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxTrainingPage,
});

function AluxTrainingPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <Link
          to="/cms/alux"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Consola de Alux
        </Link>
        <h1 className="font-serif text-2xl">Entrenamiento de Alux</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Escribe cómo quieres que Alux hable de cada destino y revisa lo que los viajeros le
          preguntaron y no supo contestar. Al guardar, Alux lo usa desde la siguiente respuesta en
          la web y en WhatsApp.
        </p>
      </header>
      <GapsSection />
      <BriefsSection />
    </div>
  );
}

function BriefsSection() {
  const fn = useServerFn(listDestinationBriefs);
  const q = useQuery({ queryKey: ["cms", "alux-briefs"], queryFn: () => fn() });
  return (
    <section className="space-y-3" aria-labelledby="briefs-h">
      <div>
        <h2 id="briefs-h" className="font-serif text-lg">
          Ficha oficial de cada destino
        </h2>
        <p className="text-xs text-muted-foreground">
          Lo esencial de cada destino y las etiquetas clave que Alux debe mencionar. No pongas
          precios: esos solo salen de las experiencias publicadas.
        </p>
      </div>
      {q.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar los destinos.</p>
      ) : !q.data ? (
        <p className="text-sm text-muted-foreground">Cargando destinos…</p>
      ) : (
        <ul className="space-y-2">
          {q.data.map((d) => (
            <BriefCard key={d.destinationId} row={d} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BriefCard({ row }: { row: DestinationBriefRow }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertAluxKnowledge);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(row.brief?.summary ?? row.tagline ?? "");
  const [body, setBody] = useState(row.brief?.body ?? row.highlights.join("\n"));
  const [tags, setTags] = useState((row.brief?.tags ?? []).join(", "));
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: row.brief?.id ?? null,
          slug: destinationBriefSlug(row.slug),
          title: `${row.name} · ficha oficial`,
          summary: summary.trim() || null,
          body: body.trim(),
          category: "destinos",
          tags: parseBriefTags(tags),
          priority: 90,
          status: "published",
        },
      }),
    onSuccess: () => {
      toast.success(`Ficha de ${row.name} guardada. Alux ya la usa.`);
      void qc.invalidateQueries({ queryKey: ["cms", "alux-briefs"] });
    },
    onError: (e: Error) =>
      toast.error(
        body.trim().length < 20
          ? "Escribe al menos 20 letras en la descripción."
          : e.message || "No se pudo guardar",
      ),
  });
  const bodyId = `brief-body-${row.slug}`;
  return (
    <li className="rounded-2xl border bg-card shadow-soft">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
      >
        <span className="font-medium">{row.name}</span>
        <span className="flex gap-1.5">
          {row.openGaps > 0 ? <Badge variant="outline">{row.openGaps} sin contestar</Badge> : null}
          {row.brief?.status === "published" ? (
            <Badge variant="secondary">Ficha publicada</Badge>
          ) : (
            <Badge variant="outline">Sin ficha</Badge>
          )}
        </span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border p-4">
          <div className="space-y-1">
            <Label htmlFor={`brief-sum-${row.slug}`}>En una frase</Label>
            <Input
              id={`brief-sum-${row.slug}`}
              value={summary}
              maxLength={600}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={bodyId}>Lo que Alux debe saber y transmitir</Label>
            <Textarea id={bodyId} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`brief-tags-${row.slug}`}>Etiquetas clave (separadas por coma)</Label>
            <Input
              id={`brief-tags-${row.slug}`}
              value={tags}
              placeholder="Pueblo Mágico, cenotes, arquitectura colonial"
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar y aplicar"}
            </Button>
            {row.brief ? (
              <span className="text-[11px] text-muted-foreground">
                Última vez: {meridaDateTime(row.brief.updatedAt)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

const GAP_TABS: Array<{ id: GapStatus; label: string }> = [
  { id: "abierta", label: "Por revisar" },
  { id: "resuelta", label: "Ya contestadas" },
  { id: "ignorada", label: "Ignoradas" },
];

function GapsSection() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<GapStatus>("abierta");
  const listFn = useServerFn(listKnowledgeGaps);
  const updFn = useServerFn(updateKnowledgeGap);
  const q = useQuery({
    queryKey: ["cms", "alux-gaps", status],
    queryFn: () => listFn({ data: { status } }),
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; status: GapStatus }) => updFn({ data: v }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cms", "alux-gaps"] });
      void qc.invalidateQueries({ queryKey: ["cms", "alux-briefs"] });
    },
    onError: () => toast.error("No se pudo cambiar. Intenta de nuevo."),
  });
  return (
    <section className="space-y-3" aria-labelledby="gaps-h">
      <div>
        <h2 id="gaps-h" className="font-serif text-lg">
          Preguntas que Alux no supo contestar
        </h2>
        <p className="text-xs text-muted-foreground">
          Se guardan sin teléfonos, correos ni enlaces. Agrega la respuesta en la{" "}
          <Link to="/cms/alux/conocimiento" className="underline underline-offset-4">
            Base de conocimiento
          </Link>{" "}
          o en la ficha del destino, y márcala como contestada.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
        {GAP_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={status === t.id}
            onClick={() => setStatus(t.id)}
            className={[
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium",
              status === t.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
      {q.isError ? (
        <p className="text-sm text-destructive">No se pudieron cargar las preguntas.</p>
      ) : !q.data ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : q.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          {status === "abierta"
            ? "Nada por revisar. Alux ha podido contestar todo."
            : "No hay preguntas aquí."}
        </p>
      ) : (
        <ul className="space-y-2">
          {q.data.map((g) => (
            <li key={g.id} className="space-y-2 rounded-lg border border-border bg-card p-3">
              <p className="text-sm">«{g.question}»</p>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <Badge variant="outline">{GAP_CHANNEL_LABEL[g.channel]}</Badge>
                {g.destinationSlug ? <Badge variant="outline">{g.destinationSlug}</Badge> : null}
                <Badge variant="outline">{GAP_REASON_LABEL[g.reason]}</Badge>
                <span className="self-center">
                  {g.occurrences === 1 ? "1 vez" : `${g.occurrences} veces`} · última{" "}
                  {meridaDateTime(g.lastSeenAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {status !== "resuelta" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={upd.isPending}
                    onClick={() => upd.mutate({ id: g.id, status: "resuelta" })}
                  >
                    Ya la contesté
                  </Button>
                ) : null}
                {status !== "ignorada" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={upd.isPending}
                    onClick={() => upd.mutate({ id: g.id, status: "ignorada" })}
                  >
                    Ignorar
                  </Button>
                ) : null}
                {status !== "abierta" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={upd.isPending}
                    onClick={() => upd.mutate({ id: g.id, status: "abierta" })}
                  >
                    Volver a revisar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
