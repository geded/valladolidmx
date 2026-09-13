/**
 * TripBriefSection — "Brief del expediente" dentro de Arma tu Viaje.
 *
 * Delta localizado: NO reemplaza ninguna sección aprobada. Añade el
 * bloque donde el explorador declara, con opciones cerradas, los datos
 * que el concierge humano necesita para atender el expediente.
 *
 * Reglas duras:
 *  · Cero backend nuevo, cero store paralelo. Toda selección se registra
 *    con `rememberTravelPreference` (vocabulario cerrado de Alux) y se
 *    lee con `useTravelPreferences`.
 *  · Cero texto libre, cero PII.
 *  · Alux se invoca con el bus existente (`askAluxWithPreferenceMemory`).
 */
import { useMemo, useState } from "react";
import { ClipboardList, Sparkles, ArrowRight, Plus, X } from "lucide-react";
import {
  TRAVEL_PREFERENCE_VOCABULARY,
  rememberTravelPreference,
  normalizeTravelPreference,
  askAluxWithPreferenceMemory,
  type TravelPreference,
} from "@/lib/alux/travel-preferences";
import { useTravelPreferences } from "@/lib/alux/use-travel-preferences";

const SURFACE = "arma-tu-viaje:brief";

const GROUPS: ReadonlyArray<{ id: string; title: string; help: string; slugs: readonly string[] }> =
  [
    {
      id: "compania",
      title: "¿Con quién viajas?",
      help: "Define el tipo de alojamiento, mesas y ritmo que te propondremos.",
      slugs: ["viaje-en-pareja", "viaje-en-familia", "viaje-con-amigos", "viaje-en-solitario"],
    },
    {
      id: "interes",
      title: "¿Qué quieres vivir?",
      help: "Ordena las experiencias del Oriente Maya según lo que más te mueve.",
      slugs: [
        "cultura-maya",
        "cenotes-naturaleza",
        "gastronomia",
        "descanso",
        "vida-nocturna",
        "romance",
        "aventura",
        "bienestar",
        "artesanias-compras",
        "fiestas-eventos",
        "fotografia",
      ],
    },
    {
      id: "estilo",
      title: "¿Qué estilo buscas?",
      help: "Ayuda al concierge a proponer opciones dentro de tu rango.",
      slugs: ["presupuesto-economico", "experiencia-premium"],
    },
    {
      id: "necesidades",
      title: "¿Algo que debamos considerar?",
      help: "Condiciones prácticas que cambian la propuesta antes de enviarla.",
      slugs: ["viaje-accesible", "centro-historico"],
    },
  ];

const BY_SLUG = new Map(TRAVEL_PREFERENCE_VOCABULARY.map((p) => [p.slug, p] as const));

/** Nota libre saneada: sin cifras, correos, enlaces ni PII, máx. 60 caracteres. */
function sanitizeNote(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\S+@\S+/g, " ")
    .replace(/[0-9]+/g, " ")
    .replace(/[^\p{L}\s,·-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export function TripBriefSection() {
  const remembered = useTravelPreferences();
  /** El brief lo controla el viajero: `marked` manda sobre lo recordado. */
  const [marked, setMarked] = useState<Readonly<Record<string, boolean>>>({});
  const [notes, setNotes] = useState<readonly string[]>([]);
  const [draft, setDraft] = useState("");

  const selected = useMemo(() => {
    const slugs = new Set<string>();
    for (const preference of remembered) slugs.add(preference.slug);
    for (const [slug, isOn] of Object.entries(marked)) {
      if (isOn) slugs.add(slug);
      else slugs.delete(slug);
    }
    return slugs;
  }, [remembered, marked]);

  const selectedPreferences = useMemo(
    () =>
      TRAVEL_PREFERENCE_VOCABULARY.filter((preference) => selected.has(preference.slug)).slice(
        0,
        8,
      ),
    [selected],
  );

  function toggle(preference: TravelPreference) {
    const isOn = selected.has(preference.slug);
    setMarked((prev) => ({ ...prev, [preference.slug]: !isOn }));
    if (!isOn) rememberTravelPreference(preference.label, SURFACE);
  }

  function addNote() {
    const clean = sanitizeNote(draft);
    if (!clean) return;
    setDraft("");
    const known = normalizeTravelPreference(clean);
    if (known) {
      setMarked((prev) => ({ ...prev, [known.slug]: true }));
      rememberTravelPreference(known.label, SURFACE);
      return;
    }
    setNotes((prev) => (prev.includes(clean) || prev.length >= 3 ? prev : [...prev, clean]));
  }


  return (
    <section aria-labelledby="ayv-brief-h" className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ClipboardList className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            Brief del expediente
          </p>
          <h2 id="ayv-brief-h" className="mt-0.5 font-serif text-[1.25rem] font-semibold leading-[1.2] tracking-[-0.01em] sm:text-[1.6rem]">
            Cuéntanos cómo quieres viajar
          </h2>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-muted-foreground sm:text-sm">
            Marca las opciones que apliquen. No pedimos datos personales: sólo el contexto que tu
            concierge humano necesita para responderte con propuestas reales del Oriente Maya.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <fieldset key={group.id} className="min-w-0">
            <legend className="text-[15px] font-semibold leading-snug sm:text-base">{group.title}</legend>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{group.help}</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {group.slugs.map((slug) => {
                const preference = BY_SLUG.get(slug);
                if (!preference) return null;
                const isOn = selected.has(slug);
                return (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(preference)}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${
                      isOn
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {preference.label}
                  </button>
                );
              })}
              {notes
                .filter((note) => note.groupId === group.id)
                .map((note) => (
                  <button
                    key={note.text}
                    type="button"
                    aria-label={`Quitar ${note.text}`}
                    onClick={() =>
                      setNotes((prev) => prev.filter((item) => item.text !== note.text))
                    }
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-primary bg-primary px-3 text-[13px] font-medium text-primary-foreground"
                  >
                    {note.text}
                    <X className="size-3.5" aria-hidden />
                  </button>
                ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 min-w-0">
        <label
          htmlFor="ayv-brief-otro"
          className="text-[15px] font-semibold leading-snug sm:text-base"
        >
          ¿Falta algo? Escríbelo
        </label>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          Elige a qué pregunta pertenece y escríbelo. Sin datos personales.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              aria-pressed={draftGroup === group.id}
              onClick={() => setDraftGroup(group.id)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-medium transition-colors ${
                draftGroup === group.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:bg-accent"
              }`}
            >
              {group.title}
            </button>
          ))}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <input
            id="ayv-brief-otro"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addNote();
              }
            }}
            maxLength={60}
            placeholder="Escribe tu interés"
            className="min-h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none ring-focus placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={addNote}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Plus className="size-4" aria-hidden />
            Agregar
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <p className="text-[15px] font-semibold leading-snug sm:text-base">Esto es lo que verá tu concierge</p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground sm:text-sm">
          {selectedPreferences.length || notes.length
            ? `Viajeros que ${[
                ...selectedPreferences.map((preference) => preference.phrase),
                ...(notes.length
                  ? [
                      `además mencionan: ${notes
                        .map((note) => `${note.text} (${GROUP_LABEL.get(note.groupId) ?? ""})`)
                        .join(", ")}`,
                    ]
                  : []),
              ].join("; ")}.`
            : "Aún no has marcado nada. En cuanto marques una opción, aparecerá aquí el resumen que acompaña a tu expediente."}
        </p>
        <button
          type="button"
          onClick={() =>
            askAluxWithPreferenceMemory({
              surface: SURFACE,
              hint: "El explorador está completando el brief de su expediente en Arma tu Viaje.",
              prompt:
                selectedPreferences.length || notes.length
                  ? `Con base en mi brief (${[
                      ...selectedPreferences.map((preference) => preference.label),
                      ...notes.map((note) => note.text),
                    ].join(", ")}), ¿qué me falta para completar mi viaje?`
                  : "Ayúdame a definir cómo quiero viajar por el Oriente Maya.",
            })
          }
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95"
        >
          <Sparkles className="size-4" aria-hidden />
          Revisar mi brief con Alux
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
