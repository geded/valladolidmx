/**
 * G4-A · Vista previa visual del micrositio de destino (Valladolid).
 *
 * G8-E · Esta vista ya NO contiene JSX propio del micrositio: consume la
 * autoridad visual compartida `DestinationPremiumSurface`, el mismo
 * componente que renderizan Studio y producción vía el bloque compuesto
 * `vmx.destination.premium-g4`. Aquí sólo viven el ribbon interno, la nota
 * de gobernanza y el panel local de afinación (sin persistencia).
 *
 * Reglas conservadas:
 *  - Sólo medios gobernados existentes vía la ruta pública estable.
 *  - Mapa exclusivamente con el bloque oficial `ExperienceMapBlock`.
 *  - Iconografía de categorías con los glifos bordados G6.
 *  - Pueblo Mágico se resuelve desde el registro institucional y su
 *    marca oficial acreditada.
 *  - Vista interna, no indexable y sin persistencia.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/utils";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";
import { PremiumPresentationControl } from "@/components/premium";
import {
  DestinationPremiumSurface,
  type DestinationGalleryLayout,
} from "@/components/destination-premium/DestinationPremiumSurface";
import { DESTINATION_PREMIUM_G4_CONTENT } from "@/components/destination-premium/destination-premium-content";

export const Route = createFileRoute("/lovable/g4-destination-microsite-preview")({
  head: () => ({
    meta: [
      { title: "G4-A · Vista previa micrositio Valladolid (interna)" },
      {
        name: "description",
        content: "Vista previa interna del micrositio premium de Valladolid. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G4DestinationMicrositePreview,
});

type VisualDirection = PremiumPresentation;
type RoleView = "visitante" | "administracion";

interface TuningState {
  direction: VisualDirection;
  gallery: DestinationGalleryLayout;
  showDescription: boolean;
  showGallery: boolean;
  showMap: boolean;
  showNearby: boolean;
  role: RoleView;
}

const PREVIEW_CONTENT = {
  ...DESTINATION_PREMIUM_G4_CONTENT,
  hero: {
    ...DESTINATION_PREMIUM_G4_CONTENT.hero,
    cover: {
      url: "/api/public/studio-media/conceptual-preview/2026-09-01/valladolid-san-servacio-hero-preview.webp",
      alt: "Vista editorial generada para preview de la catedral de San Servacio y la plaza de Valladolid al atardecer",
    },
  },
};

function G4DestinationMicrositePreview() {
  const [tuning, setTuning] = useState<TuningState>({
    direction: "editorial",
    gallery: "mosaico",
    showDescription: true,
    showGallery: true,
    showMap: true,
    showNearby: true,
    role: "visitante",
  });

  return (
    <div className="min-h-screen bg-background">
      <PreviewRibbon />

      {tuning.role === "administracion" ? (
        <Container className="pt-6">
          <GovernanceNote />
        </Container>
      ) : null}

      <DestinationPremiumSurface
        content={PREVIEW_CONTENT}
        heroVariant={tuning.direction === "cinematic" ? "cinematic" : "editorial"}
        galleryLayout={tuning.gallery}
        sections={{
          descubre: tuning.showDescription,
          gallery: tuning.showGallery,
          map: tuning.showMap,
          nearby: tuning.showNearby,
        }}
      />

      <TuningPanel value={tuning} onChange={setTuning} />
    </div>
  );
}

function PreviewRibbon() {
  return (
    <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
      Vista previa interna G4-A · Micrositio de destino (Valladolid) · medio hero generado para
      visualización, reemplazo requerido — no indexable, sin persistencia. No modifica páginas
      públicas ni el CMS.
    </div>
  );
}

/** Gobernanza editorial del destino (sólo vista Administración). */
function GovernanceNote() {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        Permisos editoriales
      </p>
      <h2 className="mt-1 font-serif text-xl tracking-tight">
        Destino, Inicio y Región: administrables sólo por Administración
      </h2>
      <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <li>· La dirección visual y la galería del destino las define Administración.</li>
        <li>· El propietario de una ficha no edita superficies territoriales.</li>
        <li>· Nada se publica automáticamente: requiere revisión y aprobación.</li>
      </ul>
      <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        DEMO VISUAL · vista interna sin persistencia
      </p>
    </section>
  );
}

function TuningPanel({
  value,
  onChange,
}: {
  value: TuningState;
  onChange: (v: TuningState) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TuningState>(k: K, v: TuningState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(20rem,calc(100vw-2rem))]">
      {open ? (
        <div className="rounded-3xl border border-border bg-card/95 p-4 shadow-floating backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Afinar micrositio</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Sólo evaluación visual. No guarda nada en base de datos ni en el CMS.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Vista simulada
              </p>
              <div className="mt-2 grid gap-2">
                {(
                  [
                    ["visitante", "Visitante"],
                    ["administracion", "Administración Valladolid.mx"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("role", key)}
                    aria-pressed={value.role === key}
                    className={cn(
                      "rounded-2xl border px-3 py-2 text-xs transition-colors",
                      value.role === key
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {value.role === "visitante" ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
                La vista Visitante muestra únicamente el resultado limpio. Los controles de
                dirección visual y galería sólo están disponibles para Administración.
              </p>
            ) : (
              <>
                <PremiumPresentationControl
                  value={value.direction}
                  onChange={(next) => set("direction", next)}
                />

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Galería
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ["mosaico", "Mosaico"],
                        ["carrusel", "Carrusel"],
                        ["cuadricula", "Cuadrícula"],
                        ["tira", "Tira"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => set("gallery", key)}
                        aria-pressed={value.gallery === key}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs transition-colors",
                          value.gallery === key
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Toggle
              label="Descripción del destino"
              checked={value.showDescription}
              onChange={(v) => set("showDescription", v)}
            />
            <Toggle
              label="Galería"
              checked={value.showGallery}
              onChange={(v) => set("showGallery", v)}
            />
            <Toggle label="Mapa" checked={value.showMap} onChange={(v) => set("showMap", v)} />
            <Toggle
              label="Destinos cercanos"
              checked={value.showNearby}
              onChange={(v) => set("showNearby", v)}
            />
          </div>
        </div>
      ) : (
        <Button className="rounded-pill shadow-floating" onClick={() => setOpen(true)}>
          <Building2 className="mr-2 size-4" aria-hidden />
          Afinar micrositio
        </Button>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-3 py-2 text-xs hover:bg-accent"
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-5 w-9 items-center rounded-pill p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-pill bg-background transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
