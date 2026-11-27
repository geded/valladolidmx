import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CarFront, Languages, ShieldCheck } from "lucide-react";
import { PublicShell } from "@/components/discovery";
import { TaxiQuoteForm } from "@/components/taxi/TaxiQuoteForm";
import { TaxiAppInstallCard } from "@/components/taxi/TaxiAppInstallCard";
import { buildPublicHead } from "@/lib/discovery/seo";
import { getTaxiPublicConfig } from "@/lib/taxi/taxi.functions";
import { useAuth } from "@/hooks/useAuth";

const configQuery = queryOptions({
  queryKey: ["taxi", "public-config"],
  queryFn: () => getTaxiPublicConfig(),
  staleTime: 15_000,
});

export const Route = createFileRoute("/taxi")({
  loader: ({ context }) => context.queryClient.ensureQueryData(configQuery),
  head: () =>
    buildPublicHead({
      title: "Taxi Alux · Transporte turístico en Valladolid y Oriente Maya",
      description:
        "Cotiza y solicita conductores turísticos aprobados, con precio antes de pedir, pago en efectivo y seguimiento desde la aplicación.",
      path: "/taxi",
      breadcrumbs: [
        { label: "Inicio", path: "/" },
        { label: "Taxi Alux", path: "/taxi" },
      ],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Taxi Alux",
          serviceType: "Transporte turístico",
          areaServed: "Valladolid y Oriente Maya de Yucatán",
          provider: { "@type": "Organization", name: "Valladolid.mx" },
        },
      ],
    }),
  component: TaxiPage,
});

function TaxiPage() {
  const { data: config } = useSuspenseQuery(configQuery);
  const { user } = useAuth();
  const [back, setBack] = useState<{ path: string; label: string } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const path = q.get("volver") ?? "";
    // Sólo rutas internas: evita redirecciones a otros sitios.
    if (path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/taxi")) {
      setBack({ path, label: (q.get("volverLabel") ?? "").slice(0, 60) || "la página anterior" });
    }
  }, []);
  return (
    <PublicShell
      crumbs={[{ label: "Inicio", to: "/" }, { label: "Taxi Alux" }]}
      compactCrumbsOnMobile
      className="pb-12 pt-5 sm:pt-8"
    >
      <div className="mx-auto max-w-6xl">
        {back ? (
          <a
            href={back.path}
            className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-soft"
          >
            <ArrowLeft className="size-4" /> Volver a {back.label}
          </a>
        ) : null}
        <header className="mb-4 max-w-3xl sm:mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Taxi Alux</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-4xl">
            Tu traslado por el Oriente Maya, con precio antes de pedir
          </h1>
          <p className="mt-3 hidden text-sm leading-6 sm:block text-muted-foreground sm:text-base">
            Conductores turísticos revisados por Valladolid.mx, atención en inglés y pago en
            efectivo al terminar tu viaje.
          </p>
          <div className="mt-4 hidden flex-wrap gap-2 text-xs sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <ShieldCheck className="size-4 text-primary" /> Conductores aprobados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <Languages className="size-4 text-primary" /> Inglés para viajeros
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <CarFront className="size-4 text-primary" /> Efectivo al conductor
            </span>
          </div>
        </header>

        {config.enabled ? (
          <TaxiQuoteForm config={config} />
        ) : (
          <section className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8">
            <CarFront className="size-8 text-primary" />
            <h2 className="mt-3 text-xl font-semibold">Taxi Alux todavía no está disponible</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              El administrador está preparando la red de conductores. En cuanto active el servicio
              y haya disponibilidad, aquí podrás cotizar y solicitar tu traslado.
            </p>
          </section>
        )}

        <div className="mt-6">
          <TaxiAppInstallCard signedIn={Boolean(user)} />
        </div>
      </div>
    </PublicShell>
  );
}
