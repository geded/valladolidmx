/**
 * /viaje-compartido/$token — US-E4.3 · Vista pública read-only del expediente.
 *
 * Reglas Founder:
 *  · Superficie pública (Discovery Layer); sin auth.
 *  · Sólo lee vía getSharedPlan (RPC SECURITY DEFINER filtra campos).
 *  · Print-to-PDF nativo (window.print) con estilos @media print embebidos.
 *  · No expone user_id, notes privadas del plan, ni acciones de edición.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Landmark,
  Package,
  CalendarDays,
  MapPin,
  StickyNote,
  Printer,
  Users,
  ArrowLeft,
} from "lucide-react";
import {
  getSharedPlan,
  type SharedPlanItem,
  type SharedPlanView,
} from "@/lib/traveler/travel-plans.functions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sharedPlanQuery = (token: string) =>
  queryOptions({
    queryKey: ["shared-plan", token],
    queryFn: async () => {
      const result = await getSharedPlan({ data: { token } });
      if (!result) throw notFound();
      return result;
    },
    staleTime: 60_000,
  });

export const Route = createFileRoute("/viaje-compartido/$token")({
  loader: async ({ params, context }) => {
    if (!UUID_RE.test(params.token)) throw notFound();
    return context.queryClient.ensureQueryData(sharedPlanQuery(params.token));
  },
  head: ({ loaderData }) => {
    const title = loaderData?.plan.title ?? "Expediente de viaje";
    const count = loaderData?.items.length ?? 0;
    const desc = `Expediente compartido con ${count} elemento${count === 1 ? "" : "s"} para el Oriente Maya.`;
    return {
      meta: [
        { title: `${title} · Valladolid.mx` },
        { name: "description", content: desc },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: SharedPlanPage,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : "Error"} />
  ),
  notFoundComponent: () => <NotFoundState />,
});

function SharedPlanPage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(sharedPlanQuery(token));
  return <SharedPlanView data={data} />;
}

/* ------------------------------------------------------------------ */
/* Render                                                             */
/* ------------------------------------------------------------------ */

const KIND_LABEL: Record<SharedPlanItem["item_kind"], string> = {
  destination: "Destino",
  business: "Lugar",
  product: "Experiencia",
  event: "Evento",
  note: "Nota",
};

function KindIcon({ kind }: { kind: SharedPlanItem["item_kind"] }) {
  const cls = "size-3.5";
  switch (kind) {
    case "destination":
      return <MapPin className={cls} aria-hidden />;
    case "business":
      return <Landmark className={cls} aria-hidden />;
    case "product":
      return <Package className={cls} aria-hidden />;
    case "event":
      return <CalendarDays className={cls} aria-hidden />;
    default:
      return <StickyNote className={cls} aria-hidden />;
  }
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  const fmt = (v: string) =>
    new Date(v + "T12:00:00").toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  return fmt((start ?? end)!);
}

function SharedPlanView({ data }: { data: SharedPlanView }) {
  const { plan, items } = data;
  const range = formatDateRange(plan.start_date, plan.end_date);

  return (
    <>
      <PrintStyles />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/arma-tu-viaje"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Arma tu viaje
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Printer className="size-4" aria-hidden />
            Imprimir / Guardar PDF
          </button>
        </div>

        <header className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-10 print:border-0 print:bg-white print:p-0">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Expediente de viaje · Oriente Maya
          </p>
          <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
            {plan.title}
          </h1>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {range ? (
              <div className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                <dt className="sr-only">Fechas</dt>
                <dd>{range}</dd>
              </div>
            ) : null}
            {plan.party_size ? (
              <div className="inline-flex items-center gap-1.5">
                <Users className="size-4" aria-hidden />
                <dt className="sr-only">Personas</dt>
                <dd>
                  {plan.party_size} persona{plan.party_size === 1 ? "" : "s"}
                </dd>
              </div>
            ) : null}
            <div className="inline-flex items-center gap-1.5">
              <dt className="sr-only">Elementos</dt>
              <dd>
                {items.length} elemento{items.length === 1 ? "" : "s"} guardado
                {items.length === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>
        </header>

        <section className="mt-8" aria-labelledby="items-h">
          <h2 id="items-h" className="mb-4 text-xl font-semibold">
            Contenido del expediente
          </h2>
          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Este expediente aún no tiene elementos.
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map((it, idx) => (
                <SharedItem key={it.id} item={it} index={idx + 1} />
              ))}
            </ol>
          )}
        </section>

        <footer className="mt-10 rounded-xl border border-border bg-card p-5 text-xs text-muted-foreground print:mt-8">
          <p>
            <strong className="text-foreground">Valladolid.mx</strong> ·
            Planificador Oficial del Oriente Maya. Este expediente fue compartido
            por su autor; los detalles pueden cambiar. Para reservar o coordinar
            servicios, contacta a un Concierge humano desde{" "}
            <span className="underline">valladolid.mx</span>.
          </p>
        </footer>
      </div>
    </>
  );
}

function SharedItem({ item, index }: { item: SharedPlanItem; index: number }) {
  const snap = item.snapshot ?? {};
  const title = snap.title ?? "Elemento";
  return (
    <li className="flex gap-4 rounded-xl border border-border bg-card p-4 print:break-inside-avoid">
      <div className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-muted text-xs font-semibold text-muted-foreground">
        {index}
      </div>
      {snap.image_url ? (
        <img
          src={snap.image_url}
          alt=""
          loading="lazy"
          className="size-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon kind={item.item_kind} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <KindIcon kind={item.item_kind} />
          {KIND_LABEL[item.item_kind] ?? "Elemento"}
        </p>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {snap.subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{snap.subtitle}</p>
        ) : null}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Print styles                                                        */
/* ------------------------------------------------------------------ */

function PrintStyles() {
  return (
    <style>{`
      @media print {
        @page { margin: 18mm; }
        body { background: white !important; }
        header, footer { break-inside: avoid; }
      }
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* Fallbacks                                                           */
/* ------------------------------------------------------------------ */

function NotFoundState() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Expediente no disponible</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El link puede haber sido revocado por su autor o el token no es válido.
      </p>
      <Link
        to="/arma-tu-viaje"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Arma tu viaje
      </Link>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">No pudimos cargar el expediente</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}