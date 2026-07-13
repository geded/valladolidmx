/**
 * PermissionMoment (CV6.O1) — primitivo canónico "explicación primero,
 * permiso después". Implementa Founder Travel Companion First Principle.
 *
 * Contrato v1.0.0 (congelado):
 *  - Nunca invoca la API del navegador en montaje.
 *  - Muestra beneficio explícito y espera acción del viajero.
 *  - Es reversible/postergable sin degradar la experiencia base.
 *  - Se auto-oculta si la etapa del Journey no permite el permiso
 *    (`stageAllowsPermission`).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  stageAllowsPermission,
  type TravelStage,
} from "@/lib/traveler/journey-stage";

export interface PermissionMomentProps {
  permission: "geolocation" | "notifications" | "camera";
  stage: TravelStage;
  title: string;
  benefit: string;
  onGranted?: () => void;
  onDeferred?: () => void;
  ctaLabel?: string;
  deferLabel?: string;
}

export function PermissionMoment({
  permission,
  stage,
  title,
  benefit,
  onGranted,
  onDeferred,
  ctaLabel = "Activar acompañamiento",
  deferLabel = "Ahora no",
}: PermissionMomentProps) {
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!stageAllowsPermission(stage, permission)) return null;

  async function request() {
    setBusy(true);
    try {
      if (permission === "geolocation" && typeof navigator !== "undefined") {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 8000 },
          );
        });
      } else if (permission === "notifications" && typeof Notification !== "undefined") {
        await Notification.requestPermission();
      }
      onGranted?.();
    } finally {
      setBusy(false);
      setDismissed(true);
    }
  }

  function defer() {
    onDeferred?.();
    setDismissed(true);
  }

  return (
    <Card className="border-border/70 bg-muted/30">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{benefit}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={request} disabled={busy}>
            {busy ? "Activando…" : ctaLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={defer} disabled={busy}>
            {deferLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}