/**
 * RatesCalendar — calendario único de precios por día y bloqueos para todo
 * lo que se reserva por fecha: noches de hotel, experiencias, tours y demás
 * salidas. Cada día muestra su precio y su estado; se tocan días para cambiar
 * el precio, volver al precio base, bloquear o desbloquear. En hoteles
 * también se fija cuántas habitaciones iguales hay de cada tipo.
 *
 * Lo usan la empresa (Portal) y el administrador (CMS). Los bloqueos son los
 * cierres de venta de siempre; los horarios de experiencias se siguen
 * creando en su editor de horarios.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getCalendarProduct,
  getManageCalendar,
  listCalendarProducts,
  setCalendarDays,
  setRoomCount,
  type CalendarProduct,
} from "@/lib/commerce/stay-requests.functions";
import {
  dayKey,
  parsePesosToCents,
  shortPrice,
  type CalendarDayAction,
  type CalendarKind,
  type CalendarManageDay,
} from "@/lib/commerce/stay-calendar";

const WEEKDAYS = ["lu", "ma", "mi", "ju", "vi", "sá", "do"];

function monthLabel(d: Date) {
  const label = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function money(cents: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function gridDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, i) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + i),
  );
}

/** Estado corto del día dentro de la celda. */
function dayState(day: CalendarManageDay, kind: CalendarKind): string | null {
  if (day.blocked || day.businessClosed) return "Bloqueado";
  if (kind === "noches") return day.taken >= day.rooms ? "Reservado" : null;
  if (day.departures === 0) return "Sin horario";
  return day.seatsLeft === 0 ? "Lleno" : null;
}

function RoomCountEditor({ product }: { product: CalendarProduct }) {
  const qc = useQueryClient();
  const save = useServerFn(setRoomCount);
  const [value, setValue] = useState(String(product.rooms));
  useEffect(() => setValue(String(product.rooms)), [product.id, product.rooms]);
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 1 && n <= 200;
  const m = useMutation({
    mutationFn: () => save({ data: { productId: product.id, rooms: n } }),
    onSuccess: (res) => {
      toast.success(`${product.name}: ${res.rooms === 1 ? "1 habitación" : `${res.rooms} habitaciones`}`);
      void qc.invalidateQueries({ queryKey: ["commerce", "calendar-products"] });
      void qc.invalidateQueries({ queryKey: ["commerce", "manage-calendar", product.id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "stay-calendar", product.id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo guardar"),
  });
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={`rooms-${product.id}`} className="text-muted-foreground">
        Habitaciones iguales de este tipo
      </label>
      <Input
        id={`rooms-${product.id}`}
        inputMode="numeric"
        className="h-9 w-20"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!valid || n === product.rooms || m.isPending}
        onClick={() => m.mutate()}
      >
        Guardar
      </Button>
    </div>
  );
}

export function RatesCalendar({
  products,
  title,
  description,
}: {
  products: CalendarProduct[];
  title: string;
  description: string;
}) {
  const qc = useQueryClient();
  const fetchCalendar = useServerFn(getManageCalendar);
  const save = useServerFn(setCalendarDays);

  const [productId, setProductId] = useState<string | null>(null);
  const product = products.find((r) => r.id === productId) ?? products[0] ?? null;
  const kind: CalendarKind = product?.kind ?? "noches";

  const today = dayKey(new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const days = useMemo(() => gridDays(month), [month]);
  const from = dayKey(days[0] ?? month);

  const calQ = useQuery({
    queryKey: ["commerce", "manage-calendar", product?.id, from],
    queryFn: () => fetchCalendar({ data: { productId: product!.id, from } }),
    enabled: Boolean(product),
    staleTime: 15_000,
  });
  const byDay = useMemo(
    () => new Map<string, CalendarManageDay>((calQ.data ?? []).map((n) => [n.day, n])),
    [calQ.data],
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [price, setPrice] = useState("");

  const m = useMutation({
    mutationFn: (args: { action: CalendarDayAction; priceCents?: number }) =>
      save({
        data: {
          productId: product!.id,
          days: selected,
          action: args.action,
          ...(args.priceCents ? { priceCents: args.priceCents } : {}),
        },
      }),
    onSuccess: (_res, args) => {
      const n = selected.length;
      const what =
        args.action === "price"
          ? "Precio guardado"
          : args.action === "base_price"
            ? "Volvieron al precio base"
            : args.action === "block"
              ? "Días bloqueados"
              : "Días desbloqueados";
      toast.success(`${what} · ${n} ${n === 1 ? "día" : "días"}`);
      setSelected([]);
      setPrice("");
      void qc.invalidateQueries({ queryKey: ["commerce", "manage-calendar", product?.id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "stay-calendar", product?.id] });
      void qc.invalidateQueries({ queryKey: ["commerce", "public-departures", product?.id] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo guardar"),
  });

  if (!product) return null;

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key].sort()));

  const priceCents = parsePesosToCents(price);
  const selectedBlocked = selected.some((k) => byDay.get(k)?.blocked);
  const selectedOpen = selected.some((k) => !byDay.get(k)?.blocked);
  const selectedCustom = selected.some((k) => byDay.get(k)?.customPrice);
  const unit = kind === "noches" ? "por noche" : "por persona";

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
        {kind === "noches" ? "Hospedaje" : "Experiencias y tours"}
      </p>
      <h3 className="mt-1 text-xl">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      {products.length > 1 ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Producto">
          {products.map((r) => (
            <Button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === product.id}
              size="sm"
              variant={r.id === product.id ? "default" : "outline"}
              className="shrink-0"
              onClick={() => {
                setProductId(r.id);
                setSelected([]);
              }}
            >
              {r.name}
            </Button>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {product.name} · precio base {product.basePriceCents ? money(product.basePriceCents) : "sin precio"} {unit}
        {kind === "noches" ? ` · ${product.rooms === 1 ? "1 habitación" : `${product.rooms} habitaciones`}` : ""}
      </p>
      {kind === "noches" ? <RoomCountEditor product={product} /> : null}

      <div className="mt-4 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mes anterior"
          onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-medium">{monthLabel(month)}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Mes siguiente"
          onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-medium uppercase text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" aria-busy={calQ.isLoading}>
        {days.map((d) => {
          const key = dayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const day = byDay.get(key);
          const past = key < today;
          const isSel = selected.includes(key);
          const closed = day ? day.blocked || day.businessClosed : false;
          const state = day ? dayState(day, kind) : null;
          const left =
            day && !state && kind === "noches" && day.rooms > 1 ? `${day.rooms - day.taken} de ${day.rooms}` : null;
          return (
            <button
              key={key}
              type="button"
              disabled={past || !inMonth || !day}
              onClick={() => toggle(key)}
              aria-pressed={isSel}
              aria-label={`${d.getDate()} ${monthLabel(d)}${day?.priceCents ? `, ${money(day.priceCents)}` : ""}${state ? `, ${state.toLowerCase()}` : ""}${left ? `, ${left} libres` : ""}`}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-start justify-between overflow-hidden rounded-md border px-0.5 py-1.5 text-left transition-colors sm:min-h-16 sm:px-1.5",
                !inMonth && "invisible",
                past && "border-transparent bg-muted/30 text-muted-foreground/60",
                !past && !isSel && "border-border bg-background hover:border-primary/50",
                closed && !isSel && "bg-muted text-muted-foreground",
                isSel && "border-primary bg-primary text-primary-foreground",
              )}
            >
              <span className={cn("text-sm font-semibold", closed && !isSel && "line-through")}>{d.getDate()}</span>
              {day && !past ? (
                <span className="flex max-w-full flex-col">
                  {day.priceCents && !closed ? (
                    <span
                      className={cn(
                        "max-w-full whitespace-nowrap text-[0.56rem] font-medium leading-tight tracking-tighter sm:text-[0.7rem]",
                        day.customPrice && !isSel && "text-primary",
                      )}
                    >
                      {shortPrice(day.priceCents)}
                    </span>
                  ) : null}
                  {state || left ? (
                    <span className="max-w-full truncate text-[0.55rem] leading-tight opacity-80">{state ?? left}</span>
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] text-muted-foreground">
        <span>
          <span className="font-medium text-primary">$</span> precio especial
        </span>
        <span>Gris: bloqueado</span>
        {kind === "noches" ? (
          <span>«Reservado»: no quedan habitaciones</span>
        ) : (
          <span>«Sin horario»: ese día no hay salidas; se crean en Horarios</span>
        )}
      </p>

      {selected.length > 0 ? (
        <div className="sticky bottom-20 z-10 mt-4 space-y-3 rounded-lg border border-primary/40 bg-background p-3 shadow-floating lg:bottom-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {selected.length} {selected.length === 1 ? "día seleccionado" : "días seleccionados"}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected([])}>
              Limpiar
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={
                product.basePriceCents ? `Ej. ${Math.round(product.basePriceCents / 100)}` : `Precio ${unit}`
              }
              aria-label={`Precio ${unit} de los días seleccionados`}
            />
            <Button
              type="button"
              disabled={!priceCents || m.isPending}
              onClick={() => priceCents && m.mutate({ action: "price", priceCents })}
            >
              Guardar precio
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedOpen ? (
              <Button type="button" variant="outline" size="sm" disabled={m.isPending} onClick={() => m.mutate({ action: "block" })}>
                Bloquear
              </Button>
            ) : null}
            {selectedBlocked ? (
              <Button type="button" variant="outline" size="sm" disabled={m.isPending} onClick={() => m.mutate({ action: "unblock" })}>
                Desbloquear
              </Button>
            ) : null}
            {selectedCustom ? (
              <Button type="button" variant="ghost" size="sm" disabled={m.isPending} onClick={() => m.mutate({ action: "base_price" })}>
                Volver al precio base
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">Bloquear no cancela reservas que ya existen; solo evita nuevas.</p>
        </div>
      ) : null}
    </section>
  );
}

/** Calendario de una empresa: sus habitaciones (noches) o sus experiencias (días). */
export function BusinessRatesCalendar({ businessId, kind }: { businessId: string; kind: CalendarKind }) {
  const fetchProducts = useServerFn(listCalendarProducts);
  const q = useQuery({
    queryKey: ["commerce", "calendar-products", businessId, kind],
    queryFn: () => fetchProducts({ data: { businessId, kind } }),
    staleTime: 60_000,
    retry: false,
  });
  if (!q.data || q.data.length === 0) return null;
  return kind === "noches" ? (
    <RatesCalendar
      products={q.data}
      title="Calendario de precios y disponibilidad"
      description="Toca los días para cambiar el precio de esas noches o bloquearlas. Lo que guardes aquí es lo que ve el viajero al reservar."
    />
  ) : (
    <RatesCalendar
      products={q.data}
      title="Calendario de precios de experiencias"
      description="Toca los días para cambiar el precio por persona o bloquearlos. Los horarios y lugares se siguen creando en Horarios."
    />
  );
}

/** Calendario de un solo producto (ficha comercial en el CMS). */
export function ProductRatesCalendar({ productId }: { productId: string }) {
  const fetchProduct = useServerFn(getCalendarProduct);
  const q = useQuery({
    queryKey: ["commerce", "calendar-products", "one", productId],
    queryFn: () => fetchProduct({ data: { productId } }),
    staleTime: 60_000,
    retry: false,
  });
  if (!q.data) return null;
  return (
    <RatesCalendar
      products={[q.data]}
      title="Calendario de precios por día"
      description="Toca los días para cambiar el precio por persona o bloquearlos. Lo que guardes aquí es lo que ve el viajero al reservar."
    />
  );
}
