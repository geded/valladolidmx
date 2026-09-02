import { type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Award,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  Plus,
  Shirt,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { TourismAluxPanel } from "@/components/alux/TourismAluxPanel";
import { PublicShell } from "@/components/discovery";
import { ACTIVE_BRAND } from "@/config/brand";
import { InteractiveMap } from "@/components/maps/InteractiveMap";

export const Route = createFileRoute("/lovable/founder-zazil-premium-preview")({
  validateSearch: (search: Record<string, unknown>) => ({
    presentacion:
      search.presentacion === "cinematografica" ? ("cinematografica" as const) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Zazil Tunich · Landing Premium Founder · Sol/Luna" },
      {
        name: "description",
        content: "Vista Founder noindex de la Landing Premium Sol/Luna de Zazil Tunich.",
      },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: FounderZazilPremiumPreview,
});

const HERO =
  "/api/public/studio-media/conceptual-preview/2026-09-01/zazil-tunich-hero-preview.webp";

function FounderZazilPremiumPreview() {
  const { presentacion } = Route.useSearch();
  return (
    <ZazilTunichPremiumSurface
      presentation={presentacion === "cinematografica" ? "cinematic" : "editorial"}
    />
  );
}

export function ZazilTunichPremiumSurface({
  presentation = "editorial",
}: {
  presentation?: "editorial" | "cinematic";
}) {
  const luna = presentation === "cinematic";

  return (
    <PublicShell
      variant="hero"
      crumbs={[
        { label: "Oriente Maya", to: "/oriente-maya" },
        { label: "Valladolid", to: "/oriente-maya/valladolid" },
        { label: "Zazil Tunich" },
      ]}
    >
      <div
        data-founder-preview="zazil-premium-integrated"
        data-premium-presentation={luna ? "cinematic" : "editorial"}
        className="min-h-svh bg-background text-foreground"
      >
        <div>
          <section className="relative isolate min-h-[40rem] overflow-hidden border-b border-current/15 sm:min-h-[42rem] lg:min-h-[28.5rem]">
            <img
              src={HERO}
              alt="Caverna de piedra caliza con agua turquesa y sendero iluminado"
              className="absolute inset-0 -z-30 size-full object-cover"
            />
            <div
              className={
                luna
                  ? "absolute inset-0 -z-20 bg-gradient-to-r from-[#050e12] via-[#050e12]/90 to-black/5"
                  : "absolute inset-0 -z-20 bg-gradient-to-r from-[#f7f3ea] via-[#f7f3ea]/90 to-transparent"
              }
            />
            <div className="mx-auto grid min-h-[inherit] max-w-[1500px] items-center px-6 py-10 sm:px-10 lg:px-16 lg:py-8">
              <div className="max-w-2xl">
                <h1 className="font-serif text-6xl leading-[0.92] sm:text-7xl">Zazil Tunich</h1>
                <p className="mt-3 font-serif text-2xl text-[#b97b00] sm:text-3xl">
                  Cenote-Museo · Valladolid, Yucatán
                </p>
                <div className="mt-5 h-0.5 w-14 bg-[#c78a14]" />
                <h2 className="mt-5 font-serif text-3xl sm:text-4xl">
                  Un viaje al Inframundo Maya
                </h2>
                <p className="mt-2 text-lg opacity-85">
                  Naturaleza, memoria y cultura viva bajo la tierra.
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#b97b00]">
                  {ACTIVE_BRAND.discoveryPromise}
                </p>
                <div className="mt-7 flex flex-wrap gap-4">
                  <a
                    href="#experiencias"
                    className="inline-flex min-h-14 items-center gap-5 rounded-md bg-[#004d32] px-8 font-semibold uppercase tracking-wide text-white"
                  >
                    Ver experiencias <span>→</span>
                  </a>
                  <Link
                    to="/arma-tu-viaje"
                    className="inline-flex min-h-14 items-center gap-3 rounded-md border border-current px-7 font-medium uppercase tracking-wide"
                  >
                    Agregar a Mi Viaje <Plus className="size-5" />
                  </Link>
                </div>
              </div>
            </div>
            <Link
              to="/auth"
              className="absolute right-6 top-6 z-10 hidden min-h-11 items-center gap-3 rounded-full border border-white/60 bg-black/15 px-4 text-white backdrop-blur-sm lg:inline-flex xl:right-16"
              aria-label="Iniciar sesión para guardar Zazil Tunich"
            >
              <span className="grid size-9 place-items-center rounded-full border border-white/70">
                <Heart className="size-5" />
              </span>
              <span className="text-sm">Guardar</span>
            </Link>
          </section>

          <ProofStrip luna={luna} />

          <div className="mx-auto grid max-w-[1500px] items-start gap-7 px-6 py-6 sm:px-10 lg:grid-cols-[0.92fr_1.28fr_0.9fr_0.9fr] lg:px-16 xl:gap-8">
            <Story />
            <FeaturedExperience luna={luna} />
            <VisitInfo />
            <TerritorialContext />
          </div>

          <AluxBand />
        </div>
      </div>
    </PublicShell>
  );
}

function ProofStrip({ luna }: { luna: boolean }) {
  const facts = [
    [<Award key="award" />, "Premio Nacional a la Innovación Turística 2023", null],
    [
      <Sparkles key="sparkles" />,
      "Reconocimiento institucional · denominación por verificar",
      null,
    ],
    [
      <GoogleG key="google" luna={luna} />,
      "Calificación y reseñas · sincronización pendiente",
      "https://www.google.com/search?q=Zazil+Tunich",
    ],
    [
      <MapPin key="pin" />,
      "A 6 km de Valladolid",
      "https://www.google.com/maps/search/?api=1&query=Zazil+Tunich+Yucatan",
    ],
  ] as const;
  return (
    <div className="border-b border-current/15">
      <ul className="mx-auto grid max-w-[1500px] sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([icon, label, href], index) => (
          <li
            key={label}
            className={`${index ? "border-t border-current/15 sm:border-l sm:border-t-0" : ""}`}
          >
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[4.25rem] items-center gap-4 px-6 py-3 transition hover:bg-current/5"
              >
                <span className="grid size-9 shrink-0 place-items-center text-[#c78a14]">
                  {icon}
                </span>
                <span className="text-sm leading-5">{label}</span>
              </a>
            ) : (
              <div className="flex min-h-[4.25rem] items-center gap-4 px-6 py-3">
                <span className="grid size-9 shrink-0 place-items-center text-[#c78a14]">
                  {icon}
                </span>
                <span className="text-sm leading-5">{label}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoogleG({ luna }: { luna: boolean }) {
  return (
    <span
      aria-label="Google"
      role="img"
      className="relative block size-7 rounded-full bg-[conic-gradient(from_-35deg,#4285f4_0_25%,#34a853_25%_45%,#fbbc05_45%_65%,#ea4335_65%_82%,#4285f4_82%_100%)]"
    >
      <span
        className={`absolute inset-[5px] rounded-full ${luna ? "bg-[#050e12]" : "bg-[#f7f3ea]"}`}
      />
      <span className="absolute right-0 top-[11px] h-[5px] w-[13px] bg-[#4285f4]" />
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <>
      <h2 className="text-balance font-serif text-xl leading-[1.08] xl:text-2xl">{children}</h2>
      <div className="mt-2.5 h-px w-9 bg-[#c78a14]" />
    </>
  );
}

function Story() {
  return (
    <section>
      <SectionTitle>Por qué es extraordinario</SectionTitle>
      <p className="mt-4 text-[13px] leading-[1.48] opacity-80">
        Zazil Tunich es un cenote-museo que revela la profundidad del vínculo maya con el agua y el
        inframundo. Formaciones milenarias, luz que esculpe la piedra y relatos ancestrales se
        entretejen en una experiencia que inspira respeto y asombro.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        <MiniFact icon={<Sparkles />} text="Recorridos guiados por intérpretes locales" />
        <MiniFact icon={<UtensilsCrossed />} text="Cocina de la región con identidad maya" />
        <MiniFact icon={<Leaf />} text="Nado en cenote permitido" />
        <MiniFact icon={<Accessibility />} text="Información sobre accesibilidad" />
      </div>
    </section>
  );
}

function MiniFact({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-16 min-w-0 items-center gap-2 rounded-lg border border-current/15 bg-transparent p-2">
      <span className="shrink-0 text-[#c78a14] [&>svg]:size-5">{icon}</span>
      <span className="min-w-0 text-[10px] font-medium leading-[1.18]">{text}</span>
    </div>
  );
}

function FeaturedExperience({ luna }: { luna: boolean }) {
  return (
    <section id="experiencias">
      <SectionTitle>Experiencias destacadas</SectionTitle>
      <div
        className={`relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-[#c78a14]/50 ${luna ? "bg-black" : "bg-[#eee7d9] shadow-[0_10px_26px_rgba(28,54,42,0.08)]"}`}
      >
        <img
          src={HERO}
          alt="Ambiente subterráneo de Zazil Tunich"
          className={`size-full object-cover ${luna ? "" : "brightness-110 saturate-90"}`}
        />
        <div
          className={
            luna
              ? "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 text-white"
              : "absolute inset-x-0 bottom-0 border-t border-[#c78a14]/25 bg-[#f7f3ea]/95 p-4 text-[#0b3827] backdrop-blur-md"
          }
        >
          <h3 className="max-w-sm font-serif text-xl leading-[1.08] xl:text-2xl">
            Cena romántica subterránea
          </h3>
          <p
            className={`mt-1.5 max-w-sm text-xs leading-[1.4] ${luna ? "text-white/80" : "text-[#315c4b]"}`}
          >
            Una velada íntima en un entorno natural único, con sabores locales y atmósfera
            ancestral.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            <span
              className={
                luna
                  ? "rounded-full bg-white/15 px-2.5 py-1"
                  : "rounded-full border border-[#0b3827]/15 bg-white/55 px-2.5 py-1"
              }
            >
              Cena
            </span>
            <span
              className={
                luna
                  ? "rounded-full bg-white/15 px-2.5 py-1"
                  : "rounded-full border border-[#0b3827]/15 bg-white/55 px-2.5 py-1"
              }
            >
              Ambiente íntimo
            </span>
            <span
              className={
                luna
                  ? "rounded-full bg-white/15 px-2.5 py-1"
                  : "rounded-full border border-[#0b3827]/15 bg-white/55 px-2.5 py-1"
              }
            >
              Entorno natural
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisitInfo() {
  return (
    <section>
      <SectionTitle>Información para tu visita</SectionTitle>
      <div className="mt-2">
        <InfoRow icon={<Clock3 />} title="Duración">
          Consultar duración
        </InfoRow>
        <InfoRow icon={<Clock3 />} title="Horarios">
          Consultar horarios
        </InfoRow>
        <InfoRow icon={<Shirt />} title="Qué llevar">
          Traje de baño, toalla y calzado antiderrapante
        </InfoRow>
        <InfoRow icon={<Leaf />} title="Sustentabilidad">
          Respeta este espacio sagrado
        </InfoRow>
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5 border-b border-current/15 py-2.5">
      <span className="text-[#c78a14] [&>svg]:size-5">{icon}</span>
      <div>
        <strong className="block text-[13px] leading-4">{title}</strong>
        <span className="text-[11px] leading-4 opacity-70">{children}</span>
      </div>
    </div>
  );
}

function TerritorialContext() {
  return (
    <section>
      <SectionTitle>Contexto territorial</SectionTitle>
      <div className="mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-[#c78a14]/50 bg-[#143c2e]">
        <InteractiveMap
          lat={20.7167}
          lng={-88.25}
          zoom={12}
          markerTitle="Zazil Tunich"
          markers={[
            { lat: 20.7167, lng: -88.25, title: "Zazil Tunich" },
            { lat: 20.6896, lng: -88.2011, title: "Valladolid · punto de partida" },
          ]}
        />
      </div>
      <p className="mt-3 text-[13px] leading-[1.45] opacity-75">
        Ubicado en el Oriente Maya de Yucatán, donde la naturaleza, la historia y las tradiciones
        vivas invitan a explorar más.
      </p>
      <a
        href="https://www.google.com/maps/search/?api=1&query=Zazil+Tunich+Yucatan"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex text-xs font-medium text-[#c78a14]"
      >
        Abrir ubicación en Google Maps →
      </a>
    </section>
  );
}

function AluxBand() {
  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-14">
      <TourismAluxPanel
        compact
        title="Conecta Zazil Tunich con tu viaje"
        description="Alux combina esta experiencia con cenotes, zonas arqueológicas, gastronomía y pueblos del Oriente Maya según tus fechas y tu momento de viaje."
        task="Ayúdame a integrar Zazil Tunich en una ruta real por el Oriente Maya."
        prompts={["Viajo en pareja", "Quiero una propuesta humana"]}
      />
    </div>
  );
}
