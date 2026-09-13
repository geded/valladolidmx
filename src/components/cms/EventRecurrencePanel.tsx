import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  getEventRecurrenceEditor,
  updateEventRecurrence,
  type EventRecurrenceEditorDTO,
} from "@/lib/cms/event-recurrence.functions";

const EMPTY: EventRecurrenceEditorDTO = {
  recurrenceFrequency: null,
  recurrenceInterval: 1,
  recurrenceWeekdays: [],
  recurrenceUntil: null,
  scheduleTimes: [],
  exceptionDates: [],
  eventTimezone: "America/Merida",
};

const DAYS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "M" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
] as const;

export function EventRecurrencePanel({ eventId }: { eventId: string }) {
  const getEditor = useServerFn(getEventRecurrenceEditor);
  const updateEditor = useServerFn(updateEventRecurrence);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["event-recurrence-editor", eventId],
    queryFn: () => getEditor({ data: { eventId } }),
  });
  const [values, setValues] = useState<EventRecurrenceEditorDTO>(EMPTY);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setValues(query.data);
    setDirty(false);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () => updateEditor({ data: { eventId, values } }),
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ["event-recurrence-editor", eventId] });
    },
  });

  if (query.isLoading) return <section className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Cargando repetición…</section>;
  if (query.isError) return <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">No se pudo cargar la repetición.</section>;

  const set = (patch: Partial<EventRecurrenceEditorDTO>) => {
    setValues((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase text-primary">Repetición</p>
      <h2 className="mt-2 text-2xl">Funciones y días suspendidos</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Configura la programación confirmada. Si no se repite, la fecha principal se conserva como hoy.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block text-sm font-semibold">Se repite
          <select value={values.recurrenceFrequency ?? ""} onChange={(event) => set({ recurrenceFrequency: (event.target.value || null) as EventRecurrenceEditorDTO["recurrenceFrequency"] })} className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 font-normal">
            <option value="">No se repite</option><option value="daily">Todos los días</option><option value="weekly">Cada semana</option><option value="monthly">Cada mes</option><option value="yearly">Cada año</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Cada
          <input type="number" min={1} max={99} value={values.recurrenceInterval} onChange={(event) => set({ recurrenceInterval: Number(event.target.value) || 1 })} className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Hasta
          <input type="date" value={values.recurrenceUntil ?? ""} onChange={(event) => set({ recurrenceUntil: event.target.value || null })} className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 font-normal" />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">Vacío significa sin fecha final.</span>
        </label>
        <div className="text-sm font-semibold">Zona horaria
          <div className="mt-2 flex min-h-11 items-center rounded-md border border-border bg-muted/40 px-3 font-normal">Valladolid, Yucatán</div>
        </div>
      </div>

      {values.recurrenceFrequency === "weekly" ? <fieldset className="mt-5"><legend className="text-sm font-semibold">Días de la semana</legend><div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => { const active = values.recurrenceWeekdays.includes(day.value); return <Button key={day.value} type="button" size="icon" variant={active ? "default" : "outline"} aria-pressed={active} aria-label={`Día ${day.label}`} onClick={() => set({ recurrenceWeekdays: active ? values.recurrenceWeekdays.filter((value) => value !== day.value) : [...values.recurrenceWeekdays, day.value] })}>{day.label}</Button>; })}</div></fieldset> : null}

      <div className="mt-6 border-t border-border pt-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Horarios del día</h3><p className="mt-1 text-xs text-muted-foreground">Puedes añadir varias funciones y su idioma.</p></div><Button type="button" size="sm" variant="outline" onClick={() => set({ scheduleTimes: [...values.scheduleTimes, { time: "20:00", label: null }] })}><Plus /> Función</Button></div><div className="mt-3 space-y-2">{values.scheduleTimes.map((item, index) => <div key={`${item.time}-${index}`} className="grid grid-cols-[8rem_1fr_2.5rem] gap-2"><input aria-label={`Hora ${index + 1}`} type="time" value={item.time} onChange={(event) => set({ scheduleTimes: values.scheduleTimes.map((current, i) => i === index ? { ...current, time: event.target.value } : current) })} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" /><input aria-label={`Idioma o etiqueta ${index + 1}`} type="text" value={item.label ?? ""} placeholder="Idioma o etiqueta" onChange={(event) => set({ scheduleTimes: values.scheduleTimes.map((current, i) => i === index ? { ...current, label: event.target.value } : current) })} className="min-h-11 min-w-0 rounded-md border border-border bg-background px-3 text-sm" /><Button type="button" size="icon" variant="ghost" aria-label="Eliminar función" onClick={() => set({ scheduleTimes: values.scheduleTimes.filter((_, i) => i !== index) })}><Trash2 /></Button></div>)}</div></div>

      <div className="mt-6 border-t border-border pt-5"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Días sin función</h3><p className="mt-1 text-xs text-muted-foreground">Registra suspensiones concretas y su motivo.</p></div><Button type="button" size="sm" variant="outline" onClick={() => set({ exceptionDates: [...values.exceptionDates, { date: "", note: null }] })}><Plus /> Fecha</Button></div><div className="mt-3 space-y-2">{values.exceptionDates.map((item, index) => <div key={`${item.date}-${index}`} className="grid grid-cols-[9.5rem_1fr_2.5rem] gap-2"><input aria-label={`Fecha suspendida ${index + 1}`} type="date" value={item.date} onChange={(event) => set({ exceptionDates: values.exceptionDates.map((current, i) => i === index ? { ...current, date: event.target.value } : current) })} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm" /><input aria-label={`Motivo ${index + 1}`} type="text" value={item.note ?? ""} placeholder="Motivo opcional" onChange={(event) => set({ exceptionDates: values.exceptionDates.map((current, i) => i === index ? { ...current, note: event.target.value } : current) })} className="min-h-11 min-w-0 rounded-md border border-border bg-background px-3 text-sm" /><Button type="button" size="icon" variant="ghost" aria-label="Eliminar suspensión" onClick={() => set({ exceptionDates: values.exceptionDates.filter((_, i) => i !== index) })}><Trash2 /></Button></div>)}</div></div>

      {mutation.isError ? <p className="mt-4 text-sm text-destructive">No se pudo guardar la repetición.</p> : null}
      {mutation.isSuccess && !dirty ? <p className="mt-4 text-sm text-primary">Programación guardada.</p> : null}
      <Button type="button" className="mt-5" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Guardando…" : "Guardar repetición"}</Button>
    </section>
  );
}