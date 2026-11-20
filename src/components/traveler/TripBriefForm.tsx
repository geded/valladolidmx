/**
 * TripBriefForm — Formulario de confirmación de viaje antes de enviar
 * al Concierge. Pantalla única con 3 secciones (más rápido en móvil).
 *
 * El viajero revisa lo que ya armó y completa lo faltante para cotizar:
 * 1. Datos del viaje (cómo llega, origen)
 * 2. Quiénes viajan (adultos, menores, grupo, salud)
 * 3. Transportación (modo, complementos)
 *
 * Fechas y destinos ya vienen del plan (editable en su editor existente).
 * El brief se guarda en `travel_plans.meta.trip_brief` antes del envío.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Plane, Bus, Car, MapPin, Users, Accessibility, Utensils, Languages } from "lucide-react";
import { saveTripBrief, promotePlanToCase } from "@/lib/traveler/travel-plans.functions";
import { getMyPersonalProfile, saveMyConciergeContact } from "@/lib/traveler/profile-personal.functions";
import { useAluxBrand } from "@/lib/brand/brand-context";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Sparkles as SparklesIcon } from "lucide-react";
import type { TravelPlanWithItems } from "@/lib/traveler/travel-plans.functions";
import {
  ARRIVAL_MODES,
  AIRPORTS,
  GROUP_TYPES,
  TRANSPORT_MODES,
  RENTAL_CAR_TYPES,
  TOUR_PREFERENCES,
  ARRIVAL_MODE_LABEL,
  AIRPORT_LABEL,
  GROUP_TYPE_LABEL,
  TRANSPORT_MODE_LABEL,
  RENTAL_CAR_TYPE_LABEL,
  TOUR_PREFERENCE_LABEL,
  YES_NO_UNSURE_LABEL,
  briefToHumanSummary,
  type TripBrief,
  type ArrivalMode,
  type Airport,
  type GroupType,
  type TransportMode,
  type RentalCarType,
  type TourPreference,
} from "@/lib/traveler/trip-brief";

const LANGUAGES = ["es", "en", "fr", "de", "it", "pt"] as const;

function nightsBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const d1 = new Date(start + "T00:00:00");
  const d2 = new Date(end + "T00:00:00");
  const n = Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
  return n >= 0 ? n : null;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </fieldset>
  );
}

function PillToggle<T extends string>({
  value,
  onChange,
  options,
  labels,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
  labels: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:border-primary/50"
          }`}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

export function TripBriefForm({
  data,
  onChanged,
}: {
  data: TravelPlanWithItems;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const alux = useAluxBrand();
  const saveBrief = useServerFn(saveTripBrief);
  const promote = useServerFn(promotePlanToCase);
  const getContact = useServerFn(getMyPersonalProfile);
  const saveContact = useServerFn(saveMyConciergeContact);
  const { plan, items } = data;

  // Brief state — defaults from plan
  const [arrivalMode, setArrivalMode] = useState<ArrivalMode>("plane");
  const [airport, setAirport] = useState<Airport | null>(null);
  const [originCity, setOriginCity] = useState("");
  const [adults, setAdults] = useState<number>(plan.party_size ?? 2);
  const [hasMinors, setHasMinors] = useState(false);
  const [minorAges, setMinorAges] = useState<number[]>([]);
  const [hasMobilityNeeds, setHasMobilityNeeds] = useState(false);
  const [mobilityNotes, setMobilityNotes] = useState("");
  const [groupType, setGroupType] = useState<GroupType>("couple");
  const [preferredLanguage, setPreferredLanguage] = useState("es");
  const [dietaryOrHealthNotes, setDietaryOrHealthNotes] = useState("");
  const [transportMode, setTransportMode] = useState<TransportMode>("undecided");
  const [rentalCarType, setRentalCarType] = useState<RentalCarType | null>(null);
  const [needsChildSeat, setNeedsChildSeat] = useState(false);
  const [needsAdditionalDriver, setNeedsAdditionalDriver] = useState(false);
  const [hasValidLicense, setHasValidLicense] = useState(false);
  const [pickupPoint, setPickupPoint] = useState("");
  const [tourPreference, setTourPreference] = useState<TourPreference | null>(null);
  const [airportTransfer, setAirportTransfer] = useState<"yes" | "no" | "unsure">("unsure");
  const [mobilityNotesGeneral, setMobilityNotesGeneral] = useState("");
  const [notes, setNotes] = useState("");

  // Contact state (existing)
  const [summary, setSummary] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  const contactQuery = useQuery({
    queryKey: ["traveler", "concierge-contact"],
    queryFn: () => getContact(),
    staleTime: 30_000,
  });

  useEffect(() => {
    const profile = contactQuery.data;
    if (!profile) return;
    setContactName(
      profile.display_name ?? [profile.first_name, profile.last_name].filter(Boolean).join(" "),
    );
    setContactPhone(profile.phone ?? "");
    setWhatsappConsent(profile.whatsapp_contact_consent);
  }, [contactQuery.data]);

  const hasContent = items.length > 0 || Boolean((plan.notes ?? "").trim().length >= 8);
  const alreadyShared = plan.status === "shared_with_concierge" && Boolean(plan.case_id);
  const nights = nightsBetween(plan.start_date, plan.end_date);

  // Load existing brief from plan.meta if present
  const existingBrief = useMemo(() => {
    const meta = plan.meta as Record<string, unknown> | null;
    if (meta && meta["trip_brief"]) {
      try {
        return meta["trip_brief"] as Partial<TripBrief>;
      } catch {
        return null;
      }
    }
    return null;
  }, [plan.meta]);

  // Hydrate from existing brief on mount
  useEffect(() => {
    if (!existingBrief) return;
    if (existingBrief.arrivalMode) setArrivalMode(existingBrief.arrivalMode);
    if (existingBrief.airport) setAirport(existingBrief.airport);
    if (existingBrief.originCity) setOriginCity(existingBrief.originCity);
    if (existingBrief.adults) setAdults(existingBrief.adults);
    if (existingBrief.hasMinors != null) setHasMinors(existingBrief.hasMinors);
    if (existingBrief.minorAges) setMinorAges(existingBrief.minorAges);
    if (existingBrief.hasMobilityNeeds != null) setHasMobilityNeeds(existingBrief.hasMobilityNeeds);
    if (existingBrief.mobilityNotes) setMobilityNotes(existingBrief.mobilityNotes);
    if (existingBrief.groupType) setGroupType(existingBrief.groupType);
    if (existingBrief.preferredLanguage) setPreferredLanguage(existingBrief.preferredLanguage);
    if (existingBrief.dietaryOrHealthNotes) setDietaryOrHealthNotes(existingBrief.dietaryOrHealthNotes);
    if (existingBrief.transportMode) setTransportMode(existingBrief.transportMode);
    if (existingBrief.rentalCarType) setRentalCarType(existingBrief.rentalCarType);
    if (existingBrief.needsChildSeat != null) setNeedsChildSeat(existingBrief.needsChildSeat);
    if (existingBrief.needsAdditionalDriver != null) setNeedsAdditionalDriver(existingBrief.needsAdditionalDriver);
    if (existingBrief.hasValidLicense != null) setHasValidLicense(existingBrief.hasValidLicense);
    if (existingBrief.pickupPoint) setPickupPoint(existingBrief.pickupPoint);
    if (existingBrief.tourPreference) setTourPreference(existingBrief.tourPreference);
    if (existingBrief.airportTransfer) setAirportTransfer(existingBrief.airportTransfer);
    if (existingBrief.mobilityNotesGeneral) setMobilityNotesGeneral(existingBrief.mobilityNotesGeneral);
    if (existingBrief.notes) setNotes(existingBrief.notes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brief: TripBrief = {
    arrivalMode,
    airport: airport ?? undefined,
    originCity: originCity.trim() || undefined,
    adults,
    hasMinors,
    minorAges: hasMinors ? minorAges : undefined,
    hasMobilityNeeds,
    mobilityNotes: mobilityNotes.trim() || undefined,
    groupType,
    preferredLanguage,
    dietaryOrHealthNotes: dietaryOrHealthNotes.trim() || undefined,
    transportMode,
    rentalCarType: rentalCarType ?? undefined,
    needsChildSeat,
    needsAdditionalDriver,
    hasValidLicense,
    pickupPoint: pickupPoint.trim() || undefined,
    tourPreference: tourPreference ?? undefined,
    airportTransfer,
    mobilityNotesGeneral: mobilityNotesGeneral.trim() || undefined,
    notes: notes.trim() || undefined,
  };

  const briefSummary = briefToHumanSummary(brief, {
    partySize: plan.party_size,
    startDate: plan.start_date,
    endDate: plan.end_date,
    itemCount: items.length,
  });

  const contactReady =
    contactName.trim().length >= 2 &&
    Boolean(contactQuery.data?.email) &&
    /^\+?[0-9 ()-]{8,32}$/.test(contactPhone.trim()) &&
    whatsappConsent;

  const briefReady = adults >= 1 && Boolean(transportMode);

  const derivedSummary =
    summary.trim() ||
    briefSummary ||
    `Viaje "${plan.title}" · ${items.length} elemento${items.length === 1 ? "" : "s"}`;

  const send = useMutation({
    mutationFn: async () => {
      // 1. Guardar brief
      await saveBrief({ data: { planId: plan.id, brief } });
      // 2. Guardar contacto
      await saveContact({
        data: { name: contactName, phone: contactPhone, whatsappConsent },
      });
      // 3. Promover a caso
      return promote({ data: { planId: plan.id, summary: derivedSummary } });
    },
    onSuccess: (res: { caseId: string; planId: string }) => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["cc", "my-cases"] });
      onChanged();
      toast.success("Expediente enviado al Concierge", {
        description: "Un concierge humano revisará tu viaje.",
        action: {
          label: "Ver caso",
          onClick: () => {
            window.location.href = `/cuenta/concierge/${res.caseId}`;
          },
        },
      });
    },
    onError: (e: unknown) =>
      toast.error("No se pudo enviar", {
        description: e instanceof Error ? e.message : undefined,
      }),
  });

  const canSend = !alreadyShared && hasContent && contactReady && briefReady && !send.isPending;

  if (alreadyShared) {
    return (
      <div className="mt-4 border-y border-alux-border bg-alux-surface px-4 py-4 text-sm">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-alux text-alux-foreground">
            <SparklesIcon className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-alux-surface-foreground/70">
              {alux.name} · seguimiento activo
            </p>
            <p className="mt-1 font-semibold text-alux-surface-foreground">
              {alux.copy("conciergeSentTitle")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-alux-surface-foreground/75">
              {alux.copy("conciergeSentBody")}
            </p>
          </div>
        </div>
        {plan.case_id ? (
          <Link
            to="/cuenta/concierge/$caseId"
            params={{ caseId: plan.case_id }}
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-alux px-4 py-2 text-xs font-semibold text-alux-foreground hover:opacity-90"
          >
            Ver seguimiento →
          </Link>
        ) : null}
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="mt-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Agrega al menos un destino, empresa, producto o evento — o escribe notas generales del
        viaje — para poder enviarlo.
      </div>
    );
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) send.mutate();
      }}
    >
      {/* ── Resumen vivo ── */}
      <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Resumen de tu viaje
        </p>
        <p className="mt-1 text-sm leading-relaxed">{briefSummary}</p>
      </div>

      {/* ── Paso 1 · Datos del viaje ── */}
      <SectionCard
        title="1 · Datos del viaje"
        description="Revisa destinos y fechas. Confirma cómo llegas al destino."
      >
        {/* Destinos guardados (read-only display) */}
        {items.length > 0 ? (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Lugares guardados</p>
            <div className="flex flex-wrap gap-1.5">
              {items.slice(0, 8).map((it) => (
                <span
                  key={it.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                >
                  <MapPin className="size-3 text-muted-foreground" aria-hidden />
                  {it.snapshot.title ?? it.item_kind}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Fechas (display; se editan en el editor del plan) */}
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Fechas</p>
          <p className="text-sm">
            {plan.start_date && plan.end_date ? (
              <>
                {plan.start_date} → {plan.end_date}
                {nights != null ? ` · ${nights + 1} días / ${nights} noches` : ""}
              </>
            ) : plan.start_date ? (
              `Desde ${plan.start_date}`
            ) : (
              <span className="text-muted-foreground">
                Sin fechas — edítalas arriba en tu viaje
              </span>
            )}
          </p>
        </div>

        {/* Cómo llega */}
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">¿Cómo llegas al destino?</p>
          <PillToggle
            value={arrivalMode}
            onChange={setArrivalMode}
            options={ARRIVAL_MODES}
            labels={ARRIVAL_MODE_LABEL}
          />
        </div>

        {arrivalMode === "plane" ? (
          <div className="grid gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">Aeropuerto de llegada</p>
            <PillToggle
              value={airport ?? "cancun"}
              onChange={(v) => setAirport(v as Airport)}
              options={AIRPORTS}
              labels={AIRPORT_LABEL}
            />
          </div>
        ) : null}

        <label className="grid gap-1 text-xs font-medium">
          Ciudad o país de origen (opcional)
          <input
            value={originCity}
            onChange={(e) => setOriginCity(e.target.value)}
            maxLength={200}
            placeholder="Ej. Ciudad de México, Argentina, España…"
            className="h-11 rounded-md border border-border bg-background px-3 text-sm font-normal"
          />
        </label>
      </SectionCard>

      {/* ── Paso 2 · Quiénes viajan ── */}
      <SectionCard
        title="2 · Quiénes viajan"
        description="Indica adultos, menores y necesidades especiales para cotizar bien."
      >
        <label className="grid gap-1 text-xs font-medium">
          Adultos
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAdults((n) => Math.max(1, n - 1))}
              className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-sm"
              aria-label="Menos adultos"
            >
              −
            </button>
            <input
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Math.min(40, Number(e.target.value) || 1)))}
              type="number"
              min={1}
              max={40}
              className="h-11 w-16 rounded-md border border-border bg-background px-2 text-center text-sm"
            />
            <button
              type="button"
              onClick={() => setAdults((n) => Math.min(40, n + 1))}
              className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-sm"
              aria-label="Más adultos"
            >
              +
            </button>
          </div>
        </label>

        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border/70 p-3 text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={hasMinors}
            onChange={(e) => setHasMinors(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span>Viajan menores (0–17 años)</span>
        </label>

        {hasMinors ? (
          <div className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">Edades de los menores</p>
            <div className="flex flex-wrap gap-1.5">
              {minorAges.map((age, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                >
                  {age} año{age === 1 ? "" : "s"}
                  <button
                    type="button"
                    onClick={() => setMinorAges((a) => a.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Quitar"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setMinorAges((a) => [...a, 5])}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50"
              >
                <Plus className="size-3" /> Agregar
              </button>
            </div>
            {minorAges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {minorAges.map((_, i) => (
                  <label key={i} className="grid gap-0.5 text-[10px] text-muted-foreground">
                    Menor {i + 1}
                    <input
                      type="number"
                      min={0}
                      max={17}
                      value={minorAges[i]}
                      onChange={(e) =>
                        setMinorAges((a) =>
                          a.map((v, idx) =>
                            idx === i ? Math.max(0, Math.min(17, Number(e.target.value) || 0)) : v,
                          ),
                        )
                      }
                      className="h-9 w-14 rounded border border-border bg-background px-1 text-center text-xs"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Tipo de grupo</p>
          <PillToggle
            value={groupType}
            onChange={setGroupType}
            options={GROUP_TYPES}
            labels={GROUP_TYPE_LABEL}
          />
        </div>

        <label className="grid gap-1 text-xs font-medium">
          Idioma preferido
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="h-11 rounded-md border border-border bg-background px-3 text-sm font-normal"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === "es" ? "Español" : l === "en" ? "Inglés" : l === "fr" ? "Francés" : l === "de" ? "Alemán" : l === "it" ? "Italiano" : "Portugués"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-h-11 items-center gap-3 rounded-md border border-border/70 p-3 text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={hasMobilityNeeds}
            onChange={(e) => setHasMobilityNeeds(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span>Movilidad reducida, adultos mayores o necesidades de accesibilidad</span>
        </label>

        {hasMobilityNeeds ? (
          <label className="grid gap-1 text-xs font-medium">
            Notas de movilidad
            <textarea
              value={mobilityNotes}
              onChange={(e) => setMobilityNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej. Silla de ruedas, poca caminata, ascensor…"
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
        ) : null}

        <label className="grid gap-1 text-xs font-medium">
          Restricciones alimenticias o de salud (opcional)
          <textarea
            value={dietaryOrHealthNotes}
            onChange={(e) => setDietaryOrHealthNotes(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej. Vegetariano, alergia a mariscos, diabetes…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </SectionCard>

      {/* ── Paso 3 · Transportación ── */}
      <SectionCard
        title="3 · Transportación"
        description="Dinos cómo quieres moverte durante el viaje."
      >
        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">¿Cómo quieres moverte?</p>
          <PillToggle
            value={transportMode}
            onChange={setTransportMode}
            options={TRANSPORT_MODES}
            labels={TRANSPORT_MODE_LABEL}
          />
        </div>

        {transportMode === "rent_car" ? (
          <div className="grid gap-3 rounded-md border border-border/50 p-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Tipo de auto</p>
              <PillToggle
                value={rentalCarType ?? "compact"}
                onChange={(v) => setRentalCarType(v as RentalCarType)}
                options={RENTAL_CAR_TYPES}
                labels={RENTAL_CAR_TYPE_LABEL}
              />
            </div>
            <label className="flex min-h-11 items-center gap-3 text-xs">
              <input
                type="checkbox"
                checked={needsChildSeat}
                onChange={(e) => setNeedsChildSeat(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>Necesito silla infantil</span>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-xs">
              <input
                type="checkbox"
                checked={needsAdditionalDriver}
                onChange={(e) => setNeedsAdditionalDriver(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>Conductor adicional</span>
            </label>
            <label className="flex min-h-11 items-center gap-3 text-xs">
              <input
                type="checkbox"
                checked={hasValidLicense}
                onChange={(e) => setHasValidLicense(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>Tengo licencia de conducir vigente</span>
            </label>
          </div>
        ) : null}

        {transportMode === "tours_with_transport" ? (
          <div className="grid gap-3 rounded-md border border-border/50 p-3">
            <div className="grid gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Preferencia de tour</p>
              <PillToggle
                value={tourPreference ?? "private"}
                onChange={(v) => setTourPreference(v as TourPreference)}
                options={TOUR_PREFERENCES}
                labels={TOUR_PREFERENCE_LABEL}
              />
            </div>
            <label className="grid gap-1 text-xs font-medium">
              Punto de recogida (opcional)
              <input
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                maxLength={300}
                placeholder="Ej. Hotel Casa Tía Micha"
                className="h-11 rounded-md border border-border bg-background px-3 text-sm font-normal"
              />
            </label>
          </div>
        ) : null}

        <div className="grid gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Traslado aeropuerto ⇄ hospedaje
          </p>
          <PillToggle
            value={airportTransfer}
            onChange={setAirportTransfer}
            options={["yes", "no", "unsure"] as const}
            labels={YES_NO_UNSURE_LABEL}
          />
        </div>

        <label className="grid gap-1 text-xs font-medium">
          Notas de movilidad / equipaje (opcional)
          <textarea
            value={mobilityNotesGeneral}
            onChange={(e) => setMobilityNotesGeneral(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Ej. Mucho equipaje, mascota, sillas de ruedas…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </SectionCard>

      {/* ── Contacto + envío ── */}
      <fieldset className="grid gap-3 rounded-md border border-border/70 bg-background/60 p-4">
        <legend className="px-1 text-sm font-semibold">Tus datos de contacto</legend>
        <p className="text-xs text-muted-foreground">
          El equipo Concierge los usará para aclarar tu solicitud. Nunca se comparten con las
          empresas.
        </p>
        <label className="grid gap-1 text-xs font-medium">
          Nombre completo
          <input
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            maxLength={120}
            autoComplete="name"
            required
            className="h-11 rounded-md border border-border bg-background px-3 text-sm font-normal"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Correo de tu cuenta
          <input
            value={contactQuery.data?.email ?? ""}
            readOnly
            aria-readonly="true"
            className="h-11 rounded-md border border-border bg-muted px-3 text-sm font-normal text-muted-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Móvil
          <input
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            maxLength={32}
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej. +52 985 000 0000"
            required
            className="h-11 rounded-md border border-border bg-background px-3 text-sm font-normal"
          />
        </label>
        <label className="flex min-h-11 items-start gap-3 rounded-md border border-border/70 p-3 text-xs leading-relaxed">
          <input
            type="checkbox"
            checked={whatsappConsent}
            onChange={(event) => setWhatsappConsent(event.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Confirmo que este móvil tiene WhatsApp y autorizo al Concierge a escribirme sobre
            este viaje.
          </span>
        </label>
      </fieldset>

      <label className="grid gap-1 text-xs font-medium">
        Algo más que deba saber tu concierge (opcional)
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Presupuesto, fechas flexibles, preferencias especiales…"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{summary.length}/500</span>
        <Button type="submit" disabled={!canSend}>
          {send.isPending ? "Enviando…" : "Enviar al Concierge"}
        </Button>
      </div>

      {!briefReady ? (
        <p className="text-xs text-muted-foreground">
          Completa el número de adultos y el modo de transportación para enviar.
        </p>
      ) : null}

      {send.isError ? (
        <p className="text-xs text-destructive">
          {send.error instanceof Error ? send.error.message : "Error al enviar"}
        </p>
      ) : null}
    </form>
  );
}

