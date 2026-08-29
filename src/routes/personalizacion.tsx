/**
 * /personalizacion — Superficie pública única de control de memoria de Alux
 * (G8-R1-E-R1 · Fase 5). Accesible para anónimos y registrados. `noindex`:
 * es un control de cuenta, no contenido turístico.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AluxMemoryPanel } from "@/components/alux/AluxMemoryPanel";

export const Route = createFileRoute("/personalizacion")({
  head: () => ({
    meta: [
      { title: "Personalización y memoria de Alux | Valladolid.mx" },
      {
        name: "description",
        content:
          "Decide qué recuerda Alux de tu navegación: pausa la personalización, reactívala o borra lo aprendido en este dispositivo.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Personalización y memoria de Alux" },
      {
        property: "og:description",
        content: "Controla la personalización de tu copiloto de viajes en el Oriente Maya.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PersonalizacionPage,
});

function PersonalizacionPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      <h1 className="sr-only">Personalización y memoria de Alux</h1>
      <AluxMemoryPanel />
    </main>
  );
}
