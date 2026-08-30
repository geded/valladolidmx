/**
 * G8-R1-E-R1 · Fase 5 — Superficie ÚNICA "Personalización y memoria".
 *
 * Sin modales repetitivos: el viajero decide aquí, cuando quiere. Funciona
 * igual para visitantes anónimos (memoria local) y registrados.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { useAluxMemory } from "@/lib/alux/use-alux-memory";
import { ALUX_SIGNAL_TTL_DAYS } from "@/lib/alux/behavior-signals";

export function AluxMemoryPanel() {
  const { hydrated, memory, summary, paused, pause, resume, forget } = useAluxMemory();
  const [confirming, setConfirming] = useState(false);

  const remembered = hydrated && Boolean(memory.subjectId) ? summary.signalCount : 0;

  return (
    <Card data-alux-memory-panel className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="font-serif text-2xl">Personalización y memoria</CardTitle>
          <Badge variant={paused ? "secondary" : "default"} className="rounded-pill">
            {paused ? "En pausa" : "Activa"}
          </Badge>
        </div>
        <CardDescription>
          Alux recuerda lo que exploras en este dispositivo para sugerirte mejores lugares y
          experiencias. Nunca guarda tu nombre, correo ni teléfono, y lo que recuerda se borra solo
          después de {ALUX_SIGNAL_TTL_DAYS} días sin actividad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">
            {paused
              ? "Ahora mismo Alux te acompaña con recomendaciones generales."
              : `Alux está usando ${remembered} señal(es) recientes de tu navegación.`}
          </p>
          <p className="mt-1 text-muted-foreground">
            Tu viaje y tus lugares guardados se conservan siempre, incluso con la personalización en
            pausa.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {paused ? (
            <Button
              onClick={() => {
                resume();
                toast.success("Listo, vuelvo a acompañarte con sugerencias a tu medida.");
              }}
            >
              Reactivar personalización
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                pause();
                toast.success("Pausé la personalización. Seguiré sugiriéndote lo esencial.");
              }}
            >
              Pausar personalización
            </Button>
          )}

          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => {
                  forget();
                  setConfirming(false);
                  toast.success("Listo, olvidé lo que había aprendido de tu navegación.");
                }}
              >
                Sí, borrar
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Mejor no
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              Borrar lo que Alux recuerda
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          La ubicación sólo se usa si tu navegador te pide permiso y lo aceptas; nunca se guarda.
          Consulta el{" "}
          <a className="underline underline-offset-4" href="/privacidad">
            aviso de privacidad
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}
