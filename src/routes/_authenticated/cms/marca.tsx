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

const FIELDS: Array<{ key: keyof BrandSettings; label: string; hint: string }> = [
  { key: "name", label: "Nombre de marca", hint: "Se usa en títulos y pie de página." },
  { key: "shortName", label: "Nombre corto", hint: "Versión breve para espacios reducidos." },
  { key: "tagline", label: "Lema", hint: "Frase territorial corta." },
  { key: "discoveryPromise", label: "Promesa de descubrimiento", hint: "Mensaje principal." },
  { key: "conciergeName", label: "Nombre del concierge", hint: "Asistente de la plataforma." },
  { key: "logoSrc", label: "Ruta del logotipo", hint: "Ruta interna existente (empieza con /)." },
];

function BrandSettingsPage() {
  const fetchBrand = useServerFn(getBrandSettingsAdmin);
  const saveBrand = useServerFn(updateBrandSettings);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BrandSettings>(BRAND_SETTINGS_DEFAULTS);

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

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" disabled={save.isPending || brandQ.isLoading}>
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
