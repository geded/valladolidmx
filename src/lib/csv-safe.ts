/**
 * Celda CSV segura: neutraliza fórmulas de hoja de cálculo (=, +, -, @, tab, CR)
 * anteponiendo un apóstrofo y siempre entrecomilla el valor.
 */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
