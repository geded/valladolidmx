/**
 * PublicProfileBenefitsCard — Comunica al viajero por qué vale la pena
 * activar su perfil público y lo invita a la superficie de gestión.
 */
import { Link } from "@tanstack/react-router";
import { Globe2, Star, Users, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";

export interface PublicProfileBenefitsCardProps {
  isPublic: boolean;
  isComplete: boolean;
  done: number;
  total: number;
}

const BENEFITS: Array<{ icon: typeof Star; title: string; body: string }> = [
  {
    icon: Star,
    title: "Reseñas con tu nombre y foto",
    body: "Tus recomendaciones a hoteles, restaurantes y experiencias generan confianza a otros viajeros.",
  },
  {
    icon: Users,
    title: "Comunidad del Oriente Maya",
    body: "Otros viajeros pueden descubrirte, seguirte y aprender de tus rutas.",
  },
  {
    icon: Sparkles,
    title: "Alux te ayuda mejor",
    body: "Con tu perfil completo Alux personaliza rutas, hoteles y experiencias a tu medida.",
  },
  {
    icon: ShieldCheck,
    title: "Perfil verificado",
    body: "Accede a promociones y experiencias exclusivas reservadas a viajeros con perfil público.",
  },
];

export function PublicProfileBenefitsCard({
  isPublic,
  isComplete,
  done,
  total,
}: PublicProfileBenefitsCardProps) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Globe2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            Perfil público
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {isPublic
              ? "Tu perfil público está activo"
              : "Hazte parte visible del Oriente Maya"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPublic
              ? "Los demás viajeros pueden ver tus reseñas, tu país y tu estilo de viaje."
              : "Actívalo para dejar reseñas creíbles, aparecer en la comunidad y recibir mejores recomendaciones de Alux."}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <li
              key={b.title}
              className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background/60 p-3"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium">{b.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{b.body}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/cuenta/perfil-publico"
          className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {isPublic ? "Gestionar mi perfil público" : "Activar mi perfil público"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {!isComplete && (
          <span className="text-xs text-muted-foreground">
            Para publicarlo necesitas tu perfil al 100% ({done}/{total}).
          </span>
        )}
      </div>
    </section>
  );
}