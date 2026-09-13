/**
 * JourneyBackLink — Continuidad del recorrido (Navigation Blueprint v1.0).
 *
 * Muestra el paso anterior real del explorador (Arma tu Viaje, Alux, Mapa…)
 * en superficies operativas que no exponen breadcrumb territorial, para que
 * nunca pierda el hilo de su recorrido. Sólo lectura del journey trail; no
 * compone rutas nuevas ni sustituye la navegación del Workspace Engine.
 */
import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { readJourneyPrefix, type JourneyStep } from "@/lib/navigation/session-context";

export function JourneyBackLink({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [origin, setOrigin] = useState<JourneyStep | null>(null);

  useEffect(() => {
    const trail = readJourneyPrefix(pathname);
    setOrigin(trail.at(-1) ?? null);
  }, [pathname]);

  if (!origin) return null;

  return (
    <Link
      to={origin.path}
      className={`inline-flex min-h-10 items-center gap-2 text-sm font-medium text-primary hover:underline ${className ?? ""}`}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Volver a {origin.label}
    </Link>
  );
}
