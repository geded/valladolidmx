/**
 * StayDatesPicker — llegada, salida y huéspedes para reservas por noche.
 * Vive dentro del diálogo de `ReserveOnlineButton`; las noches libres
 * vienen de `getStayCalendar` y la regla de encaje de `stay-calendar.ts`.
 */
import { useMemo } from "react";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  STAY_CONFIRM_HOURS,
  addDays,
  dayKey,
  nightsBetween,
  shortPrice,
  stayFits,
  stayTotalFromPrices,
  type StayNight,
} from "@/lib/commerce/stay-calendar";

function money(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function StayDatesPicker({
  nights,
  priceCents,
  capacity,
  range,
  onRangeChange,
  guests,
  onGuestsChange,
}: {
  nights: StayNight[];
  priceCents: number;
  capacity: number | null;
  range: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
  guests: number;
  onGuestsChange: (guests: number) => void;
}) {
  const calendar = useMemo(() => new Map(nights.map((n) => [n.night, n.available])), [nights]);
  const prices = useMemo(() => new Map(nights.map((n) => [n.night, n.priceCents])), [nights]);
  const first = nights[0]?.night;
  const last = nights[nights.length - 1]?.night;
  const maxGuests = capacity ?? 6;

  const checkIn = range?.from ? dayKey(range.from) : null;
  const checkOut = range?.to ? dayKey(range.to) : null;
  const complete = checkIn && checkOut && checkIn !== checkOut;
  const fits = complete ? stayFits(calendar, checkIn, checkOut) : false;

  function isDisabled(date: Date): boolean {
    const key = dayKey(date);
    if (!first || !last || key < first) return true;
    // La salida puede caer un día después de la última noche visible.
    if (key > last && !(checkIn && !checkOut && nightsBetween(last, key) === 1)) return true;
    const free = (calendar.get(key) ?? 0) > 0;
    if (free) return false;
    // Noche ocupada: solo sirve como día de salida de una estancia que cabe.
    return !(checkIn && !checkOut && key > checkIn && stayFits(calendar, checkIn, key));
  }

  const total = complete && fits ? stayTotalFromPrices(prices, priceCents, checkIn, checkOut) : 0;
  const nightCount = complete ? nightsBetween(checkIn, checkOut) : 0;
  const samePrice = Array.from({ length: nightCount }, (_, i) =>
    checkIn ? (prices.get(addDays(checkIn, i)) ?? priceCents) : priceCents,
  ).every((c) => c === priceCents);

  /* Cada día muestra su precio por noche, como en el calendario del hotel. */
  function PriceDayButton(props: React.ComponentProps<typeof CalendarDayButton>) {
    const key = dayKey(props.day.date);
    const free = (calendar.get(key) ?? 0) > 0;
    const price = prices.get(key);
    return (
      <CalendarDayButton
        {...props}
        aria-label={
          free && price ? `${props.day.date.getDate()}, ${shortPrice(price)} por noche` : undefined
        }
      >
        <span className="text-sm font-semibold">{props.day.date.getDate()}</span>
        {free && price ? <span className="text-[0.6rem] font-medium leading-none">{shortPrice(price)}</span> : null}
      </CalendarDayButton>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Llegada y salida</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2.5 rounded-sm bg-success/20 ring-1 ring-success/40" />
            Libres · precio por noche
          </span>
        </div>
        <Calendar
          mode="range"
          locale={es}
          selected={range}
          onSelect={onRangeChange}
          defaultMonth={first ? fromKey(first) : undefined}
          startMonth={first ? fromKey(first) : undefined}
          endMonth={last ? fromKey(last) : undefined}
          disabled={isDisabled}
          components={{ DayButton: PriceDayButton }}
          modifiers={{ libre: (date) => (calendar.get(dayKey(date)) ?? 0) > 0 }}
          modifiersClassNames={{ libre: "[&>button]:bg-success/15 [&>button]:text-success" }}
          className="pointer-events-auto mx-auto mt-2 w-full p-0 [--cell-size:clamp(2.6rem,11.5vw,3.25rem)]"
          classNames={{ root: "w-full", month: "w-full", month_grid: "w-full" }}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {checkIn && !complete
            ? "Ahora elige el día de salida."
            : complete && !fits
              ? "Alguna de esas noches no está libre. Prueba otras fechas."
              : "Toca el día de llegada y luego el de salida."}
        </p>
      </div>

      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Huéspedes</p>
        <div className="mt-2 flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => onGuestsChange(Math.max(1, guests - 1))}>
            −
          </Button>
          <span className="min-w-8 text-center text-sm font-medium">{guests}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onGuestsChange(Math.min(maxGuests, guests + 1))}
          >
            +
          </Button>
          <span className="text-xs text-muted-foreground">Máximo {maxGuests} en esta habitación</span>
        </div>
      </div>

      {complete && fits ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="flex items-center justify-between gap-3">
            <span>
              {nightCount} {nightCount === 1 ? "noche" : "noches"}
              {samePrice ? ` × ${money(priceCents)}` : " · precio según cada noche"}
            </span>
            <span className="font-semibold">{money(total)}</span>
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        El hotel confirma en menos de {STAY_CONFIRM_HOURS} horas. Pagas cuando confirme; mientras, te apartamos las
        noches.
      </p>
    </div>
  );
}
