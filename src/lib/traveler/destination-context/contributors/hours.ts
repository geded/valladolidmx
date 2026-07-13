/**
 * CV6.4 · Hours Contributor (stub arquitectónico).
 *
 * Publica la señal `hours` (horarios reales y cierres puntuales de
 * negocios en el scope). Consumirá el CMS existente (business hours)
 * en sub-olas siguientes — la firma queda estable.
 */
import type {
  DestinationContextContributor,
  DestinationSignal,
} from "../types";

export interface HoursSignalPayload {
  entityId: string;
  entityType: string;
  status: "open" | "closing_soon" | "closed" | "unknown";
  closesAt?: string | null;
  opensAt?: string | null;
}

const TTL_MS = 10 * 60 * 1000;

export const hoursContributor: DestinationContextContributor = {
  id: "destination.hours.cms",
  kind: "hours",
  async resolve(_input) {
    // Stub arquitectónico: la resolución efectiva se conecta en la
    // siguiente sub-ola contra `business_hours` del CMS. Devolvemos []
    // para no fabricar datos.
    void _input;
    void TTL_MS;
    return [] as DestinationSignal<HoursSignalPayload>[];
  },
};
