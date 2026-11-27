import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Car, ChevronDown, Circle, LocateFixed, LogIn, MapPin, Plus, Repeat, Search, Square, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LocationPickerMap } from "@/components/maps/LocationPickerMap";
import { useAuth } from "@/hooks/useAuth";
import { rememberAuthReturnPath } from "@/lib/navigation/session-context";
import { quoteTaxi, requestTaxiRide, searchTaxiPlaces, type TaxiPlaceHit } from "@/lib/taxi/taxi.functions";
import {
  formatTaxiMoney,
  taxiErrorMessage,
  taxiPickupZoneFor,
  taxiRequestBlockReason,
  taxiWithCurrentOrigin,
  taxiHasRoute,
  taxiClassForPassengers,
  taxiDriversForClass,
  taxiMaxPassengers,
  type TaxiPublicConfig,
  type TaxiStop,
  type TaxiTripMode,
  type TaxiVehicleClass,
  type TaxiQuote,
  decodeTaxiPolyline,
} from "@/lib/taxi/rules";
import { toast } from "@/lib/toast";
import { registerStickyCta } from "@/lib/alux/sticky-cta-presence";

const DRAFT_KEY = "vmx.taxi.quote-draft.v1";
const CENTER = { lat: 20.6896, lng: -88.2017 };

type Point = { lat: number; lng: number };
type Draft = {
  originLabel: string;
  destinationLabel: string;
  origin: Point;
  destination: Point;
  passengers: number;
  vehicleClass: TaxiVehicleClass;
  tripMode: TaxiTripMode;
  hours: number;
  stops: TaxiStop[];
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
  vehicleClass: "compacto",
  tripMode: "one_way",
  hours: 3,
  stops: [],
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
  const [pinTarget, setPinTarget] = useState<"origin" | "destination">("destination");
  const [scheduled, setScheduled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const initialized = useRef(false);

  // La barra de precio fija en celular eleva a Alux para que no la tape.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    return registerStickyCta();
  }, []);

  const [outsideArea, setOutsideArea] = useState<false | "oriente" | "yucatan" | "lejos">(false);

  // Restaurar primero el destino; después pedir una recogida actual, no la de otro traslado.
  useEffect(() => {
    if (!ready) return;
    if (!navigator.geolocation) {
      toast.info("Marca tu punto de recogida en el mapa para cotizar.");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const { latitude: lat, longitude: lng } = pos.coords;
        // Oriente Maya (Valladolid, Izamal, Espita, Tizimín…); Mérida y el poniente quedan fuera.
        const inside = lat > 20.0 && lat < 21.7 && lng > -89.15 && lng < -87.4;
        const inYucatan = lat > 19.4 && lat < 21.8 && lng > -90.6 && lng < -86.7;
        // Destinos de salida marcados por el administrador (por omisión Valladolid).
        const nearValladolid = taxiPickupZoneFor(config.pickup_zones, { lat, lng }) !== null;
        setOutsideArea(nearValladolid ? false : inside ? "oriente" : inYucatan ? "yucatan" : "lejos");
        try {
          window.localStorage.setItem("vmx.traveler.location-context.v1", JSON.stringify({ inTerritory: inside, nearValladolid, nearby: !inside && inYucatan, at: Date.now() }));
        } catch { /* opcional */ }
        setDraft((c) => taxiWithCurrentOrigin(c, { lat, lng }));
        setQuote(null);
        setPinTarget("origin");
      },
      () => {
        if (!cancelled) toast.info("Permite tu ubicación o marca tu recogida en el mapa para cotizar.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
    return () => { cancelled = true; };
  }, [ready, config.pickup_zones]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = readDraft();
    const params = new URLSearchParams(window.location.search);
    const dLat = Number(params.get("lat"));
    const dLng = Number(params.get("lng"));
    const dName = params.get("destino");
    let next = saved ?? initialDraft;
    if (dName && Number.isFinite(dLat) && Number.isFinite(dLng) && dLat !== 0) {
      next = { ...next, destinationLabel: dName, destination: { lat: dLat, lng: dLng } };
    }
    setDraft({
      ...next,
      originLabel: "",
      requestedFor: next.requestedFor || localDateTimeValue(new Date(Date.now() + 30 * 60_000)),
      travelerName: next.travelerName || profile?.display_name || "",
    });
    setReady(true);
  }, [profile?.display_name]);

  useEffect(() => {
    if (profile?.display_name) {
      setDraft((c) => c.travelerName ? c : { ...c, travelerName: profile.display_name ?? "" });
    }
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
    if (!scheduled) return new Date(Date.now() + 5 * 60_000).toISOString();
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
      vehicleClass: draft.vehicleClass,
      tripMode: draft.tripMode,
      hours: draft.tripMode === "hourly" ? draft.hours : null,
      stops: draft.stops,
    };
  }

  async function calculate() {
    if (!taxiHasRoute(draft.originLabel, draft.destinationLabel)) return;
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
      rememberAuthReturnPath(window.location.pathname + window.location.search, "Taxi Alux");
      await navigate({ to: "/auth" });
      return;
    }
    if (block) {
      toast.error(taxiErrorMessage(block));
      return;
    }
    if (!quote) {
      toast.info("Elige tu destino para ver el precio.");
      return;
    }
    if (!draft.originLabel.trim() || !draft.destinationLabel.trim() || !draft.travelerName.trim() || !draft.travelerPhone.trim()) {
      setShowDetails(true);
      toast.info("Completa recogida, destino, tu nombre y tu celular.");
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
        setDraft((c) => taxiWithCurrentOrigin(c, { lat: position.coords.latitude, lng: position.coords.longitude }));
        setQuote(null);
        setPinTarget("destination");
      },
      () => toast.error("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // Cotiza solo en cuanto hay recogida y destino, como en las apps de transporte.
  const quoteKey = `${draft.origin.lat},${draft.origin.lng},${draft.destination.lat},${draft.destination.lng},${scheduled ? draft.requestedFor : "now"},${draft.vehicleClass},${draft.tripMode},${draft.hours},${draft.stops.map((x) => `${x.lat}:${x.lng}`).join("|")}`;
  useEffect(() => {
    if (!ready || !taxiHasRoute(draft.originLabel, draft.destinationLabel)) return;
    const t = window.setTimeout(() => void calculate(), 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, ready, Boolean(draft.originLabel.trim()), Boolean(draft.destinationLabel.trim())]);

  function pickPlace(target: "origin" | "destination", hit: TaxiPlaceHit) {
    setDraft((c) =>
      target === "origin"
        ? { ...c, origin: { lat: hit.lat, lng: hit.lng }, originLabel: hit.title }
        : { ...c, destination: { lat: hit.lat, lng: hit.lng }, destinationLabel: hit.title },
    );
    setQuote(null);
    setPinTarget(target);
  }

  const fleet = config.fleet;
  const maxPassengers = taxiMaxPassengers(fleet);
  const hourOptions = Array.from({ length: Math.max(1, fleet.hourly_max_hours - fleet.hourly_min_hours + 1) }, (_, i) => fleet.hourly_min_hours + i);
  const selectedClass = fleet.classes.find((c) => c.key === draft.vehicleClass) ?? fleet.classes[0]!;
  const driversForSelected = taxiDriversForClass(config, draft.vehicleClass);

  function setPassengers(count: number) {
    setDraft((c) => {
      const current = fleet.classes.find((x) => x.key === c.vehicleClass);
      // Como en Uber: si el grupo ya no cabe, se pasa al auto más chico donde sí caben.
      const fits = current && current.seats >= count;
      const next = fits ? c.vehicleClass : taxiClassForPassengers(fleet, count)?.key ?? c.vehicleClass;
      return { ...c, passengers: count, vehicleClass: next };
    });
    setQuote(null);
  }

  function addStop(hit: TaxiPlaceHit) {
    setDraft((c) => c.stops.length >= fleet.max_stops ? c : { ...c, stops: [...c.stops, { lat: hit.lat, lng: hit.lng, label: hit.title }] });
    setQuote(null);
  }

  function removeStop(index: number) {
    setDraft((c) => ({ ...c, stops: c.stops.filter((_, i) => i !== index) }));
    setQuote(null);
  }

  const roadPath = useMemo(() => {
    const pts = decodeTaxiPolyline(quote?.road_polyline);
    return pts.length > 1 ? pts : null;
  }, [quote?.road_polyline]);

  const zoneNames = config.pickup_zones.map((z) => z.name).join(", ") || "Valladolid";
  const activePoint = pinTarget === "origin" ? draft.origin : draft.destination;

  return (
    <div className="grid items-start gap-5 pb-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="relative">
          <LocationPickerMap
            key={pinTarget}
            lat={activePoint.lat}
            lng={activePoint.lng}
            onChange={(point) => {
              setDraft((c) => pinTarget === "origin"
                ? { ...c, origin: point, originLabel: "Punto de recogida en el mapa" }
                : { ...c, destination: point, destinationLabel: "Destino en el mapa" });
              setQuote(null);
            }}
            gestureHandling="cooperative"
            brandStyle
            companion={pinTarget === "origin" ? draft.destination : draft.origin}
            routePath={roadPath}
            className="h-[42vh] min-h-[280px] w-full bg-muted lg:h-[460px]"
          />
          <div className="absolute left-3 top-3 flex gap-1 rounded-full bg-card/95 p-1 shadow-soft">
            {(["origin", "destination"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPinTarget(t)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${pinTarget === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {t === "origin" ? "Mover recogida" : "Mover destino"}
              </button>
            ))}
          </div>
          <p className="pointer-events-none absolute inset-x-3 bottom-16 mx-auto w-fit rounded-full bg-card/95 px-3 py-1 text-[11px] text-muted-foreground shadow-soft sm:hidden">
            Toca el mapa para marcar el punto · usa dos dedos para moverlo
          </p>
          <Button type="button" size="icon" variant="secondary" aria-label="Usar mi ubicación" onClick={useCurrentLocation} className="absolute bottom-3 right-3 size-11 rounded-full shadow-elevated">
            <LocateFixed className="size-5" />
          </Button>
        </div>

      {outsideArea || config.available_drivers < 1 ? (
        <div role="status" className="border-b border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-5 sm:text-sm">
          {outsideArea === "oriente"
            ? `Por ahora Taxi Alux recoge sólo en ${zoneNames}, para llevarte a cualquier lugar del Oriente Maya. Puedes cotizar desde ahora para cuando estés ahí.`
            : outsideArea === "yucatan"
            ? "Estás fuera del Oriente Maya (por ejemplo, en Mérida). Taxi Alux opera en Valladolid y sus alrededores: hospédate en Valladolid para disfrutar del servicio y recorrer cenotes, Ek Balam y Chichén Itzá."
            : outsideArea
            ? "Taxi Alux sólo funciona dentro de Valladolid y el Oriente Maya de Yucatán. Puedes cotizar tu traslado desde ahora para tu viaje; Alux te ayudará a planearlo."
            : "Por el momento no hay taxis disponibles. Puedes cotizar y volver a intentar en unos minutos."}
        </div>
      ) : null}
        <div className="space-y-3 p-4 sm:p-5">
          <h2 className="text-xl font-semibold">¿A dónde vas?</h2>
          <div className="relative rounded-2xl border border-border bg-background">
            <span aria-hidden className="absolute left-[19px] top-[34px] h-[calc(100%-68px)] w-px bg-border" />
            <PlaceField
              id="taxi-origin"
              icon={<Circle className="size-3 fill-foreground" />}
              placeholder="Punto de recogida"
              value={draft.originLabel}
              onText={(v) => patch("originLabel", v)}
              onPick={(hit) => pickPlace("origin", hit)}
              onFocus={() => setPinTarget("origin")}
            />
            <div className="mx-4 border-t border-border" />
            <PlaceField
              id="taxi-destination"
              icon={<Square className="size-3 fill-primary text-primary" />}
              placeholder="Cenote, hotel, restaurante o dirección"
              value={draft.destinationLabel}
              onText={(v) => patch("destinationLabel", v)}
              onPick={(hit) => pickPlace("destination", hit)}
              onFocus={() => setPinTarget("destination")}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Busca un lugar del Oriente Maya o arrastra el pin en el mapa para el punto exacto.
          </p>

          {draft.stops.length > 0 ? (
            <ul className="space-y-1.5" aria-label="Paradas en el camino">
              {draft.stops.map((stop, i) => (
                <li key={`${stop.lat}-${stop.lng}-${i}`} className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">Parada {i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{stop.label}</span>
                  <button type="button" onClick={() => removeStop(i)} aria-label={`Quitar parada ${i + 1}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {fleet.max_stops > 0 && draft.stops.length < fleet.max_stops ? (
            <StopAdder onPick={addStop} />
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-medium">Tipo de viaje</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={draft.tripMode === "one_way" ? "default" : "outline"} className="h-11" onClick={() => patch("tripMode", "one_way")}>
                Sólo ida
              </Button>
              <Button type="button" variant={draft.tripMode === "hourly" ? "default" : "outline"} className="h-11" disabled={!fleet.hourly_enabled} onClick={() => patch("tripMode", "hourly")}>
                <Repeat className="mr-2 size-4" /> Ida y vuelta
              </Button>
            </div>
            {draft.tripMode === "hourly" ? (
              <div className="mt-2 rounded-xl border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                <label htmlFor="taxi-hours" className="font-medium text-foreground">¿Cuántas horas necesitas el taxi?</label>
                <select id="taxi-hours" value={draft.hours} onChange={(e) => patch("hours", Number(e.target.value))} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {hourOptions.map((h) => <option key={h} value={h}>{h} horas</option>)}
                </select>
                <p className="mt-2">
                  El taxista te lleva, te espera y te regresa a tu punto de recogida. Incluye {fleet.hourly_included_km} km por hora contratada. Cada hora extra o km adicional se paga al final en efectivo.
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium">Vehículo</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehículo">
              {fleet.classes.map((c) => {
                const fits = c.seats >= draft.passengers;
                const active = c.key === draft.vehicleClass;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!fits}
                    onClick={() => patch("vehicleClass", c.key)}
                    className={`rounded-xl border px-2 py-2.5 text-left text-xs transition-colors disabled:opacity-40 ${active ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                  >
                    <Car className="mb-1 size-4" />
                    <span className="block text-sm font-semibold">{c.label}</span>
                    <span className="text-muted-foreground">Hasta {c.seats}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={scheduled ? "outline" : "default"} className="h-11" onClick={() => setScheduled(false)}>Ahora</Button>
            <Button type="button" variant={scheduled ? "default" : "outline"} className="h-11" onClick={() => setScheduled(true)}>
              <CalendarClock className="mr-2 size-4" /> Programar
            </Button>
          </div>
          {scheduled ? (
            <Input
              id="taxi-date"
              type="datetime-local"
              aria-label="Fecha y hora de salida"
              value={draft.requestedFor}
              onChange={(event) => patch("requestedFor", event.target.value)}
              className="h-11"
            />
          ) : null}

          <button type="button" onClick={() => setShowDetails((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-secondary/60 px-4 py-3 text-sm font-medium">
            <span className="flex items-center gap-2"><Users className="size-4" /> {draft.passengers} {draft.passengers === 1 ? "persona" : "personas"} · {draft.travelerName || "tus datos"}</span>
            <ChevronDown className={`size-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
          {showDetails ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="taxi-passengers" className="text-xs font-medium">Personas</label>
                <select id="taxi-passengers" value={draft.passengers} onChange={(event) => setPassengers(Number(event.target.value))} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((count) => <option key={count} value={count}>{count}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="taxi-name" className="text-xs font-medium">Tu nombre</label>
                <Input id="taxi-name" autoComplete="name" value={draft.travelerName} onChange={(event) => patch("travelerName", event.target.value)} className="mt-1 h-11" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="taxi-phone" className="text-xs font-medium">Tu celular</label>
                <Input id="taxi-phone" type="tel" inputMode="tel" autoComplete="tel" value={draft.travelerPhone} onChange={(event) => patch("travelerPhone", event.target.value)} placeholder="Para que el taxista te llame" className="mt-1 h-11" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="taxi-notes" className="text-xs font-medium">Indicaciones (opcional)</label>
                <Textarea id="taxi-notes" value={draft.notes} onChange={(event) => patch("notes", event.target.value)} placeholder="Equipaje, punto de referencia o alguna necesidad especial" className="mt-1" maxLength={500} />
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-floating backdrop-blur lg:sticky lg:top-24 lg:rounded-2xl lg:border lg:p-5 lg:shadow-elevated">
        <div className="mx-auto flex max-w-xl items-center gap-3 lg:block">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Taxi Alux · efectivo</p>
            {quote ? (
              <>
                <p className="text-2xl font-semibold leading-tight lg:mt-2 lg:text-3xl">{formatTaxiMoney(quote.fare_amount, quote.currency)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selectedClass.label} · {quote.distance_km.toFixed(1)} km{quote.trip_mode === "hourly" ? ` · ida y vuelta ${quote.hours} h` : ` · ${quote.estimated_minutes} min`}{quote.night_surcharge ? " · nocturna" : ""}{quote.road_route ? " · por carretera" : " · estimado en línea recta"}
                </p>
                {quote.breakdown ? <FareExplanation quote={quote} /> : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground lg:mt-2">
                {busy === "quote" ? "Calculando precio…" : !draft.originLabel.trim() ? "Esperando tu punto de recogida" : "Elige destino para ver el precio"}
              </p>
            )}
          </div>
          <Button
            type="button"
            className="h-12 shrink-0 px-5 text-base lg:mt-5 lg:w-full"
            disabled={busy !== null || driversForSelected < 1 || (!!user && !quote)}
            onClick={request}
          >
            {!user ? <LogIn className="mr-2 size-4" /> : null}
            {busy === "request" ? "Enviando…" : user ? "Pedir Taxi Alux" : "Regístrate y pide"}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-xl text-center text-[11px] text-muted-foreground">
          {driversForSelected < 1
            ? config.available_drivers > 0
              ? `No hay ${selectedClass.label.toLowerCase()} disponible ahora; puedes cotizar.`
              : "No hay taxistas disponibles en este momento; puedes cotizar."
            : driversForSelected === 1
              ? `1 ${selectedClass.label.toLowerCase()} disponible`
              : `${driversForSelected} vehículos disponibles`}
        </p>
      </aside>
    </div>
  );
}

function FareExplanation({ quote }: { quote: TaxiQuote }) {
  const b = quote.breakdown!;
  const m = (c: number) => formatTaxiMoney(c, quote.currency);
  const lines: string[] = [];
  if (quote.trip_mode === "hourly") {
    lines.push(`${quote.hours} h con espera: ${m(b.base_cents)} (incluye ${b.included_km} km)`);
    if (b.extra_km > 0) lines.push(`${b.extra_km} km adicionales: ${m(b.extra_km_cents)}`);
  } else {
    lines.push(`Viaje: ${m(b.base_cents)}`);
  }
  if (b.stops > 0) lines.push(`${b.stops} ${b.stops === 1 ? "parada" : "paradas"}: ${m(b.stop_fee_cents)}`);
  if (b.night_cents > 0) lines.push(`Tarifa nocturna: ${m(b.night_cents)}`);
  return (
    <details className="mt-1 text-[11px] leading-4 text-muted-foreground">
      <summary className="cursor-pointer font-medium text-foreground">Cómo se calcula</summary>
      <ul className="mt-1 space-y-0.5">
        {lines.map((l) => <li key={l}>{l}</li>)}
        <li>Espera al recogerte: {b.wait_free_minutes} min gratis, después {m(b.wait_per_minute_cents)} por minuto.</li>
        {quote.trip_mode === "hourly" ? <li>Hora extra: {m(b.extra_hour_cents)} · km extra: {m(b.extra_km_rate_cents)}.</li> : null}
        <li>Pagas en efectivo al conductor al terminar.</li>
      </ul>
    </details>
  );
}

function StopAdder({ onPick }: { onPick: (hit: TaxiPlaceHit) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Plus className="size-4" /> Agregar parada en el camino
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-background">
      <PlaceField
        id="taxi-stop"
        icon={<Plus className="size-3" />}
        placeholder="Busca la parada (hasta 3 min)"
        value={text}
        onText={setText}
        onPick={(hit) => { onPick(hit); setText(""); setOpen(false); }}
        onFocus={() => undefined}
      />
    </div>
  );
}

function PlaceField(props: {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onText: (v: string) => void;
  onPick: (hit: TaxiPlaceHit) => void;
  onFocus: () => void;
}) {
  const searchFn = useServerFn(searchTaxiPlaces);
  const [hits, setHits] = useState<TaxiPlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const typed = useRef(false);
  useEffect(() => {
    if (!typed.current || props.value.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      searchFn({ data: { term: props.value } }).then(setHits).catch(() => setHits([]));
    }, 300);
    return () => window.clearTimeout(t);
  }, [props.value, searchFn]);
  return (
    <div className="relative">
      <div className="flex items-center gap-3 px-4">
        <span className="flex size-3 shrink-0 items-center justify-center">{props.icon}</span>
        <label htmlFor={props.id} className="sr-only">{props.placeholder}</label>
        <input
          id={props.id}
          value={props.value}
          placeholder={props.placeholder}
          autoComplete="off"
          enterKeyHint="search"
          onFocus={() => { setOpen(true); props.onFocus(); }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { typed.current = true; props.onText(e.target.value); setOpen(true); }}
          className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <Search className="size-4 shrink-0 text-muted-foreground" />
      </div>
      {open && hits.length > 0 ? (
        <ul role="listbox" className="absolute inset-x-2 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-popover py-1 shadow-elevated">
          {hits.map((hit) => (
            <li key={`${hit.subtitle}-${hit.id}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { typed.current = false; props.onPick(hit); setHits([]); setOpen(false); }}
                className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-muted"
              >
                <MapPin className="size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{hit.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{hit.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
