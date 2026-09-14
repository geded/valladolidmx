/**
 * /_authenticated/cms/marca — Configuración de Marca (Lote 3B).
 *
 * Fuente única de verdad de la identidad editorial de la marca activa.
 * Los valores actuales del código son los predeterminados: guardar sin
 * cambios no altera ninguna superficie pública. No se generan logos ni
 * activos nuevos; sólo se referencian rutas internas existentes.
 *
 * Sólo super_admin / admin (validado en servidor).
 */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BRAND_SETTINGS_DEFAULTS,
  getBrandSettingsAdmin,
  updateBrandSettings,
  type BrandSettings,
} from "@/lib/brand/brand-settings.functions";
import {
  aluxPaletteContrastChecks,
  aluxPaletteStyle,
  brandPaletteStyle,
  paletteContrastChecks,
  type BrandPalette,
} from "@/lib/brand/brand-theme";
import {
  ALUX_PALETTE_KEYS,
  ALUX_VOICE_KEYS,
  fillAluxCopy,
  type AluxPalette,
  type AluxVoice,
} from "@/lib/brand/alux-brand";
import { ACTIVE_LOCALES, type LocaleCode } from "@/config/languages";

export const Route = createFileRoute("/_authenticated/cms/marca")({
  head: () => ({
    meta: [
      { title: "Marca · CMS Studio · Valladolid.mx" },
      {
        name: "description",
        content: "Identidad editorial de la marca activa: nombre, lema, promesa y logotipo.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BrandSettingsPage,
});

const FIELDS: Array<{
  key: keyof Omit<BrandSettings, "palette" | "aluxPalette" | "aluxCopy">;
  label: string;
  hint: string;
}> = [
  { key: "name", label: "Nombre de marca", hint: "Se usa en títulos y pie de página." },
  { key: "shortName", label: "Nombre corto", hint: "Versión breve para espacios reducidos." },
  { key: "tagline", label: "Lema", hint: "Frase territorial corta." },
  { key: "discoveryPromise", label: "Promesa de descubrimiento", hint: "Mensaje principal." },
  { key: "conciergeName", label: "Nombre del concierge", hint: "Asistente de la plataforma." },
  { key: "logoSrc", label: "Ruta del logotipo", hint: "Ruta interna existente (empieza con /)." },
];

const PALETTE_FIELDS: Array<{ key: keyof BrandPalette; label: string; group: string }> = [
  { key: "primary", label: "Color principal", group: "Acciones" },
  { key: "primaryForeground", label: "Texto sobre principal", group: "Acciones" },
  { key: "secondary", label: "Color secundario", group: "Acciones" },
  { key: "secondaryForeground", label: "Texto sobre secundario", group: "Acciones" },
  { key: "accent", label: "Color de acento", group: "Acciones" },
  { key: "accentForeground", label: "Texto sobre acento", group: "Acciones" },
  { key: "territory", label: "Color territorial", group: "Territorio" },
  { key: "territoryForeground", label: "Texto sobre territorial", group: "Territorio" },
  { key: "background", label: "Fondo general", group: "Superficies" },
  { key: "foreground", label: "Texto general", group: "Superficies" },
  { key: "card", label: "Fondo de tarjetas", group: "Superficies" },
  { key: "cardForeground", label: "Texto de tarjetas", group: "Superficies" },
  { key: "muted", label: "Fondo tenue", group: "Detalles" },
  { key: "mutedForeground", label: "Texto secundario", group: "Detalles" },
  { key: "border", label: "Bordes", group: "Detalles" },
  { key: "ring", label: "Foco y selección", group: "Detalles" },
];

const ALUX_PALETTE_FIELDS: Array<{ key: keyof AluxPalette; label: string }> = [
  { key: "primary", label: "Acción principal" },
  { key: "primaryForeground", label: "Texto de acción" },
  { key: "surface", label: "Fondo de paneles" },
  { key: "surfaceForeground", label: "Texto de paneles" },
  { key: "accent", label: "Acento editorial" },
  { key: "accentForeground", label: "Texto sobre acento" },
  { key: "border", label: "Bordes" },
  { key: "ring", label: "Foco y selección" },
  { key: "badge", label: "Insignia" },
  { key: "badgeForeground", label: "Texto de insignia" },
];

const ALUX_VOICE_LABELS: Record<keyof AluxVoice, string> = {
  shortDescriptor: "Descriptor corto",
  territorialDescriptor: "Descriptor territorial",
  conversationTitle: "Título de conversación",
  conversationDescription: "Descripción de conversación",
  publicIntro: "Introducción pública",
  inputPlaceholder: "Texto del campo de pregunta",
  sendLabel: "Etiqueta de envío",
  newConversation: "Nueva conversación",
  thinking: "Estado mientras responde",
  disclaimer: "Aviso de alcance",
  discoveryTitle: "Título de descubrimiento",
  discoveryBody: "Mensaje de descubrimiento",
  nearbyTitle: "Título de lugares cercanos",
  nearbyBody: "Mensaje de lugares cercanos",
  nearbyCta: "Acción de lugares cercanos",
  planCta: "Acción para planear",
  planningPrompt: "Opción: planeando",
  onsitePrompt: "Opción: en la región",
  workspaceTitle: "Título del copiloto",
  workspaceEmpty: "Estado vacío del copiloto",
  workspaceActionTitle: "Título de siguiente acción",
  workspaceOpen: "Abrir conversación",
  unavailable: "Mensaje no disponible",
  pageEyebrow: "Etiqueta de página",
  pageTitle: "Título de página",
  pageDescription: "Descripción de página",
  nextStepTitle: "Título de siguiente paso",
  nextStepReview: "Paso: revisar viaje",
  nextStepDetect: "Paso: detectar faltantes",
  nextStepNearby: "Paso: sugerir cercanía",
  viewTrip: "Acción: ver viaje",
  humanConciergeTitle: "Título de concierge humano",
  humanConciergeBody: "Descripción de concierge humano",
  conciergeSentTitle: "Confirmación de envío al concierge",
  conciergeSentBody: "Mensaje de Alux después del envío",
  conciergeWaitingTitle: "Título durante la espera",
  conciergeWaitingBody: "Mensaje durante la espera",
  conciergeProposalReadyTitle: "Título cuando llega una propuesta",
  conciergeProposalReadyBody: "Mensaje de Alux con propuesta disponible",
  prepareTrip: "Acción: preparar viaje",
  retry: "Acción: reintentar",
  loadingTrip: "Estado: cargando viaje",
  tripLoadError: "Error al cargar viaje",
  suggestedQuestions: "Etiqueta de preguntas sugeridas",
  travelerPanelTitle: "Título del panel del viajero",
  travelerPanelDescription: "Descripción del panel del viajero",
  profilePromptTitle: "Título para completar perfil",
  profilePromptBody: "Mensaje para completar perfil",
  completeProfile: "Acción: completar perfil",
  completePublicProfile: "Acción: completar perfil público",
  suggestionReady: "Estado: sugerencia lista",
  nearbySectionTitle: "Título de cercanía",
  locationTitle: "Título de ubicación",
  locationBody: "Mensaje de ubicación",
  shareLocation: "Acción: compartir ubicación",
  requestingLocation: "Estado: solicitando ubicación",
  locationDenied: "Estado: ubicación denegada",
  locationUnavailable: "Estado: ubicación no disponible",
  contextTitle: "Título de contexto",
  exploreNearbyTitle: "Título de exploración cercana",
  catalogGrounding: "Aviso de procedencia del catálogo",
  activeCouponsTitle: "Título de cupones activos",
  promotionsTitle: "Título de promociones",
  profileAccuracyTitle: "Título de precisión de perfil",
  profileAccuracyBody: "Mensaje de precisión de perfil",
  publicStarterSeason: "Pregunta inicial: temporada",
  publicStarterDays: "Pregunta inicial: itinerario",
  publicStarterDestinations: "Pregunta inicial: destinos",
  publicStarterExperiences: "Pregunta inicial: experiencias",
  publicAvailability: "Disponibilidad pública",
  conversationMemory: "Aviso de conversación recordada",
  locationGranted: "Ubicación concedida",
  locationGeneral: "Recomendación sin ubicación",
  locationNearbyCta: "Acción de ubicación cercana",
  createAccount: "Acción de crear cuenta",
  proposalFooter: "Aviso de propuestas",
  suggestionEyebrow: "Encabezado de sugerencia",
  suggestionSafety: "Aviso de seguridad de sugerencia",
  suggestionWhy: "Etiqueta de explicación",
  suggestionAction: "Etiqueta de acción disponible",
  sourcesTitle: "Título de fuentes",
  sourcesEmpty: "Estado sin fuentes",
  proposalsTitle: "Título de propuestas",
  proposalsDisclaimer: "Aviso de propuestas",
  proposalsWhy: "Acción para ver explicación",
  proposalsHideWhy: "Acción para ocultar explicación",
  workspaceNoActions: "Estado sin acciones",
  workspaceReversible: "Etiqueta reversible",
  workspaceWhy: "Acción de explicación",
  workspaceRationale: "Etiqueta de razón",
  workspaceEffect: "Etiqueta de efecto",
  workspaceSources: "Etiqueta de fuentes",
  memoryTitle: "Título de memoria",
  memoryPaused: "Estado de memoria pausada",
  memoryActive: "Estado de memoria activa",
  memoryDescription: "Descripción de memoria",
  memoryGeneral: "Estado de recomendaciones generales",
  memorySignals: "Estado de señales recordadas",
  memoryPreserved: "Aviso de elementos preservados",
  memoryResume: "Acción de reactivar memoria",
  memoryPause: "Acción de pausar memoria",
  memoryForget: "Acción de borrar memoria",
  memoryConfirm: "Confirmación de borrado",
  memoryCancel: "Cancelación de borrado",
};

function BrandSettingsPage() {
  const fetchBrand = useServerFn(getBrandSettingsAdmin);
  const saveBrand = useServerFn(updateBrandSettings);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandSettings>(BRAND_SETTINGS_DEFAULTS);
  const [aluxLocale, setAluxLocale] = useState<LocaleCode>("es");
  const contrastChecks = paletteContrastChecks(form.palette);
  const paletteIsAccessible = contrastChecks.every((check) => check.pass);
  const aluxContrastChecks = aluxPaletteContrastChecks(form.aluxPalette);
  const aluxPaletteIsAccessible = aluxContrastChecks.every((check) => check.pass);

  const brandQ = useQuery({
    queryKey: ["admin", "brand", "identity"],
    queryFn: () => fetchBrand(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (brandQ.data) setForm(brandQ.data);
  }, [brandQ.data]);

  const save = useMutation({
    mutationFn: (values: BrandSettings) => saveBrand({ data: values }),
    onSuccess: (saved) => {
      setForm(saved);
      queryClient.invalidateQueries({ queryKey: ["admin", "brand", "identity"] });
      queryClient.invalidateQueries({ queryKey: ["public", "brand", "identity"] });
      toast.success("Configuración de marca guardada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-border pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">Marca</p>
        <h1 className="mt-2 text-3xl font-semibold">Identidad de marca</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fuente única de verdad de la identidad editorial. Los campos vienen precargados con los
          valores actuales del sitio: si se dejan tal cual, nada cambia en las páginas públicas.
        </p>
      </header>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form);
        }}
      >
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={`brand-${field.key}`}>{field.label}</Label>
            <Input
              id={`brand-${field.key}`}
              value={form[field.key]}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
              }
              disabled={brandQ.isLoading || save.isPending}
            />
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          </div>
        ))}

        <section className="space-y-5 border-t border-border pt-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              Paleta global
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Colores del sitio</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Estos colores alimentan los tokens compartidos de páginas, plantillas Premium,
              navegación, botones, tarjetas, Alux y Mi Viaje.
            </p>
          </div>

          {["Acciones", "Territorio", "Superficies", "Detalles"].map((group) => (
            <fieldset key={group} className="rounded-2xl border border-border p-4">
              <legend className="px-2 text-sm font-semibold">{group}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {PALETTE_FIELDS.filter((field) => field.group === group).map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={`brand-palette-${field.key}`}>{field.label}</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id={`brand-palette-${field.key}`}
                        type="color"
                        className="h-11 w-16 cursor-pointer p-1"
                        value={form.palette[field.key]}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            palette: { ...previous.palette, [field.key]: event.target.value },
                          }))
                        }
                        disabled={brandQ.isLoading || save.isPending}
                      />
                      <Input
                        aria-label={`${field.label} hexadecimal`}
                        value={form.palette[field.key]}
                        pattern="#[0-9a-fA-F]{6}"
                        maxLength={7}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            palette: { ...previous.palette, [field.key]: event.target.value },
                          }))
                        }
                        disabled={brandQ.isLoading || save.isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          ))}

          <div
            className="rounded-2xl border border-border p-5"
            style={brandPaletteStyle(form.palette)}
          >
            <div className="rounded-xl bg-background p-5 text-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Vista previa
              </p>
              <h3 className="mt-2 text-2xl font-semibold">{form.name}</h3>
              <p className="mt-1 text-muted-foreground">{form.tagline}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Acción principal
                </span>
                <span className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground">
                  Acción secundaria
                </span>
                <span className="rounded-full bg-selva px-4 py-2 text-sm font-semibold text-selva-foreground">
                  Territorio
                </span>
              </div>
              <div className="mt-5 rounded-xl border border-border bg-card p-4 text-card-foreground">
                Tarjeta compacta de ejemplo
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2" aria-live="polite">
            {contrastChecks.map((check) => (
              <p
                key={check.label}
                className={`rounded-lg px-3 py-2 text-sm ${
                  check.pass ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
                }`}
              >
                {check.pass ? "PASS" : "Revisar"} · {check.label}: {check.ratio.toFixed(2)}:1
              </p>
            ))}
          </div>
          {!paletteIsAccessible ? (
            <p className="text-sm font-medium text-destructive">
              Ajusta las combinaciones marcadas: se requiere contraste mínimo 4.5:1 para guardar.
            </p>
          ) : null}
        </section>

        <section className="space-y-5 border-t border-border pt-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
              Interfaz de Alux
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Color y voz por marca</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Configura la interfaz sin modificar la ilustración, el modelo, las reglas ni los datos.
            </p>
          </div>

          <fieldset className="rounded-2xl border border-border p-4">
            <legend className="px-2 text-sm font-semibold">Paleta de Alux</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {ALUX_PALETTE_FIELDS.filter((field) => ALUX_PALETTE_KEYS.includes(field.key)).map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`alux-palette-${field.key}`}>{field.label}</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id={`alux-palette-${field.key}`}
                      type="color"
                      className="h-11 w-16 cursor-pointer p-1"
                      value={form.aluxPalette[field.key]}
                      onChange={(event) => setForm((previous) => ({
                        ...previous,
                        aluxPalette: { ...previous.aluxPalette, [field.key]: event.target.value },
                      }))}
                      disabled={brandQ.isLoading || save.isPending}
                    />
                    <Input
                      aria-label={`${field.label} hexadecimal`}
                      value={form.aluxPalette[field.key]}
                      pattern="#[0-9a-fA-F]{6}"
                      maxLength={7}
                      onChange={(event) => setForm((previous) => ({
                        ...previous,
                        aluxPalette: { ...previous.aluxPalette, [field.key]: event.target.value },
                      }))}
                      disabled={brandQ.isLoading || save.isPending}
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2" aria-live="polite">
            {aluxContrastChecks.map((check) => (
              <p key={check.label} className={`rounded-lg px-3 py-2 text-sm ${check.pass ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"}`}>
                {check.pass ? "PASS" : "Revisar"} · {check.label}: {check.ratio.toFixed(2)}:1
              </p>
            ))}
          </div>

          <div className="rounded-2xl border border-border p-5" style={aluxPaletteStyle(form.aluxPalette)}>
            <div className="rounded-xl border border-alux-border bg-alux-surface p-5 text-alux-surface-foreground">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-alux-accent">Vista previa de Alux</p>
              <h3 className="mt-2 text-xl font-semibold">
                {fillAluxCopy(form.aluxCopy[aluxLocale].conversationTitle, { name: form.conciergeName, territory: form.tagline })}
              </h3>
              <p className="mt-2 text-sm">
                {fillAluxCopy(form.aluxCopy[aluxLocale].conversationDescription, { name: form.conciergeName, territory: form.tagline })}
              </p>
              <Button type="button" className="mt-4 rounded-full bg-alux px-4 py-2 text-sm font-semibold text-alux-foreground hover:bg-alux/90">
                {fillAluxCopy(form.aluxCopy[aluxLocale].planCta, { name: form.conciergeName, territory: form.tagline })}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Idioma de la voz de Alux">
              {ACTIVE_LOCALES.map((locale) => (
                <button
                  key={locale.code}
                  type="button"
                  role="tab"
                  aria-selected={aluxLocale === locale.code}
                  onClick={() => setAluxLocale(locale.code)}
                  className={aluxLocale === locale.code ? "rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background" : "rounded-full border border-border px-3 py-2 text-xs font-medium"}
                >
                  {locale.native_label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Variables disponibles: {"{name}"}, {"{territory}"}, {"{destination}"}, {"{count}"} y {"{distance}"}. Español es la reserva segura.
            </p>
            <div className="grid gap-4">
              {ALUX_VOICE_KEYS.map((key) => (
                <div key={`${aluxLocale}-${key}`} className="space-y-2">
                  <Label htmlFor={`alux-copy-${aluxLocale}-${key}`}>{ALUX_VOICE_LABELS[key]}</Label>
                  <textarea
                    id={`alux-copy-${aluxLocale}-${key}`}
                    value={form.aluxCopy[aluxLocale][key]}
                    maxLength={500}
                    rows={form.aluxCopy[aluxLocale][key].length > 100 ? 3 : 2}
                    onChange={(event) => setForm((previous) => ({
                      ...previous,
                      aluxCopy: {
                        ...previous.aluxCopy,
                        [aluxLocale]: { ...previous.aluxCopy[aluxLocale], [key]: event.target.value },
                      },
                    }))}
                    disabled={brandQ.isLoading || save.isPending}
                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={save.isPending || brandQ.isLoading || !paletteIsAccessible || !aluxPaletteIsAccessible}
          >
            {save.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={save.isPending}
            onClick={() => setForm(BRAND_SETTINGS_DEFAULTS)}
          >
            Restaurar valores actuales
          </Button>
        </div>
      </form>
    </div>
  );
}
