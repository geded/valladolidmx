/**
 * BusinessEventTrackers — piezas invisibles de medición de visibilidad.
 *
 * No renderizan interfaz ni alteran el diseño aprobado: registran
 * exposición y acciones sobre fichas de empresa en la fuente única
 * `business_view_events`.
 */
import type { ReactNode } from "react";
import {
  trackBusinessEvent,
  useBusinessImpression,
  type BusinessEventType,
  type TrackBusinessEventInput,
} from "@/lib/visibility/track";

/** Registra una impresión de ficha al montar. No pinta nada. */
export function BusinessImpressionTracker(props: Omit<TrackBusinessEventInput, "eventType">) {
  useBusinessImpression({ ...props, eventType: "impression" });
  return null;
}

/**
 * Envuelve acciones existentes sin modificar su diseño (`display: contents`)
 * y registra el evento al interactuar.
 */
export function TrackClick({
  children,
  eventType,
  ...rest
}: Omit<TrackBusinessEventInput, "eventType"> & {
  eventType: BusinessEventType;
  children: ReactNode;
}) {
  return (
    <span className="contents" onClickCapture={() => trackBusinessEvent({ ...rest, eventType })}>
      {children}
    </span>
  );
}
