import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, CarFront, LocateFixed, LogIn, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import { useAuth } from "@/hooks/useAuth";
import { rememberAuthReturnPath } from "@/lib/navigation/session-context";
import { quoteTaxi, requestTaxiRide } from "@/lib/taxi/taxi.functions";
import {
  formatTaxiMoney,
  taxiErrorMessage,
  taxiRequestBlockReason,
  type TaxiPublicConfig,
  type TaxiQuote,
} from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";

const DRAFT_KEY = "vmx.taxi.quote-draft.v1";
const CENTER = { lat: 20.6896, lng: -88.2017 };

type Point = { lat: number; lng: number };
type Draft = {
  originLabel: string;
  destinationLabel: string;
  origin: Point;
  destination: Point;
  passengers: number;
  requestedFor: string;
  travelerName: string;
  travelerPhone: string;
  notes: string;
};

const initialDraft: Draft = {
  originLabel: "",
  destinationLabel: "",
  origin: CENTER,
  destination: { lat: 20.674, lng: -88.215 },
  passengers: 1,
  requestedFor: "",
  travelerName: "",
  travelerPhone: "",
  notes: "",
};

function localDateTimeValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function readDraft(): Draft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Draft>;
    return {
      ...initialDraft,
      ...value,
      origin: value.origin ?? CENTER,
      destination: value.destination ?? initialDraft.destination,
    };
  } catch {
    return null;
  }
}

export function TaxiQuoteForm({ config }: { config: TaxiPublicConfig }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const quoteFn = useServerFn(quoteTaxi);
  const requestFn = useServerFn(requestTaxiRide);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [quote, setQuote] = useState<TaxiQuote | null>(null);
  const [busy, setBusy] = useState<"quote" | "request" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readDraft();
    const next = saved ?? initialDraft;
    setDraft({
      ...next,
      requestedFor: next.requestedFor || localDateTimeValue(new Date(Date.now() + 30 * 60_000)),
      travelerName: next.travelerName || profile?.display_name || "",
    });
    setReady(true);
  }, [profile?.display_name]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* la solicitud sigue funcionando sin copia local */
    }
  }, [draft, ready]);

  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setQuote(null);
  }

  function requestedForIso(): string {
    const date = new Date(draft.requestedFor);
    if (Number.isNaN(date.getTime())) throw new Error("invalid_requested_for");
    return date.toISOString();
  }

  function pointInput() {
    return {
      originLat: draft.origin.lat,
      originLng: draft.origin.lng,
      destinationLat: draft.destination.lat,
      destinationLng: draft.destination.lng,
      requestedFor: requestedForIso(),
    };
  }

  async function calculate() {
    setBusy("quote");
    try {
      const result = await quoteFn({ data: pointInput() });
      setQuote(result);
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(null);
    }
  }

  async function request() {
    const block = taxiRequestBlockReason({
      enabled: config.enabled,
      availableDrivers: config.available_drivers,
      authenticated: Boolean(user),
    });
    if (block === "authentication_required") {
      rememberAuthReturnPath("/taxi", "Taxi Alux");
      await navigate({ to: "/auth" });
      return;
    }
    if (block) {
      toast.error(taxiErrorMessage(block));
      return;
    }
    if (!quote) {
      toast.info("Primero calcula el precio de tu viaje.");
      return;
    }
    setBusy("request");
    try {
      await requestFn({
        data: {
          ...pointInput(),
          originLabel: draft.originLabel,
          destinationLabel: draft.destinationLabel,
          passengers: draft.passengers,
          travelerName: draft.travelerName,
          travelerPhone: draft.travelerPhone,
          notes: draft.notes || undefined,
          paymentMethod: "efectivo",
        },
      });
      window.sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Solicitud enviada. Te avisaremos cuando un taxista la acepte.");
      await navigate({ to: "/cuenta/taxi" });
    } catch (error) {
      toast.error(taxiErrorMessage(error instanceof Error ? error.message : ""));
    } finally {
      setBusy(null);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Este navegador no puede conocer tu ubicación. Marca el punto en el mapa.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patch("origin", { lat: position.coords.latitude, lng: position.coords.longitude });
        if (!draft.originLabel) patch("originLabel", "Mi ubicación actual");
      },
      () => toast.error("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="size-5 text-primary" /> Origen y destino
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation}>
              <LocateFixed className="mr-2 size-4" /> Mi ubicación
            </Button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="taxi-origin" className="text-xs font-medium">¿Dónde te recogemos?</label>
              <Input
                id="taxi-origin"
                required
                value={draft.originLabel}
                onChange={(event) => patch("originLabel", event.target.value)}
                placeholder="Hotel, restaurante o dirección"
                className="mt-1"
              />
              <LocationPickerMap
                lat={draft.origin.lat}
                lng={draft.origin.lng}
                onChange={(point) => patch("origin", point)}
                className="mt-3 h-[240px] w-full rounded-xl border border-border bg-muted"
              />
            </div>
            <div>
              <label htmlFor="taxi-destination" className="text-xs font-medium">¿A dónde vas?</label>
              <Input
                id="taxi-destination"
                required
                value={draft.destinationLabel}
                onChange={(event) => patch("destinationLabel", event.target.value)}
                placeholder="Cenote, zona arqueológica o dirección"
                className="mt-1"
              />
              <LocationPickerMap
                lat={draft.destination.lat}
                lng={draft.destination.lng}
                onChange={(point) => patch("destination", point)}
                className="mt-3 h-[240px] w-full rounded-xl border border-border bg-muted"
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Toca el mapa o arrastra cada pin para señalar el punto exacto.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h2 className="text-base font-semibold">Detalles del viaje</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="taxi-date" className="flex items-center gap-1.5 text-xs font-medium">
                <CalendarClock className="size-4" /> Fecha y hora de salida
              </label>
              <Input
                id="taxi-date"
                type="datetime-local"
                required
                value={draft.requestedFor}
                onChange={(event) => patch("requestedFor", event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="taxi-passengers" className="flex items-center gap-1.5 text-xs font-medium">
                <Users className="size-4" /> Personas
              </label>
              <select
                id="taxi-passengers"
                value={draft.passengers}
                onChange={(event) => patch("passengers", Number(event.target.value))}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="taxi-name" className="text-xs font-medium">Tu nombre</label>
              <Input
                id="taxi-name"
                required
                autoComplete="name"
                value={draft.travelerName}
                onChange={(event) => patch("travelerName", event.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="taxi-phone" className="text-xs font-medium">Tu celular</label>
              <Input
                id="taxi-phone"
                required
                type="tel"
                autoComplete="tel"
                value={draft.travelerPhone}
                onChange={(event) => patch("travelerPhone", event.target.value)}
                placeholder="Para coordinar la recogida"
                className="mt-1"
              />
            </div>
          </div>
          <label htmlFor="taxi-notes" className="mt-4 block text-xs font-medium">Indicaciones (opcional)</label>
          <Textarea
            id="taxi-notes"
            value={draft.notes}
            onChange={(event) => patch("notes", event.target.value)}
            placeholder="Equipaje, punto de referencia o alguna necesidad especial"
            className="mt-1"
            maxLength={500}
          />
        </section>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-5 shadow-elevated lg:sticky lg:top-24">
        <CarFront className="size-7 text-primary" />
        <h2 className="mt-3 text-lg font-semibold">Tu cotización</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Precio calculado con las tarifas configuradas por Valladolid.mx. Se paga en efectivo
          directamente al conductor.
        </p>
        {quote ? (
          <div className="mt-5 rounded-xl bg-primary/10 p-4">
            <p className="text-3xl font-semibold">{formatTaxiMoney(quote.fare_amount, quote.currency)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {quote.distance_km.toFixed(1)} km aprox. · {quote.estimated_minutes} min estimados
            </p>
            {quote.night_surcharge ? <p className="mt-1 text-[11px]">Incluye tarifa nocturna.</p> : null}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">Calcula para conocer el total antes de pedir.</p>
        )}
        <Button
          type="button"
          variant="outline"
          className="mt-5 w-full"
          disabled={busy !== null}
          onClick={calculate}
        >
          {busy === "quote" ? "Calculando…" : "Calcular precio"}
        </Button>
        <Button
          type="button"
          className="mt-2 w-full"
          disabled={busy !== null || config.available_drivers < 1}
          onClick={request}
        >
          {!user ? <LogIn className="mr-2 size-4" /> : null}
          {busy === "request" ? "Enviando…" : user ? "Pedir Taxi Alux" : "Registrarme y pedir taxi"}
        </Button>
        {config.available_drivers < 1 ? (
          <p role="status" className="mt-3 rounded-lg bg-warning/10 p-3 text-xs text-warning-foreground">
            No hay taxistas disponibles en este momento. Puedes cotizar, pero todavía no enviar la solicitud.
          </p>
        ) : (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {config.available_drivers === 1 ? "1 taxista disponible" : `${config.available_drivers} taxistas disponibles`}
          </p>
        )}
        <p className="mt-4 border-t border-border pt-4 text-[11px] leading-4 text-muted-foreground">
          {user
            ? "La solicitud quedará guardada en Mi Cuenta para que consultes a tu conductor y el estado del viaje."
            : "Necesitas una cuenta de viajero. Tu cotización queda guardada en este dispositivo mientras inicias sesión o te registras."}
        </p>
      </aside>
    </div>
  );
}
