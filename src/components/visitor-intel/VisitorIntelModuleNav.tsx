/**
 * CV8.3 · A6 — Menú de módulos del Centro de Inteligencia del Visitante.
 *
 * Presentación pura: no calcula nada ni crea superficies nuevas. Declara los
 * 12 módulos del blueprint y distingue los que ya están activos de los que
 * aún no tienen señales suficientes ("Se activará cuando…"). Jamás muestra
 * cifras inventadas.
 */
export interface IntelModuleEntry {
  readonly id: string;
  readonly label: string;
  /** Ancla dentro de la misma pantalla cuando el módulo está activo. */
  readonly anchor?: string;
  /** Condición declarada cuando aún no hay datos. */
  readonly pending?: string;
}

export const INTEL_MODULES: readonly IntelModuleEntry[] = [
  { id: "funnel", label: "Embudo del viaje", anchor: "mod-embudo" },
  { id: "anonymous", label: "Visitantes anónimos", anchor: "mod-anonimos" },
  { id: "conversion", label: "Conversión del journey", anchor: "mod-conversion" },
  { id: "plans", label: "Travel Plans", anchor: "mod-conversion" },
  { id: "alux", label: "Alux", anchor: "mod-conversion" },
  { id: "concierge", label: "Concierge", anchor: "mod-conversion" },
  { id: "businesses", label: "Empresas", anchor: "mod-embudo" },
  { id: "destinations", label: "Destinos", anchor: "mod-embudo" },
  {
    id: "revenue",
    label: "Ingresos",
    pending: "Se activará cuando haya reservas pagadas atribuidas en el periodo.",
  },
  {
    id: "onsite",
    label: "Permanencia en destino",
    pending: "Se activará cuando se registren señales de viajero en destino.",
  },
  {
    id: "ambassadors",
    label: "Embajadores",
    pending: "Se activará cuando se registren señales de recomendación post-viaje.",
  },
  { id: "alerts", label: "Alertas de conversión", anchor: "mod-conversion" },
];

export function VisitorIntelModuleNav() {
  return (
    <nav
      aria-label="Módulos del Centro de Inteligencia"
      className="rounded-2xl border border-border bg-surface p-3 sm:p-4"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Módulos
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {INTEL_MODULES.map((module) =>
          module.anchor ? (
            <li key={module.id}>
              <a
                href={`#${module.anchor}`}
                className="inline-flex rounded-pill border border-border bg-card px-3 py-1.5 text-xs font-medium ring-focus hover:border-primary"
              >
                {module.label}
              </a>
            </li>
          ) : (
            <li key={module.id}>
              <span
                title={module.pending}
                className="inline-flex cursor-help rounded-pill border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                {module.label} · pendiente
              </span>
            </li>
          ),
        )}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Los módulos pendientes se activan solos cuando existen las señales que necesitan; nunca
        muestran cifras estimadas.
      </p>
    </nav>
  );
}
