import { createFileRoute, Link } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { F1K_DESTINATION_SLUGS } from "@/lib/omxds/pilot-allowlist";

const LABELS: Record<(typeof F1K_DESTINATION_SLUGS)[number], string> = {
  valladolid: "Valladolid",
  izamal: "Izamal",
  espita: "Espita",
  "ek-balam": "Ek Balam",
  "rio-lagartos": "Río Lagartos",
  "las-coloradas": "Las Coloradas",
  uayma: "Uayma",
};

export const Route = createFileRoute("/preview/f1k-destinations")({
  head: () => ({
    meta: [
      { title: "Destinos G4 · Revisión Founder" },
      {
        name: "description",
        content: "Hub privado de certificación visual G4 para siete destinos reales.",
      },
      { property: "og:title", content: "Destinos G4 · Revisión Founder" },
      {
        property: "og:description",
        content: "Hub privado de certificación visual G4 para siete destinos reales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: F1kDestinationHub,
});

function F1kDestinationHub() {
  return (
    <main className="min-h-screen bg-background py-12 text-foreground">
      <Container>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          G8-R1-F1K · Preview
        </p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Destinos Premium G4</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Siete rutas reales en modo Editorial. La ausencia de portada acreditada G8-M1 muestra el
          marcador piedra/caliza; nunca activa una superficie legacy.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {F1K_DESTINATION_SLUGS.map((slug) => (
            <li key={slug} className="rounded-lg border border-border bg-card p-5 shadow-soft">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Editorial · datos reales
              </p>
              <h2 className="mt-2 font-serif text-2xl">{LABELS[slug]}</h2>
              <Button asChild variant="outline" className="mt-5 w-full">
                <Link to="/oriente-maya/$destino" params={{ destino: slug }}>
                  Abrir ficha G4
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </Container>
    </main>
  );
}
