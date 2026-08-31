import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  Award,
  Clock3,
  Heart,
  Leaf,
  MapPin,
  Menu,
  Moon,
  Plus,
  Shirt,
  Sparkles,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { AluxMark } from "@/components/alux/AluxMark";

export const Route = createFileRoute("/lovable/founder-zazil-premium-preview")({
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

const HERO = "/media/preview-generated/zazil-tunich-hero-preview.webp";

function FounderZazilPremiumPreview() {
  const [theme, setTheme] = useState<"sol" | "luna">("sol");
  const luna = theme === "luna";

  return (
    <div
      data-founder-preview="zazil-sol-luna"
      data-theme={theme}
      className={luna ? "min-h-svh bg-[#050e12] text-[#eee9df]" : "min-h-svh bg-[#f7f3ea] text-[#0b3827]"}
    >
      <FounderHeader theme={theme} onTheme={setTheme} />

      <main>
        <section className="relative isolate min-h-[39rem] overflow-hidden border-b border-current/15 sm:min-h-[43rem] lg:min-h-[31rem]">
          <img src={HERO} alt="Caverna de piedra caliza con agua turquesa y sendero iluminado" className="absolute inset-0 -z-30 size-full object-cover" />
          <div className={luna ? "absolute inset-0 -z-20 bg-gradient-to-r from-[#050e12] via-[#050e12]/90 to-black/5" : "absolute inset-0 -z-20 bg-gradient-to-r from-[#f7f3ea] via-[#f7f3ea]/90 to-transparent"} />
          <div className="mx-auto grid min-h-[inherit] max-w-[1500px] items-center px-6 py-12 sm:px-10 lg:px-16">
            <div className="max-w-2xl">
              <h1 className="font-serif text-6xl leading-[0.92] sm:text-7xl">Zazil Tunich</h1>
              <p className="mt-3 font-serif text-2xl text-[#b97b00] sm:text-3xl">Cenote-Museo · Valladolid, Yucatán</p>
              <div className="mt-5 h-0.5 w-14 bg-[#c78a14]" />
              <h2 className="mt-5 font-serif text-3xl sm:text-4xl">Un viaje al Inframundo Maya</h2>
              <p className="mt-2 text-lg opacity-85">Naturaleza, memoria y cultura viva bajo la tierra.</p>
              <div className="mt-7 flex flex-wrap gap-4">
                <a href="#experiencias" className="inline-flex min-h-14 items-center gap-5 rounded-md bg-[#004d32] px-8 font-semibold uppercase tracking-wide text-white">Ver experiencias <span>→</span></a>
                <Link to="/arma-tu-viaje" className="inline-flex min-h-14 items-center gap-3 rounded-md border border-current px-7 font-medium uppercase tracking-wide">Agregar a Mi Viaje <Plus className="size-5" /></Link>
              </div>
            </div>
          </div>
          <Link to="/auth" className="absolute right-6 top-8 z-10 hidden min-h-12 items-center gap-3 rounded-full border border-white/60 bg-black/15 px-4 text-white backdrop-blur-sm lg:inline-flex xl:right-16" aria-label="Iniciar sesión para guardar Zazil Tunich"><span className="grid size-9 place-items-center rounded-full border border-white/70"><Heart className="size-5" /></span><span className="text-sm">Guardar</span></Link>
        </section>

        <ProofStrip luna={luna} />

        <div className="mx-auto grid max-w-[1500px] items-start gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[0.92fr_1.28fr_0.9fr_0.9fr] lg:px-16 xl:gap-10">
          <Story />
          <FeaturedExperience />
          <VisitInfo />
          <TerritorialContext />
        </div>

        <AluxBand />
      </main>
    </div>
  );
}

function FounderHeader({ theme, onTheme }: { theme: "sol" | "luna"; onTheme: (theme: "sol" | "luna") => void }) {
  const luna = theme === "luna";
  return (
    <header className={luna ? "border-b border-white/15 bg-[#050e12]" : "border-b border-[#0b3827]/15 bg-[#f7f3ea]"}>
      <div className="mx-auto flex min-h-24 max-w-[1500px] items-center justify-between gap-5 px-6 sm:px-10 lg:px-16">
        <Link to="/" className="shrink-0">
          <span className="block font-serif text-3xl leading-none">Valladolid<span className="text-[#b97b00]">.mx</span></span>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.28em] opacity-70">Oriente Maya de Yucatán</span>
        </Link>
        <nav className="hidden items-center gap-9 text-sm uppercase tracking-wide lg:flex" aria-label="Navegación principal">
          <Link to="/oriente-maya/valladolid">Valladolid</Link>
          <Link to="/oriente-maya">Oriente Maya</Link>
          <Link to="/experiencias">Experiencias</Link>
          <Link to="/que-hacer">Inspírate</Link>
          <Link to="/alux">Alux <span className="text-[#b97b00]">✦</span></Link>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-current/25 p-1" aria-label="Tema Sol o Luna">
            <button type="button" onClick={() => onTheme("sol")} aria-pressed={theme === "sol"} aria-label="Vista Sol" className={`grid size-9 place-items-center rounded-full ${theme === "sol" ? "bg-white text-[#0b3827] shadow" : "opacity-55"}`}><Sun className="size-5" /></button>
            <button type="button" onClick={() => onTheme("luna")} aria-pressed={theme === "luna"} aria-label="Vista Luna" className={`grid size-9 place-items-center rounded-full ${theme === "luna" ? "bg-[#253139] text-amber-300 shadow" : "opacity-55"}`}><Moon className="size-5" /></button>
          </div>
          <Link to="/arma-tu-viaje" className="hidden min-h-12 items-center rounded-full border border-[#b97b00] px-6 text-sm font-medium uppercase tracking-wide text-[#b97b00] sm:inline-flex">Arma tu viaje</Link>
          <button type="button" className="grid size-11 place-items-center rounded-full border border-current/25 lg:hidden" aria-label="Abrir menú"><Menu /></button>
        </div>
      </div>
    </header>
  );
}

function ProofStrip({ luna }: { luna: boolean }) {
  const facts = [
    [<Award key="award" />, "Premio Nacional a la Innovación Turística 2023", null],
    [<Sparkles key="sparkles" />, "Reconocimiento institucional · denominación por verificar", null],
    [<GoogleG key="google" luna={luna} />, "Calificación y reseñas · sincronización pendiente", "https://www.google.com/search?q=Zazil+Tunich"],
    [<MapPin key="pin" />, "A 6 km de Valladolid", "https://www.google.com/maps/search/?api=1&query=Zazil+Tunich+Yucatan"],
  ] as const;
  return <div className="border-b border-current/15"><ul className="mx-auto grid max-w-[1500px] sm:grid-cols-2 lg:grid-cols-4">{facts.map(([icon, label, href], index) => <li key={label} className={`${index ? "border-t border-current/15 sm:border-l sm:border-t-0" : ""}`}>{href ? <a href={href} target="_blank" rel="noreferrer" className="flex min-h-20 items-center gap-4 px-6 py-4 transition hover:bg-current/5"><span className="grid size-9 shrink-0 place-items-center text-[#c78a14]">{icon}</span><span className="text-sm leading-5">{label}</span></a> : <div className="flex min-h-20 items-center gap-4 px-6 py-4"><span className="grid size-9 shrink-0 place-items-center text-[#c78a14]">{icon}</span><span className="text-sm leading-5">{label}</span></div>}</li>)}</ul></div>;
}

function GoogleG({ luna }: { luna: boolean }) {
  return (
    <span aria-label="Google" role="img" className="relative block size-7 rounded-full bg-[conic-gradient(from_-35deg,#4285f4_0_25%,#34a853_25%_45%,#fbbc05_45%_65%,#ea4335_65%_82%,#4285f4_82%_100%)]">
      <span className={`absolute inset-[5px] rounded-full ${luna ? "bg-[#050e12]" : "bg-[#f7f3ea]"}`} />
      <span className="absolute right-0 top-[11px] h-[5px] w-[13px] bg-[#4285f4]" />
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <><h2 className="text-balance font-serif text-2xl leading-tight xl:text-3xl">{children}</h2><div className="mt-3 h-px w-10 bg-[#c78a14]" /></>;
}

function Story() {
  return <section><SectionTitle>Por qué es extraordinario</SectionTitle><p className="mt-5 text-sm leading-6 opacity-80">Zazil Tunich es un cenote-museo que revela la profundidad del vínculo maya con el agua y el inframundo. Formaciones milenarias, luz que esculpe la piedra y relatos ancestrales se entretejen en una experiencia que inspira respeto y asombro.</p><div className="mt-5 grid grid-cols-2 gap-2"><MiniFact icon={<Sparkles />} text="Recorridos guiados por intérpretes locales" /><MiniFact icon={<UtensilsCrossed />} text="Cocina de la región con identidad maya" /><MiniFact icon={<Leaf />} text="Nado en cenote permitido" /><MiniFact icon={<Accessibility />} text="Información sobre accesibilidad" /></div></section>;
}

function MiniFact({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex min-h-20 min-w-0 items-center gap-2 rounded-lg border border-current/15 bg-transparent p-2.5"><span className="shrink-0 text-[#c78a14] [&>svg]:size-5">{icon}</span><span className="min-w-0 text-[10px] font-medium leading-[1.25] xl:text-[11px]">{text}</span></div>;
}

function FeaturedExperience() {
  return <section id="experiencias"><SectionTitle>Experiencias destacadas</SectionTitle><div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-2xl border border-[#c78a14]/50"><img src={HERO} alt="Ambiente subterráneo de Zazil Tunich" className="size-full object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-5 text-white"><h3 className="max-w-sm font-serif text-2xl leading-tight xl:text-3xl">Cena romántica subterránea</h3><p className="mt-2 max-w-sm text-sm leading-5 text-white/80">Una velada íntima en un entorno natural único, con sabores locales y atmósfera ancestral.</p><div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-white/15 px-3 py-1">Cena</span><span className="rounded-full bg-white/15 px-3 py-1">Ambiente íntimo</span><span className="rounded-full bg-white/15 px-3 py-1">Entorno natural</span></div></div></div></section>;
}

function VisitInfo() {
  return <section><SectionTitle>Información para tu visita</SectionTitle><div className="mt-3"><InfoRow icon={<Clock3 />} title="Duración">Consultar duración</InfoRow><InfoRow icon={<Clock3 />} title="Horarios">Consultar horarios</InfoRow><InfoRow icon={<Shirt />} title="Qué llevar">Traje de baño, toalla y calzado antiderrapante</InfoRow><InfoRow icon={<Leaf />} title="Sustentabilidad">Respeta este espacio sagrado</InfoRow></div></section>;
}

function InfoRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="flex gap-3 border-b border-current/15 py-3"><span className="text-[#c78a14] [&>svg]:size-5">{icon}</span><div><strong className="block text-sm">{title}</strong><span className="text-xs opacity-70">{children}</span></div></div>;
}

function TerritorialContext() {
  return <section><SectionTitle>Contexto territorial</SectionTitle><a href="https://www.google.com/maps/search/?api=1&query=Zazil+Tunich+Yucatan" target="_blank" rel="noreferrer" className="mt-5 block rounded-2xl border border-[#c78a14]/50 bg-[#143c2e] p-5 text-white transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-xs uppercase tracking-[0.2em] text-white/75">Valladolid</p><div className="mt-4 border-l border-dashed border-amber-300 py-2 pl-5"><span className="rounded bg-black/35 px-2 py-1 text-xs">6 km</span><p className="mt-8 font-medium">Zazil Tunich</p><p className="text-xs text-white/70">Cenote-Museo</p></div></a><p className="mt-4 text-sm leading-6 opacity-75">Ubicado en el Oriente Maya de Yucatán, donde la naturaleza, la historia y las tradiciones vivas invitan a explorar más.</p></section>;
}

function AluxBand() {
  return <div className="mx-auto max-w-[980px] px-6 pb-14"><section className="flex flex-col items-center gap-5 rounded-3xl border border-[#c78a14]/60 px-7 py-5 sm:flex-row"><AluxMark family="full" size={104} decorative /><div className="flex-1"><h2 className="font-serif text-3xl text-[#b97b00]">Alux te ayuda a planear tu viaje</h2><p className="mt-1 text-sm opacity-75">Conecta esta experiencia con cenotes, zonas arqueológicas, haciendas y pueblos con encanto.</p></div><Link to="/alux" className="inline-flex min-h-12 items-center rounded-lg border border-current px-6 text-sm font-medium uppercase tracking-wide">Planear mi ruta con Alux</Link></section></div>;
}
