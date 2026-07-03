/**
 * TripPlannerSurface — plantilla oficial de la página pública "Arma tu Viaje".
 *
 * US-R3 · Ola 1 (Singletons). Contenido del cuerpo de `/arma-tu-viaje`
 * desacoplado de la ruta para ser renderizable como bloque
 * `vmx.surface.trip-planner` desde una composición del Experience
 * Builder. Paridad visual y funcional 1:1. Rediseño en US-R4+.
 */
import { Link } from "@tanstack/react-router";
import { Compass, FileText, MessageCircle } from "lucide-react";
import { RequestConciergeButton } from "@/components/concierge/RequestConciergeButton";

export function TripPlannerSurface() {
  return (
    <>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          { Icon: Compass, t: "Guarda destinos", d: "Reúne lo que te llama de cada lugar." },
          { Icon: FileText, t: "Anota lo importante", d: "Fechas, intereses, viajeros, presupuesto." },
          { Icon: MessageCircle, t: "Tu concierge humano", d: "Lo recibe cuando estés listo. Nunca antes." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="rounded-2xl border border-border bg-card p-6">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold">{t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" aria-hidden />En preparación</span>
        <h2 className="mt-4 text-2xl">Tu expediente vive aquí</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Pronto podrás agregar destinos y experiencias desde cualquier tarjeta y
          enviarlos a un concierge humano para cotizar tu viaje.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/oriente-maya"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium transition-all hover:bg-accent active:scale-[0.98]"
          >
            Explorar destinos
          </Link>
          <RequestConciergeButton
            kind="travel_plan"
            summary="Solicitud inicial desde Arma tu Viaje"
            label="Solicitar concierge ahora"
          />
        </div>
      </div>
    </>
  );
}