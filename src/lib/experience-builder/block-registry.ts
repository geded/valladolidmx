/**
 * Experience Builder · Block Registry (Etapa 15.10.1)
 *
 * Registry in-memory que materializa la Block Library en código.
 * - Único mecanismo autorizado para conocer qué bloques existen.
 * - Extensibilidad declarativa: `registerBlock(contract)` → no requiere
 *   modificar el núcleo del Experience Builder (Block Marketplace Readiness).
 * - El núcleo NO conoce páginas, superficies ni editor; solo contratos.
 *
 * La persistencia de la Block Library vive en las tablas `block_definitions`
 * y `block_versions`. La sincronización Registry → DB se realiza mediante
 * el server function `syncBlockLibrary` (admin only).
 */

import {
  validateBlockContract,
  type BlockContract,
  type BlockCategory,
} from "./block-contract";

export class BlockRegistryError extends Error {}

const registry = new Map<string, BlockContract>();

/**
 * Registra (o reemplaza) un bloque en el Registry. Rechaza definiciones
 * inválidas con error explícito.
 */
export function registerBlock(contract: BlockContract): void {
  const v = validateBlockContract(contract);
  if (!v.valid) {
    throw new BlockRegistryError(
      `Invalid Block Contract for "${contract.type}":\n - ${v.errors.join("\n - ")}`,
    );
  }
  registry.set(contract.type, contract);
}

/** Devuelve el contrato de un bloque o `undefined` si no existe. */
export function getBlock(type: string): BlockContract | undefined {
  return registry.get(type);
}

/** Lista bloques registrados, opcionalmente filtrados por categoría. */
export function listBlocks(filter?: { category?: BlockCategory }): BlockContract[] {
  const all = Array.from(registry.values());
  if (!filter?.category) return all;
  return all.filter((b) => b.category === filter.category);
}

/** Limpia el Registry (uso interno para tests). */
export function _resetRegistryForTests(): void {
  registry.clear();
}

/**
 * Valida una configuración candidata contra el schema declarado del bloque.
 * Esta etapa entrega una validación estructural mínima; las etapas
 * posteriores (Studio, validador SEO) afinarán la validación de cada campo.
 */
export function validateConfig(
  type: string,
  config: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const contract = getBlock(type);
  if (!contract) return { valid: false, errors: [`unknown block type "${type}"`] };

  const errors: string[] = [];
  for (const [field, def] of Object.entries(contract.schema)) {
    const value = config[field];
    if (def.required && (value === undefined || value === null || value === "")) {
      errors.push(`field "${field}" is required`);
    }
  }
  // Rechazar campos no declarados (los Smart Blocks pueden recibir solo lo del schema).
  for (const key of Object.keys(config)) {
    if (!contract.schema[key]) errors.push(`unknown field "${key}" for block "${type}"`);
  }
  return { valid: errors.length === 0, errors };
}