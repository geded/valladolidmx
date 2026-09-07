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
  brandPaletteStyle,
  paletteContrastChecks,
  type BrandPalette,
} from "@/lib/brand/brand-theme";

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
  key: keyof Omit<BrandSettings, "palette">;
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

function BrandSettingsPage() {
  const fetchBrand = useServerFn(getBrandSettingsAdmin);
  const saveBrand = useServerFn(updateBrandSettings);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandSettings>(BRAND_SETTINGS_DEFAULTS);
  const contrastChecks = paletteContrastChecks(form.palette);
  const paletteIsAccessible = contrastChecks.every((check) => check.pass);

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

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={save.isPending || brandQ.isLoading || !paletteIsAccessible}
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
