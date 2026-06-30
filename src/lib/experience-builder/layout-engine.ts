/**
 * Experience Builder · Layout Engine (Etapa 15.10.2)
 *
 * El Layout Engine separa la **estructura visual** (filas, columnas,
 * contenedores, secciones, espaciadores) del **contenido** (heros,
 * tarjetas, secciones temáticas). Reconoce qué bloques del Block
 * Registry son contenedores y delega su composición al renderer
 * universal sin que los bloques individuales conozcan el layout.
 *
 * Este módulo NO importa páginas concretas. Es válido para Home,
 * Landing Pages, Páginas Institucionales, Destinos, Empresas,
 * Productos, Campañas y cualquier superficie futura.
 */

const CONTAINER_BLOCK_TYPES = new Set<string>([
  "vmx.layout.container",
  "vmx.layout.section",
]);

/** ¿Este tipo de bloque acepta hijos del Layout Engine? */
export function isContainerBlock(type: string): boolean {
  return CONTAINER_BLOCK_TYPES.has(type);
}

/** Registra un nuevo tipo de contenedor sin tocar el núcleo del Engine. */
export function registerContainerType(type: string): void {
  CONTAINER_BLOCK_TYPES.add(type);
}

/** Lista de tipos contenedores conocidos (debug / Studio). */
export function listContainerTypes(): string[] {
  return Array.from(CONTAINER_BLOCK_TYPES);
}