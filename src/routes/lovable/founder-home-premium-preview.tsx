import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import {
  HomePremiumFooter,
  HomePremiumHeader,
  HomePremiumSurface,
  type HomePremiumHeroVariant,
} from "@/components/home-premium/HomePremiumSurface";
import { Container } from "@/components/layout/Container";
import { HOME_PREMIUM_PREVIEW_CONTENT } from "./g4-home-premium-preview";

export const Route = createFileRoute("/lovable/founder-home-premium-preview")({
  head: () => ({
    meta: [
      { title: "Home Premium · Valladolid.mx · Editorial/Cinematográfica" },
      {
        name: "description",
        content: "Vista limpia de aprobación de la Home Premium de Valladolid.mx.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: FounderHomePremiumPreview,
});

function FounderHomePremiumPreview() {
  const [presentation, setPresentation] = useState<HomePremiumHeroVariant>("editorial");

  return (
    <div
      className="min-h-svh overflow-x-clip bg-background pb-16"
      data-founder-preview="home-premium"
      data-premium-direction={presentation}
    >
      <HomePremiumHeader />
      <Container className="pt-4 sm:pt-5">
        <div
          className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between"
          aria-label="Presentación de la Home Premium"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Vista de aprobación
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mismo contenido y navegación; cambian el orden, la densidad y el protagonismo
              fotográfico de toda la composición.
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-pill border border-border bg-muted p-1">
            <PresentationButton
              active={presentation === "editorial"}
              onClick={() => setPresentation("editorial")}
              icon={<Sun className="size-4" aria-hidden />}
            >
              Editorial
            </PresentationButton>
            <PresentationButton
              active={presentation === "cinematic"}
              onClick={() => setPresentation("cinematic")}
              icon={<Moon className="size-4" aria-hidden />}
            >
              Cinematográfica
            </PresentationButton>
          </div>
        </div>
      </Container>

      <HomePremiumSurface
        content={HOME_PREMIUM_PREVIEW_CONTENT}
        heroVariant={presentation}
        layout="asimetrica"
      />

      <HomePremiumFooter />
    </div>
  );
}

function PresentationButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-pill px-4 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? "bg-background text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
