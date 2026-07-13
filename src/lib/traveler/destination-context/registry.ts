/**
 * CV6.4 · Destination Context Registry.
 *
 * Registro in-memory (SSR-safe) de Contributors. La arquitectura evita
 * que superficies importen proveedores concretos: consumen únicamente
 * el resolver + el Context Engine.
 *
 * Regla vinculante: prohibido bypassear el registry desde superficies
 * (ver `mem://policies/founder-destination-context-engine.md`).
 */
import type {
  DestinationContextContributor,
  DestinationSignalKind,
} from "./types";

const registry = new Map<string, DestinationContextContributor>();

export function registerDestinationContributor(
  contributor: DestinationContextContributor,
): () => void {
  registry.set(contributor.id, contributor);
  return () => {
    registry.delete(contributor.id);
  };
}

export function listDestinationContributors(): DestinationContextContributor[] {
  return Array.from(registry.values());
}

export function getContributorsByKind(
  kind: DestinationSignalKind,
): DestinationContextContributor[] {
  return listDestinationContributors().filter((c) => c.kind === kind);
}

export function clearDestinationContributors(): void {
  registry.clear();
}
