import {
  HOME_PREMIUM_G4_CONTRACT_VERSION,
  homePremiumG4DefaultConfig,
} from "@/components/home-premium/home-premium-config";
import type { CompositionNode, CompositionTree } from "./composition-tree";

const HOME_PREMIUM_BLOCK_TYPE = "vmx.home.premium-g4";

function isCompositionTree(value: unknown): value is CompositionTree {
  if (!value || typeof value !== "object") return false;
  const root = (value as { root?: unknown }).root;
  return Boolean(
    root &&
      typeof root === "object" &&
      Array.isArray((root as { children?: unknown }).children),
  );
}

/**
 * Conserva exclusivamente la autoridad Home Premium publicada y su config CMS.
 * Los bloques hermanos heredados no pueden volver a mezclarse en producción ni
 * en el preview del Studio.
 */
export function resolveHomePremiumAuthorityTree(snapshot: unknown): CompositionTree | null {
  if (!isCompositionTree(snapshot)) return null;
  const premiumNode = snapshot.root.children.find(
    (node): node is CompositionNode => node.type === HOME_PREMIUM_BLOCK_TYPE && !node.hidden,
  );
  if (!premiumNode) return null;
  return {
    root: { children: [premiumNode] },
    chrome: snapshot.chrome,
  };
}

/** Misma autoridad de render, sin contenido inventado, cuando no hay snapshot válido. */
export const HOME_PREMIUM_FALLBACK_TREE: CompositionTree = {
  root: {
    children: [
      {
        id: "home-premium-g4-runtime-fallback",
        type: HOME_PREMIUM_BLOCK_TYPE,
        version: HOME_PREMIUM_G4_CONTRACT_VERSION,
        config: homePremiumG4DefaultConfig(),
      },
    ],
  },
};
