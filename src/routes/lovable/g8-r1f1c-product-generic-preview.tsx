/**
 * G8-R1-F1C-0 · Preview interno · PRODUCTO GENÉRICO.
 *
 * Familia para artesanía, entrada, alimento, servicio, producto comercial
 * y producto reservable no clasificado como experiencia/tour.
 * Diferencia explícitamente COMPRA, CONTACTO y RESERVACIÓN y nunca
 * inventa precio, stock ni disponibilidad.
 *
 * Vista INTERNA, noindex, sin datos publicados.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag, MessageSquare, CalendarCheck, Building2, Tag } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export const Route = createFileRoute("/lovable/g8-r1f1c-product-generic-preview")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Preview interno · Producto genérico" },
      {
        name: "description",
        content: "Vista previa interna de la familia producto genérico. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: ProductGenericPreview,
});

type ConversionMode = "comprar" | "contactar" | "reservar";

const DEMO = {
  name: "Hamaca de algodón urdida a mano (demo interna)",
  eyebrow: "Producto · artesanía (demo interna)",
  claim:
    "Ficha genérica de producto: describe qué es, quién lo elabora y cómo obtenerlo. Sin precio ni stock inventados.",
  operator: "Taller de urdido de hamacas (demo)",
  price: null as number | null,
  stock: null as number | null,
  mode: "contactar" as ConversionMode,
};

const MODES: Record<ConversionMode, { icon: typeof ShoppingBag; label: string; note: string }> = {
  comprar: {
    icon: ShoppingBag,
    label: "Comprar en línea",
    note: "Sólo disponible con precio acreditado y pago activo.",
  },
  contactar: {
    icon: MessageSquare,
    label: "Contactar al proveedor",
    note: "Modo por defecto cuando no hay precio ni disponibilidad acreditada.",
  },
  reservar: {
    icon: CalendarCheck,
    label: "Solicitar reservación",
    note: "Sólo con calendario o confirmación del operador.",
  },
};

function ProductGenericPreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");
  const active = MODES[DEMO.mode];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: DEMO.name,
    description: DEMO.claim,
    brand: { "@type": "Organization", name: DEMO.operator },
    // Sin `offers`: no se declara precio ni disponibilidad sin acreditar.
  };

  return (
    <main className="min-h-svh bg-background">
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PremiumHero
        vm={{
          presentation,
          crumbs: [
            { label: "Oriente Maya" },
            { label: "Valladolid" },
            { label: "Artesanías" },
            { label: DEMO.name },
          ],
          eyebrow: DEMO.eyebrow,
          title: DEMO.name,
          description: DEMO.claim,
          media: null,
          primaryAction: { label: active.label, href: "#conversion" },
          secondaryAction: { label: "Guardar en Mi Viaje", href: "#mi-viaje" },
        }}
      />

      <Container className="py-6">
        <PremiumTerritorialBreadcrumb
          crumbs={[{ label: "Oriente Maya" }, { label: "Valladolid" }, { label: DEMO.name }]}
        />
        <div className="mt-4">
          <PremiumPresentationControl value={presentation} onChange={setPresentation} />
        </div>
        <p className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Preview interna G8-R1-F1C-0 · marcador neutral sin fotografía aprobada. Pendiente de
          aprobación visual del Founder.
        </p>
      </Container>

      <PremiumSection
        vm={{ id: "ficha", eyebrow: "Ficha", title: "Datos del producto" }}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Building2 className="size-4" aria-hidden /> Proveedor
            </dt>
            <dd className="mt-2 text-sm">{DEMO.operator}</dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <Tag className="size-4" aria-hidden /> Precio y disponibilidad
            </dt>
            <dd className="mt-2 text-sm text-muted-foreground">
              {DEMO.price === null
                ? "Sin precio acreditado — se omite (no se inventa)"
                : `$${DEMO.price} MXN`}
              {DEMO.stock === null ? " · sin stock declarado" : ` · ${DEMO.stock} disponibles`}
            </dd>
          </div>
        </dl>
      </PremiumSection>

      <PremiumSection
        vm={{
          id: "conversion",
          eyebrow: "Conversión",
          title: "Compra, contacto o reservación",
          description: "Un solo modo activo por producto; los demás se omiten.",
        }}
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(MODES) as ConversionMode[]).map((key) => {
            const m = MODES[key];
            const Icon = m.icon;
            const on = key === DEMO.mode;
            return (
              <li
                key={key}
                className={`rounded-2xl border p-4 text-sm ${
                  on ? "border-primary bg-card shadow-soft" : "border-dashed border-border opacity-60"
                }`}
              >
                <p className="flex items-center gap-2 font-medium">
                  <Icon className="size-4" aria-hidden />
                  {m.label}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{m.note}</p>
              </li>
            );
          })}
        </ul>
      </PremiumSection>
    </main>
  );
}
