import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, ChevronDown, Circle, LocateFixed, LogIn, MapPin, Search, Square, Users } from "lucide-react";
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
  taxiRequestBlockReason,
  type TaxiPublicConfig,
  type TaxiQuote,
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
  const [pinTarget, setPinTarget] = useState<"origin" | "destination">("destination");
  const [scheduled, setScheduled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // La barra de precio fija en celular eleva a Alux para que no la tape.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    return registerStickyCta();
  }, []);

  const [outsideArea, setOutsideArea] = useState<false | "yucatan" | "lejos">(false);

  // Al entrar, pedir la ubicación: si está fuera del Oriente Maya, avisar y recordarlo para Alux.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Oriente Maya (Valladolid, Izamal, Espita, Tizimín…); Mérida y el poniente quedan fuera.
        const inside = lat > 20.0 && lat < 21.7 && lng > -89.15 && lng < -87.4;
        const inYucatan = lat > 19.4 && lat < 21.8 && lng > -90.6 && lng < -86.7;
        setOutsideArea(inside ? false : inYucatan ? "yucatan" : "lejos");
        try {
          window.localStorage.setItem("vmx.traveler.location-context.v1", JSON.stringify({ inTerritory: inside, nearby: !inside && inYucatan, at: Date.now() }));
        } catch { /* opcional */ }
        if (inside) {
          setDraft((c) => (c.originLabel && c.originLabel !== "Mi ubicación actual" ? c : { ...c, origin: { lat, lng }, originLabel: "Mi ubicación actual" }));
          setPinTarget("origin");
        }
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);

  useEffect(() => {
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
        setDraft((c) => ({
          ...c,
          origin: { lat: position.coords.latitude, lng: position.coords.longitude },
          originLabel: c.originLabel || "Mi ubicación actual",
        }));
        setQuote(null);
        setPinTarget("destination");
      },
      () => toast.error("No pudimos obtener tu ubicación. Marca el punto en el mapa."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  // Cotiza solo en cuanto hay recogida y destino, como en las apps de transporte.
  const quoteKey = `${draft.origin.lat},${draft.origin.lng},${draft.destination.lat},${draft.destination.lng},${scheduled ? draft.requestedFor : "now"}`;
  useEffect(() => {
    if (!ready || !draft.destinationLabel.trim()) return;
    const t = window.setTimeout(() => void calculate(), 600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey, ready, Boolean(draft.destinationLabel.trim())]);

  function pickPlace(target: "origin" | "destination", hit: TaxiPlaceHit) {
    setDraft((c) =>
      target === "origin"
        ? { ...c, origin: { lat: hit.lat, lng: hit.lng }, originLabel: hit.title }
        : { ...c, destination: { lat: hit.lat, lng: hit.lng }, destinationLabel: hit.title },
    );
    setQuote(null);
    setPinTarget(target);
  }

  const activePoint = pinTarget === "origin" ? draft.origin : draft.destination;

  return (
    <div className="grid items-start gap-5 pb-28 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-0">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="relative">
          <LocationPickerMap
            key={pinTarget}
            lat={activePoint.lat}
            lng={activePoint.lng}
            onChange={(point) => patch(pinTarget, point)}
            className="h-[52vh] min-h-[300px] w-full bg-muted lg:h-[460px]"
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
          <Button type="button" size="icon" variant="secondary" aria-label="Usar mi ubicación" onClick={useCurrentLocation} className="absolute bottom-3 right-3 size-11 rounded-full shadow-elevated">
            <LocateFixed className="size-5" />
          </Button>
        </div>

      {outsideArea || config.available_drivers < 1 ? (
        <div role="status" className="border-b border-warning/40 bg-warning/10 px-4 py-3 text-xs leading-5 sm:text-sm">
          {outsideArea === "yucatan"
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
                <select id="taxi-passengers" value={draft.passengers} onChange={(event) => patch("passengers", Number(event.target.value))} className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
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
                  {quote.distance_km.toFixed(1)} km · {quote.estimated_minutes} min{quote.night_surcharge ? " · tarifa nocturna" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground lg:mt-2">
                {busy === "quote" ? "Calculando precio…" : "Elige destino para ver el precio"}
              </p>
            )}
          </div>
          <Button
            type="button"
            className="h-12 shrink-0 px-5 text-base lg:mt-5 lg:w-full"
            disabled={busy !== null || config.available_drivers < 1 || (!!user && !quote)}
            onClick={request}
          >
            {!user ? <LogIn className="mr-2 size-4" /> : null}
            {busy === "request" ? "Enviando…" : user ? "Pedir Taxi Alux" : "Regístrate y pide"}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-xl text-center text-[11px] text-muted-foreground">
          {config.available_drivers < 1
            ? "No hay taxistas disponibles en este momento; puedes cotizar."
            : config.available_drivers === 1
              ? "1 taxista disponible"
              : `${config.available_drivers} taxistas disponibles`}
        </p>
      </aside>
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
