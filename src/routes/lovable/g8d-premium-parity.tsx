/**
 * G8-D · Evidencia de paridad — la Home Premium G4 renderizada a través del
 * bloque compuesto `vmx.home.premium-g4` y del `CompositionRenderer`.
 *
 * Ruta interna, no indexable, sin persistencia y sin datos remotos: sirve para
 * comparar contra `/lovable/g4-home-premium-preview` (misma autoridad visual).
 */
import { createFileRoute } from "@tanstack/react-router";
import { CompositionRenderer } from "@/lib/experience-builder/composition-renderer";
import type { CompositionTree } from "@/lib/experience-builder/composition-tree";
import { Container } from "@/components/layout/Container";
import {
  HomePremiumFooter,
  HomePremiumHeader,
  HomePremiumRibbon,
} from "@/components/home-premium/HomePremiumSurface";
import {
  HOME_PREMIUM_G4_BLOCK_TYPE,
  HOME_PREMIUM_G4_CONTRACT_VERSION,
  homePremiumG4DefaultConfig,
} from "@/components/home-premium/home-premium-config";

export const Route = createFileRoute("/lovable/g8d-premium-parity")({
  head: () => ({
    meta: [
      { title: "G8-D · Paridad del bloque compuesto Home Premium (interna)" },
      {
        name: "description",
        content:
          "Evidencia interna de paridad entre la Home Premium G4 aprobada y el bloque compuesto vmx.home.premium-g4.",
      },
      { property: "og:title", content: "G8-D · Paridad Home Premium (interna)" },
      {
        property: "og:description",
        content: "Vista interna no indexable de paridad del bloque compuesto Home Premium G4.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: G8DPremiumParity,
});

const TREE: CompositionTree = {
  root: {
    id: "root",
    type: "vmx.layout.container",
    version: "1.0.0",
    config: {},
    children: [
      {
        id: "home-premium-g4",
        type: HOME_PREMIUM_G4_BLOCK_TYPE,
        version: HOME_PREMIUM_G4_CONTRACT_VERSION,
        config: homePremiumG4DefaultConfig(),
        children: [],
      },
    ],
  },
};

function G8DPremiumParity() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-20">
      {/* Chrome global aportado por el shell, nunca por el bloque. */}
      <HomePremiumRibbon label="G8-D · Render del bloque compuesto vmx.home.premium-g4 · demo visual · sin persistencia" />
      <HomePremiumHeader />
      <CompositionRenderer tree={TREE} />
      <Container className="mt-8">
        <HomePremiumFooter />
      </Container>
    </div>
  );
}
