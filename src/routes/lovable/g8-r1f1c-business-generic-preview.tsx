/**
 * G8-R1-F1C-0 · Preview interno · EMPRESA TURÍSTICA GENÉRICA.
 *
 * Familia para artesanías, comercio turístico, agencia, transporte,
 * operador, servicio y negocio visitable. Adapta bloques según la
 * categoría y OMITE los vacíos: nunca se disfraza de hotel o restaurante
 * (sin habitaciones, sin menú, sin "abierto ahora" sin horario acreditado).
 *
 * Vista INTERNA, noindex, sin datos publicados, sin fotografía de terceros.
 */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Phone, Clock, Tag, Users, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import {
  PremiumHero,
  PremiumSection,
  PremiumTerritorialBreadcrumb,
  PremiumPresentationControl,
} from "@/components/premium";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export const Route = createFileRoute("/lovable/g8-r1f1c-business-generic-preview")({
  head: () => ({
    meta: [
      { title: "G8-R1-F1C · Preview interno · Empresa turística genérica" },
      {
        name: "description",
        content: "Vista previa interna de la familia empresa turística genérica. No indexable.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: BusinessGenericPreview,
});

/** Bloques declarados por categoría — se omiten cuando no hay dato. */
const CATEGORY_BLOCKS: Record<string, readonly string[]> = {
  artesanias: ["Taller y oficio", "Productos artesanales", "Visita al taller"],
  comercio: ["Qué encontrarás", "Productos destacados", "Cómo llegar"],
  agencia: ["Servicios", "Cobertura territorial", "Solicitar cotización"],
  transporte: ["Rutas y traslados", "Capacidad", "Solicitar traslado"],
  operador: ["Experiencias operadas", "Acreditaciones", "Contacto"],
  servicio: ["Servicios", "Cobertura", "Contacto"],
  visitable: ["Qué se visita", "Horarios", "Cómo llegar"],
};

const DEMO = {
  name: "Taller de urdido de hamacas (demo interna)",
  category: "artesanias" as const,
  eyebrow: "Empresa turística · artesanías (demo interna)",
  claim:
    "Ficha genérica de empresa turística: describe el oficio, lo que el visitante puede ver y cómo contactar, sin inventar precios ni disponibilidad.",
  facts: [
    { icon: MapPin, label: "Territorio", value: "Valladolid · Oriente Maya" },
    { icon: Tag, label: "Categoría", value: "Artesanías" },
    { icon: Users, label: "Atención", value: "Visita guiada bajo solicitud" },
    { icon: Clock, label: "Horarios", value: null },
    { icon: Phone, label: "Contacto", value: "Solicitud a través de la plataforma" },
    { icon: ShieldCheck, label: "Estado", value: "Ficha preliminar no reclamada" },
  ],
} as const;

function BusinessGenericPreview() {
  const [presentation, setPresentation] = useState<PremiumPresentation>("editorial");
  const blocks = CATEGORY_BLOCKS[DEMO.category] ?? CATEGORY_BLOCKS.servicio;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: DEMO.name,
    description: DEMO.claim,
    areaServed: "Valladolid, Yucatán",
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
          primaryAction: { label: "Contactar", href: "#contacto" },
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
          Preview interna G8-R1-F1C-0 · sin fotografía aprobada: marcador neutral y variante
          Cinematográfica fail-closed. Pendiente de aprobación visual del Founder.
        </p>
      </Container>

      <PremiumSection
        vm={{
          id: "esencial",
          eyebrow: "Lo esencial",
          title: "Datos acreditados",
          description: "Los campos sin acreditar se omiten en producción; aquí se marcan.",
        }}
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          {DEMO.facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Icon className="size-4" aria-hidden />
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-6">
                {value ?? <span className="text-muted-foreground">Se omite (sin acreditar)</span>}
              </dd>
            </div>
          ))}
        </dl>
      </PremiumSection>

      <PremiumSection
        vm={{
          id: "bloques",
          eyebrow: "Composición por categoría",
          title: "Bloques activos para esta categoría",
          description:
            "El adaptador enciende únicamente los bloques con sentido para la categoría de la empresa.",
        }}
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {blocks.map((b) => (
            <li key={b} className="rounded-2xl border border-border bg-card p-4 text-sm">
              {b}
            </li>
          ))}
        </ul>
      </PremiumSection>

      <PremiumSection vm={{ id: "contacto", eyebrow: "Contacto", title: "Cómo continuar" }} compact>
        <p className="text-sm text-muted-foreground">
          Contacto y reservación se resuelven con las acciones canónicas de superficie; no se
          publica teléfono ni precio sin acreditación.
        </p>
      </PremiumSection>

      <Container className="pb-16">
        <p className="text-xs text-muted-foreground">
          ¿Representas a este establecimiento?{" "}
          <span className="underline">Administra esta ficha</span> (enlace secundario al pie, sin
          badge de “no reclamada”).
        </p>
      </Container>
    </main>
  );
}
