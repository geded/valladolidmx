/**
 * Lecturas por lotes para listas grandes de ids.
 *
 * Con cientos de empresas por destino, un solo `.in("id", ids)` vuelve la
 * URL de la consulta demasiado larga. Se divide en lotes fijos y se unen
 * los resultados en el mismo orden de los lotes.
 */
export const IN_CHUNK_SIZE = 150;

export function chunkIds<T>(items: readonly T[], size: number = IN_CHUNK_SIZE): T[][] {
  if (size <= 0) throw new Error("chunk_size_invalid");
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Ejecuta `run` por lote y concatena `data`; un lote fallido no anula los demás. */
export async function selectInChunks<R>(
  ids: readonly string[],
  run: (chunk: string[]) => PromiseLike<{ data: R[] | null; error: unknown }>,
  size: number = IN_CHUNK_SIZE,
): Promise<R[]> {
  if (ids.length === 0) return [];
  const results = await Promise.all(chunkIds(ids, size).map((c) => run(c)));
  const rows: R[] = [];
  for (const r of results) if (r.data) rows.push(...r.data);
  return rows;
}
