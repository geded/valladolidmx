/**
 * Calentador de páginas públicas: decide qué direcciones del mapa del sitio
 * se visitan en cada ronda para que su copia compartida nunca esté vacía.
 * Las páginas principales van siempre; el resto rota por turnos.
 */
export const WARM_ALWAYS = ["/", "/oriente-maya", "/hoteles", "/restaurantes", "/experiencias"];
export const WARM_ROTATING_PER_RUN = 40;

export function sitemapPaths(xml: string): string[] {
  const out = new Set<string>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    try {
      const p = new URL(m[1]!).pathname;
      if (p.startsWith("/")) out.add(p.length > 1 ? p.replace(/\/$/, "") : p);
    } catch {
      /* dirección inválida */
    }
  }
  return [...out];
}

/** Lista de la ronda `run`: principales + una ventana rotativa del resto. */
export function warmPlan(all: string[], run: number, perRun = WARM_ROTATING_PER_RUN): string[] {
  const rest = all.filter((p) => !WARM_ALWAYS.includes(p));
  const picked: string[] = [];
  if (rest.length) {
    const start = (run * perRun) % rest.length;
    for (let i = 0; i < Math.min(perRun, rest.length); i++) picked.push(rest[(start + i) % rest.length]!);
  }
  return [...WARM_ALWAYS, ...picked];
}
