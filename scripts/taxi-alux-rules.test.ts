import { describe, expect, it } from "bun:test";
import {
  canCancelTaxiRide,
  DEFAULT_TAXI_SETTINGS,
  nextDriverRideStatus,
  normalizeTaxiSettings,
  TAXI_PAYMENT_METHOD,
  taxiRequestBlockReason,
  taxiDriverApplicationBlockReason,
} from "../src/lib/taxi/rules";

describe("Taxi Alux · reglas autorizadas", () => {
  it("inicia desactivado y conserva las tarifas iniciales editables", () => {
    const settings = normalizeTaxiSettings(null);
    expect(settings.enabled).toBe(false);
    expect(settings).toEqual(DEFAULT_TAXI_SETTINGS);
  });

  it("exige registro antes de pedir un taxi", () => {
    expect(taxiRequestBlockReason({ enabled: true, availableDrivers: 1, authenticated: false })).toBe(
      "authentication_required",
    );
    expect(taxiRequestBlockReason({ enabled: true, availableDrivers: 1, authenticated: true })).toBeNull();
  });

  it("no permite pedir cuando el administrador apagó el servicio", () => {
    expect(taxiRequestBlockReason({ enabled: false, availableDrivers: 3, authenticated: true })).toBe(
      "taxi_service_disabled",
    );
  });

  it("no permite pedir sin un taxista disponible", () => {
    expect(taxiRequestBlockReason({ enabled: true, availableDrivers: 0, authenticated: true })).toBe(
      "no_drivers_available",
    );
  });

  it("esta etapa sólo reconoce efectivo al conductor", () => {
    expect(TAXI_PAYMENT_METHOD).toBe("efectivo");
  });

  it("el conductor sigue el orden llegó → inició → terminó", () => {
    expect(nextDriverRideStatus("accepted")).toBe("arrived");
    expect(nextDriverRideStatus("arrived")).toBe("in_progress");
    expect(nextDriverRideStatus("in_progress")).toBe("completed");
    expect(nextDriverRideStatus("completed")).toBeNull();
  });

  it("el viajero sólo cancela antes de que el taxi marque llegada", () => {
    expect(canCancelTaxiRide("requested")).toBe(true);
    expect(canCancelTaxiRide("accepted")).toBe(true);
    expect(canCancelTaxiRide("arrived")).toBe(false);
    expect(canCancelTaxiRide("in_progress")).toBe(false);
  });

  it("sólo aprueba solicitudes enviadas, completas y con inglés", () => {
    const complete = {
      status: "submitted" as const,
      english: true,
      email: "taxista@example.com",
      full_name: "Conductor de prueba",
      vehicle_description: "Nissan Versa",
      plates: "ABC-123",
    };
    expect(taxiDriverApplicationBlockReason(complete)).toBeNull();
    expect(taxiDriverApplicationBlockReason({ ...complete, english: false })).toBe("driver_english_required");
    expect(taxiDriverApplicationBlockReason({ ...complete, status: "pending" })).toBe("invitation_not_available");
    expect(taxiDriverApplicationBlockReason({ ...complete, plates: null })).toBe("missing_driver_details");
  });
});
