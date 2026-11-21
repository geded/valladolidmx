/**
 * Pestañas de la sección Reservaciones del Centro Concierge:
 * «Reservaciones y pagos» y «Preventa».
 */
import { Link } from "@tanstack/react-router";

const TABS = [
  { to: "/concierge/reservaciones", label: "Reservaciones" },
  { to: "/concierge/preventa", label: "Preventa" },
] as const;

export function ReservationsTabs({ active }: { active: (typeof TABS)[number]["to"] }) {
  return (
    <nav aria-label="Secciones de reservaciones" className="flex gap-1 border-b border-border">
      {TABS.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          aria-current={active === t.to ? "page" : undefined}
          className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold ${
            active === t.to
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
