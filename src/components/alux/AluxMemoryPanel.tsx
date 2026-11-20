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
import { useAluxBrand } from "@/lib/brand/brand-context";

export function AluxMemoryPanel() {
  const alux = useAluxBrand();
  const { hydrated, memory, summary, paused, pause, resume, forget } = useAluxMemory();
  const [confirming, setConfirming] = useState(false);

  const remembered = hydrated && Boolean(memory.subjectId) ? summary.signalCount : 0;

  return (
    <Card data-alux-memory-panel className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="font-serif text-2xl">{alux.copy("memoryTitle")}</CardTitle>
          <Badge variant={paused ? "secondary" : "default"} className="rounded-pill">
            {paused ? alux.copy("memoryPaused") : alux.copy("memoryActive")}
          </Badge>
        </div>
        <CardDescription>
          {alux.copy("memoryDescription", { count: ALUX_SIGNAL_TTL_DAYS })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm">
          <p className="font-medium text-foreground">
            {paused
               ? alux.copy("memoryGeneral")
               : alux.copy("memorySignals", { count: remembered })}
          </p>
          <p className="mt-1 text-muted-foreground">
            {alux.copy("memoryPreserved")}
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
              {alux.copy("memoryResume")}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                pause();
                toast.success("Pausé la personalización. Seguiré sugiriéndote lo esencial.");
              }}
            >
              {alux.copy("memoryPause")}
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
                {alux.copy("memoryConfirm")}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                {alux.copy("memoryCancel")}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              {alux.copy("memoryForget")}
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
