/**
 * Ola A1 · Consola de Alux (CMS Studio)
 * Editor único (singleton) de persona, guardrails, modelo, temperatura,
 * max_tokens y banderas de las capas de memoria M1..M4.
 */
import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getAluxSettings,
  updateAluxSettings,
  DEFAULT_ALUX_FLAGS,
  type AluxFlags,
} from "@/lib/alux/settings.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/cms/alux")({
  head: () => ({
    meta: [
      { title: "Consola de Alux · CMS Studio" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AluxConsoleRoute,
});

/** Las subpáginas (conocimiento, opiniones, calidad) se muestran en lugar de la consola. */
function AluxConsoleRoute() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <AluxConsolePage />;
}

const MODEL_OPTIONS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash · rápido (recomendado)" },
  { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash · mejores respuestas" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro · piensa más, tarda más" },
  { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite · más económico" },
];

const FLAG_META: Array<{ key: keyof AluxFlags; title: string; description: string }> = [
  {
    key: "m1_identity",
    title: "Recordar quién es el viajero",
    description: "Usa su perfil: nombre, idioma, país, intereses, presupuesto y restricciones.",
  },
  {
    key: "m2_travel_plan",
    title: "Recordar su viaje actual",
    description: "Usa lo que lleva en Mi Viaje, los huecos del plan y su caso con el concierge.",
  },
  {
    key: "m3_episodic",
    title: "Recordar lo que ya pasó",
    description: "Usa sugerencias anteriores, cupones canjeados, reseñas y opiniones que dio.",
  },
  {
    key: "m4_knowledge",
    title: "Conocer el territorio",
    description: "Usa los lugares publicados, las promociones vigentes y la base de conocimiento.",
  },
  {
    key: "proactive_suggestions",
    title: "Sugerencias proactivas",
    description: "Alux puede mostrar sugerencias sin que el viajero pregunte primero.",
  },
  {
    key: "cite_sources",
    title: "Citar fuentes siempre",
    description: "Cada respuesta importante dice de dónde sacó la información.",
  },
  {
    key: "prioritize_visibility",
    title: "Dar preferencia a planes de visibilidad",
    description: "Las empresas con plan de visibilidad pagado aparecen antes en las sugerencias.",
  },
];

function AluxConsolePage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getAluxSettings);
  const updateFn = useServerFn(updateAluxSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["cms", "alux-settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState<null | {
    persona: string;
    guardrails: string;
    default_model: string;
    temperature: number;
    max_tokens: number;
    flags: AluxFlags;
  }>(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        persona: data.persona,
        guardrails: data.guardrails,
        default_model: data.default_model,
        temperature: data.temperature,
        max_tokens: data.max_tokens,
        flags: { ...DEFAULT_ALUX_FLAGS, ...data.flags },
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (payload: NonNullable<typeof form>) => updateFn({ data: payload }),
    onSuccess: () => {
      toast.success("Configuración de Alux actualizada");
      qc.invalidateQueries({ queryKey: ["cms", "alux-settings"] });
    },
    onError: (e: Error) => toast.error(e.message || "No se pudo guardar"),
  });

  if (isLoading || !form) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-muted-foreground">Cargando configuración de Alux…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">CMS · Inteligencia</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-serif">Consola de Alux</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Aquí decides cómo es Alux: su personalidad, las reglas que nunca rompe y qué recuerda de
          cada viajero. Los cambios se aplican al momento, sin publicar, y queda registrado quién
          los hizo. Alux es copiloto y concierge, no un simple chat.
        </p>
        {data?.updated_at && (
          <p className="text-xs text-muted-foreground">
            Última actualización: {new Date(data.updated_at).toLocaleString("es-MX")}
          </p>
        )}
        <div className="pt-2">
          <Link
            to="/cms/alux/conocimiento"
            className="inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-primary"
          >
            📚 Base de conocimiento
          </Link>
          <span className="mx-3 text-muted-foreground">·</span>
          <Link
            to="/cms/alux/feedback"
            className="inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-primary"
          >
            📊 Opiniones de los viajeros
          </Link>
          <span className="mx-3 text-muted-foreground">·</span>
          <Link
            to="/cms/alux/calidad"
            className="inline-flex items-center gap-2 text-sm underline underline-offset-4 hover:text-primary"
          >
            🎯 Calidad de las respuestas
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-card p-6 space-y-4 shadow-soft">
        <div>
          <h2 className="font-serif text-lg">Personalidad</h2>
          <p className="text-xs text-muted-foreground">
            Quién es Alux, cómo habla y qué tono usa. Alux lo lee antes de cada respuesta.
          </p>
        </div>
        <Textarea
          rows={6}
          value={form.persona}
          onChange={(e) => setForm({ ...form, persona: e.target.value })}
        />
      </section>

      <section className="rounded-2xl border bg-card p-6 space-y-4 shadow-soft">
        <div>
          <h2 className="font-serif text-lg">Reglas que Alux nunca rompe</h2>
          <p className="text-xs text-muted-foreground">
            Se aplican en cada respuesta: no inventar, no reemplazar al concierge, poner primero al
            viajero y explicar siempre por qué recomienda algo.
          </p>
        </div>
        <Textarea
          rows={7}
          value={form.guardrails}
          onChange={(e) => setForm({ ...form, guardrails: e.target.value })}
        />
      </section>

      <section className="rounded-2xl border bg-card p-6 space-y-6 shadow-soft">
        <div>
          <h2 className="font-serif text-lg">Inteligencia artificial que usa</h2>
          <p className="text-xs text-muted-foreground">
            Qué modelo de inteligencia artificial responde y cómo escribe.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Modelo</Label>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={form.default_model}
            onChange={(e) => setForm({ ...form, default_model: e.target.value })}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Creatividad</Label>
              <span className="text-xs text-muted-foreground">{form.temperature.toFixed(2)}</span>
            </div>
            <Slider
              min={0}
              max={1.5}
              step={0.05}
              value={[form.temperature]}
              onValueChange={([v]) => setForm({ ...form, temperature: v })}
            />
            <p className="text-[11px] text-muted-foreground">
              Baja = respuestas más precisas y parecidas entre sí. Alta = más variadas y creativas.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Largo máximo de cada respuesta</Label>
            <Input
              type="number"
              min={64}
              max={8000}
              value={form.max_tokens}
              onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) || 1200 })}
            />
            <p className="text-[11px] text-muted-foreground">
              En fragmentos de texto: 1,200 equivale a unas 900 palabras.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6 space-y-4 shadow-soft">
        <div>
          <h2 className="font-serif text-lg">Qué recuerda y cómo sugiere</h2>
          <p className="text-xs text-muted-foreground">
            Activa o desactiva lo que Alux recuerda de cada viajero y cómo se comporta al sugerir.
          </p>
        </div>
        <div className="grid gap-3">
          {FLAG_META.map((f) => (
            <label
              key={f.key}
              className="flex items-start justify-between gap-4 rounded-lg border p-4 hover:bg-muted/40"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                checked={form.flags[f.key]}
                onCheckedChange={(v) =>
                  setForm({ ...form, flags: { ...form.flags, [f.key]: Boolean(v) } })
                }
              />
            </label>
          ))}
        </div>
      </section>

      <footer className="sticky bottom-4 flex items-center justify-end gap-3 rounded-2xl border bg-background/90 backdrop-blur p-4 shadow-elevated">
        <p className="text-xs text-muted-foreground mr-auto">
          Los cambios afectan a Alux en la siguiente conversación.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            if (!data) return;
            setForm({
              persona: data.persona,
              guardrails: data.guardrails,
              default_model: data.default_model,
              temperature: data.temperature,
              max_tokens: data.max_tokens,
              flags: { ...DEFAULT_ALUX_FLAGS, ...data.flags },
            });
          }}
        >
          Descartar
        </Button>
        <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </footer>
    </div>
  );
}
