/**
 * /cuenta/notificaciones — Preferencias de notificación del viajero.
 * Etapa 14.50.3 · UNC Preferencias + Categorías + Consentimiento.
 */
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyNotificationPreferences,
  setMyNotificationPreference,
  type PreferenceRow,
} from "@/lib/notifications/preferences.functions";

export const Route = createFileRoute("/_authenticated/cuenta/notificaciones")({
  component: NotificationPreferencesPage,
});

const CATEGORY_LABELS: Record<PreferenceRow["category"], { title: string; help: string }> = {
  transactional: {
    title: "Transaccional",
    help: "Confirmaciones de reserva, pagos y cambios críticos. No se pueden desactivar.",
  },
  security: {
    title: "Seguridad",
    help: "Inicios de sesión, cambios de contraseña y alertas de cuenta. No se pueden desactivar.",
  },
  operational: {
    title: "Operativa",
    help: "Recordatorios de experiencias, cambios de horario y actividad relevante.",
  },
  marketing: {
    title: "Marketing",
    help: "Promociones, recomendaciones y novedades curadas por Alux.",
  },
};

const CHANNEL_LABELS: Record<PreferenceRow["channel"], string> = {
  in_app: "En la app",
  email: "Correo",
  push: "Push",
  webhook: "Webhook",
};

function NotificationPreferencesPage() {
  const fetcher = useServerFn(listMyNotificationPreferences);
  const updater = useServerFn(setMyNotificationPreference);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ["unc", "preferences", "me"],
    queryFn: () => fetcher(),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (vars: { category: PreferenceRow["category"]; channel: PreferenceRow["channel"]; enabled: boolean; consent: boolean }) =>
      updater({ data: vars }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["unc", "preferences", "me"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const grouped = useMemo(() => {
    const map = new Map<PreferenceRow["category"], PreferenceRow[]>();
    (data?.items ?? []).forEach((row) => {
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category)!.push(row);
    });
    return map;
  }, [data]);

  const handleToggle = (row: PreferenceRow, next: boolean) => {
    setError(null);
    let consent = false;
    if (next && row.channel !== "in_app") {
      const ok = window.confirm(
        `Para habilitar ${CHANNEL_LABELS[row.channel]} en la categoría ${CATEGORY_LABELS[row.category].title} confirmamos tu consentimiento explícito. ¿Continuar?`,
      );
      if (!ok) return;
      consent = true;
    }
    mutation.mutate({ category: row.category, channel: row.channel, enabled: next, consent });
  };

  return (
    <div className="space-y-6 p-6 lg:p-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Notificaciones
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Preferencias y consentimiento</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Elige por dónde quieres recibir cada tipo de notificación. Las categorías de
          Transaccional y Seguridad están siempre activas para proteger tus reservas y tu cuenta.
        </p>
      </header>

      {(error ?? queryError) ? (
        <p className="text-sm text-destructive">
          {error ?? (queryError as Error)?.message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando preferencias…</p>
      ) : (
        <div className="space-y-5">
          {(Object.keys(CATEGORY_LABELS) as PreferenceRow["category"][]).map((cat) => {
            const rows = grouped.get(cat) ?? [];
            const meta = CATEGORY_LABELS[cat];
            return (
              <section
                key={cat}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">{meta.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{meta.help}</p>
                  </div>
                </div>

                <ul className="mt-4 divide-y divide-border">
                  {rows.map((row) => (
                    <li
                      key={`${row.category}-${row.channel}`}
                      className="flex items-center justify-between py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{CHANNEL_LABELS[row.channel]}</p>
                        {row.consent_at ? (
                          <p className="text-[11px] text-muted-foreground">
                            Consentimiento: {new Date(row.consent_at).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          disabled={row.locked || mutation.isPending}
                          onChange={(e) => handleToggle(row, e.target.checked)}
                          className="h-4 w-4 accent-primary disabled:opacity-50"
                        />
                        <span className="text-xs text-muted-foreground">
                          {row.locked ? "Siempre activo" : row.enabled ? "Activo" : "Desactivado"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}