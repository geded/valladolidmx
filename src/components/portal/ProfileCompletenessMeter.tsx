/**
 * «Tu ficha para Alux» — medidor de avance de la ficha (Fase A).
 *
 * Muestra el porcentaje, lo que falta y el beneficio de cada punto, con un
 * acceso a la pantalla del Portal donde se completa. Antes de navegar fija
 * la empresa activa con el mismo mecanismo del selector del Portal.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProfileCompleteness } from "@/lib/visibility/profile-completeness";

const STORAGE_KEY = "valladolidmx.portal.activeBusinessId";

function selectBusiness(businessId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, businessId);
  window.dispatchEvent(new CustomEvent("portal:active-business-changed", { detail: businessId }));
}

function headline(percent: number): string {
  if (percent >= 100) return "Tu ficha está completa: Alux tiene todo para recomendarte.";
  if (percent >= 70) return "Vas muy bien. Unos detalles más y Alux te recomendará con más confianza.";
  if (percent >= 40) return "Completa tu ficha para que Alux te recomiende más seguido.";
  return "Alux casi no tiene datos de tu empresa todavía. Empieza por lo que falta abajo.";
}

export function ProfileCompletenessMeter({
  businessId,
  completeness,
  defaultOpen = completeness.percent < 100,
}: {
  businessId: string;
  completeness: ProfileCompleteness;
  /** Abierto al cargar (el Portal lo cierra cuando hay muchas empresas). */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const pending = completeness.items.filter((i) => i.status !== "done");
  const done = completeness.items.filter((i) => i.status === "done");

  return (
    <section
      aria-label="Tu ficha para Alux"
      className="mt-4 rounded-md border border-border bg-background p-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Tu ficha para Alux
        </span>
        <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
          {completeness.percent} %
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>
      <Progress
        value={completeness.percent}
        className="mt-2"
        aria-label={`Ficha completa al ${completeness.percent} %`}
      />
      <p className="mt-2 text-xs text-muted-foreground">{headline(completeness.percent)}</p>

      {open && (
        <div className="mt-3 space-y-2">
          {pending.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.label}</p>
                  {item.missing && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.missing}</p>
                  )}
                  <p className="mt-1 text-xs text-foreground/80">{item.benefit}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  +{item.maxPoints - item.points} %
                </span>
              </div>
              {item.portalPath && (
                <Link
                  to={item.portalPath}
                  onClick={() => selectBusiness(businessId)}
                  className="mt-2 inline-flex min-h-9 items-center rounded-pill border border-primary/40 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  Completar
                </Link>
              )}
            </div>
          ))}
          {done.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              Listo: {done.map((i) => i.label).join(" · ")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
