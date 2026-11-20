/* eslint-disable @typescript-eslint/no-explicit-any -- client authenticated by generated middleware. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  normalizeExceptionDates,
  normalizeScheduleTimes,
  type EventRecurrenceFrequency,
} from "@/lib/events/recurrence";

export interface EventRecurrenceEditorDTO {
  recurrenceFrequency: EventRecurrenceFrequency | null;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceUntil: string | null;
  scheduleTimes: ReturnType<typeof normalizeScheduleTimes>;
  exceptionDates: ReturnType<typeof normalizeExceptionDates>;
  eventTimezone: "America/Merida";
}

function eventIdOf(input: unknown): string {
  const id = (input as { eventId?: unknown } | null)?.eventId;
  if (typeof id !== "string" || id.length < 8) throw new Error("invalid_event");
  return id;
}

async function assertEditorial(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_editor_or_admin", {
    _user_id: context.userId,
  });
  if (error) throw new Error(`role_check_failed:${error.message}`);
  if (!data) throw new Error("forbidden");
}

function normalizeFrequency(value: unknown): EventRecurrenceFrequency | null {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "yearly"
    ? value
    : null;
}

function mapRow(row: any): EventRecurrenceEditorDTO {
  return {
    recurrenceFrequency: normalizeFrequency(row.recurrence_frequency),
    recurrenceInterval: Math.max(1, Math.min(99, Number(row.recurrence_interval) || 1)),
    recurrenceWeekdays: Array.isArray(row.recurrence_weekdays)
      ? row.recurrence_weekdays.filter((day: unknown) => Number.isInteger(day) && Number(day) >= 0 && Number(day) <= 6)
      : [],
    recurrenceUntil: typeof row.recurrence_until === "string" ? row.recurrence_until : null,
    scheduleTimes: normalizeScheduleTimes(row.schedule_times),
    exceptionDates: normalizeExceptionDates(row.exception_dates),
    eventTimezone: "America/Merida",
  };
}

async function readRecurrence(supabase: any, eventId: string) {
  const { data, error } = await supabase
    .from("events")
    .select("recurrence_frequency, recurrence_interval, recurrence_weekdays, recurrence_until, schedule_times, exception_dates, event_timezone")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single();
  if (error || !data) throw new Error(`get_event_recurrence_failed:${error?.message ?? "404"}`);
  return mapRow(data);
}

export const getEventRecurrenceEditor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string }) => ({ eventId: eventIdOf(input) }))
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    return readRecurrence(context.supabase as any, data.eventId);
  });

export const updateEventRecurrence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; values: EventRecurrenceEditorDTO }) => {
    const frequency = normalizeFrequency(input.values?.recurrenceFrequency);
    const interval = Math.max(1, Math.min(99, Math.floor(Number(input.values?.recurrenceInterval) || 1)));
    const weekdays = Array.from(
      new Set((input.values?.recurrenceWeekdays ?? []).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
    ).sort();
    const until = input.values?.recurrenceUntil;
    return {
      eventId: eventIdOf(input),
      values: {
        recurrenceFrequency: frequency,
        recurrenceInterval: interval,
        recurrenceWeekdays: frequency === "weekly" ? weekdays : [],
        recurrenceUntil: typeof until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(until) ? until : null,
        scheduleTimes: normalizeScheduleTimes(input.values?.scheduleTimes),
        exceptionDates: normalizeExceptionDates(input.values?.exceptionDates),
        eventTimezone: "America/Merida" as const,
      },
    };
  })
  .handler(async ({ data, context }) => {
    await assertEditorial(context);
    const { error } = await (context.supabase as any)
      .from("events")
      .update({
        recurrence_frequency: data.values.recurrenceFrequency,
        recurrence_interval: data.values.recurrenceInterval,
        recurrence_weekdays: data.values.recurrenceWeekdays,
        recurrence_until: data.values.recurrenceUntil,
        schedule_times: data.values.scheduleTimes,
        exception_dates: data.values.exceptionDates,
        event_timezone: data.values.eventTimezone,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.eventId)
      .is("deleted_at", null);
    if (error) throw new Error(`update_event_recurrence_failed:${error.message}`);
    return data.values;
  });