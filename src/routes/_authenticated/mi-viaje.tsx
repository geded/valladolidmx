/**
 * /mi-viaje — Panel del Turista (Adenda 15.10.4 · Fase 2).
 * Perfil Inteligente + "Arma tu Viaje" + mis casos del Concierge.
 */
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyTravelerProfile } from "@/lib/traveler/traveler-account.functions";
import { ccCreateCaseFromPlan, ccListMyCases } from "@/lib/concierge/cc.functions";

export const Route = createFileRoute("/_authenticated/mi-viaje")({
  component: MiViajePage,
});

function MiViajePage() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyTravelerProfile);
  const fetchCases = useServerFn(ccListMyCases);
  const createCase = useServerFn(ccCreateCaseFromPlan);

  const { data: profile } = useQuery({
    queryKey: ["traveler", "profile-mini"],
    queryFn: () => fetchProfile(),
    staleTime: 60_000,
  });
  const { data: cases = [] } = useQuery({
    queryKey: ["cc", "my-cases"],
    queryFn: () => fetchCases(),
    staleTime: 15_000,
  });

  const [summary, setSummary] = useState("");
  const create = useMutation({
    mutationFn: (s: string) => createCase({ data: { summary: s, items: [] } }),
    onSuccess: () => {
      setSummary("");
      qc.invalidateQueries({ queryKey: ["cc", "my-cases"] });
    },
  });

  const profileComplete = Boolean(
    profile?.travel_style && profile?.budget_range && (profile?.interests?.length ?? 0) > 0,
  );

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold">Mi viaje</h1>
        <p className="text-muted-foreground mt-1">
          Tu Perfil Inteligente alimenta cada solicitud de "Arma tu Viaje" y guía al Concierge.
        </p>
      </header>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium">Perfil Inteligente</h2>
            <p className="text-sm text-muted-foreground">
              {profileComplete
                ? "Tu perfil está activo. Las solicitudes se contextualizarán automáticamente."
                : "Completa estilo de viaje, presupuesto e intereses para mejores recomendaciones."}
            </p>
          </div>
          <Link
            to="/cuenta/perfil"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {profileComplete ? "Editar perfil" : "Completar perfil"}
          </Link>
        </div>
        {profile ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Field label="Estilo" value={profile.travel_style ?? "—"} />
            <Field label="Presupuesto" value={profile.budget_range ?? "—"} />
            <Field label="Idioma" value={profile.preferred_language ?? "—"} />
            <Field label="Intereses" value={String(profile.interests?.length ?? 0)} />
          </dl>
        ) : null}
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="text-lg font-medium">Arma tu Viaje</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cuéntanos qué quieres vivir. Tu Concierge revisará tu solicitud con el contexto de tu perfil.
        </p>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (summary.trim().length >= 8) create.mutate(summary.trim());
          }}
        >
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Ej. Escapada de 3 días en Valladolid para 2 personas, sin gluten, presupuesto medio…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{summary.length}/500 · mínimo 8 caracteres</span>
            <button
              type="submit"
              disabled={create.isPending || summary.trim().length < 8}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "Enviando…" : "Enviar solicitud"}
            </button>
          </div>
          {create.isError ? (
            <p className="text-xs text-destructive">No se pudo crear la solicitud. Intenta de nuevo.</p>
          ) : null}
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Mis solicitudes</h2>
          <Link to="/cuenta/concierge" className="text-sm text-primary hover:underline">
            Ver historial completo →
          </Link>
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-3">Aún no has creado ninguna solicitud.</p>
        ) : (
          <ul className="mt-4 divide-y">
            {cases.slice(0, 6).map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.summary ?? "(sin resumen)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · {c.priority} · {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to="/cuenta/concierge/$caseId"
                  params={{ caseId: c.id }}
                  className="text-sm text-primary hover:underline shrink-0"
                >
                  Ver caso
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}