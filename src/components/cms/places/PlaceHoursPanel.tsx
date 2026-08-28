/**
 * G8-Q2B · Panel de horarios del lugar (7 días).
 * Presentación pura: la validación efectiva ocurre en `setPlaceHoursCms`.
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast";
import { setPlaceHoursCms } from "@/lib/places/places-cms.functions";
import { PlaceSection, inputClass, primaryButtonClass } from "./PlaceSection";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface HoursRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  notes?: string | null;
}

interface Props {
  placeId: string;
  initial: HoursRow[];
  onSaved?: () => void;
}

function emptyWeek(): HoursRow[] {
  return DAYS.map((_, day) => ({
    day_of_week: day,
    opens_at: null,
    closes_at: null,
    is_closed: true,
  }));
}

export function PlaceHoursPanel({ placeId, initial, onSaved }: Props) {
  const [rows, setRows] = useState<HoursRow[]>(emptyWeek());
  const saveFn = useServerFn(setPlaceHoursCms);

  useEffect(() => {
    const base = emptyWeek();
    for (const row of initial) {
      base[row.day_of_week] = {
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        opens_at: row.opens_at ? row.opens_at.slice(0, 5) : null,
        closes_at: row.closes_at ? row.closes_at.slice(0, 5) : null,
        notes: row.notes ?? null,
      };
    }
    setRows(base);
  }, [initial]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          place_id: placeId,
          hours: rows.map((r) => ({
            day_of_week: r.day_of_week,
            is_closed: r.is_closed,
            opens_at: r.is_closed ? null : (r.opens_at ?? null),
            closes_at: r.is_closed ? null : (r.closes_at ?? null),
            notes: r.notes ?? null,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("Horarios guardados.");
      onSaved?.();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar los horarios."),
  });

  const update = (day: number, patch: Partial<HoursRow>) =>
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));

  return (
    <PlaceSection
      id="place-hours"
      title="Horarios de visita"
      description="Marca los días cerrados o define apertura y cierre en formato de 24 horas."
      actions={
        <button
          type="button"
          className={primaryButtonClass}
          disabled={save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Guardando…" : "Guardar horarios"}
        </button>
      }
    >
      <ul className="md:col-span-2 space-y-2">
        {rows.map((row) => (
          <li
            key={row.day_of_week}
            className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="w-28 shrink-0 text-xs font-medium">{DAYS[row.day_of_week]}</span>
            <label className="inline-flex min-h-11 items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="size-5"
                checked={row.is_closed}
                onChange={(e) => update(row.day_of_week, { is_closed: e.target.checked })}
              />
              Cerrado
            </label>
            <div className="flex flex-1 items-center gap-2">
              <label className="sr-only" htmlFor={`opens-${row.day_of_week}`}>
                Apertura {DAYS[row.day_of_week]}
              </label>
              <input
                id={`opens-${row.day_of_week}`}
                type="time"
                disabled={row.is_closed}
                value={row.opens_at ?? ""}
                onChange={(e) => update(row.day_of_week, { opens_at: e.target.value || null })}
                className={`${inputClass} max-w-[9rem] disabled:opacity-50`}
              />
              <span aria-hidden className="text-xs text-muted-foreground">
                a
              </span>
              <label className="sr-only" htmlFor={`closes-${row.day_of_week}`}>
                Cierre {DAYS[row.day_of_week]}
              </label>
              <input
                id={`closes-${row.day_of_week}`}
                type="time"
                disabled={row.is_closed}
                value={row.closes_at ?? ""}
                onChange={(e) => update(row.day_of_week, { closes_at: e.target.value || null })}
                className={`${inputClass} max-w-[9rem] disabled:opacity-50`}
              />
            </div>
          </li>
        ))}
      </ul>
    </PlaceSection>
  );
}
