/**
 * SmartCard — tarjeta genérica reutilizada por los renderers de Smart
 * Blocks (15.10.8.3). Visualmente alineada con las cards del Cards
 * Registry (rounded, aspect 4/3, border sutil) sin acoplarse a sus
 * tipos estrictos. Es presentational-only.
 */
import { ArrowUpRight } from "lucide-react";

export interface SmartCardProps {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  href?: string | null;
  badge?: string | null;
  aspect?: "4/3" | "16/9" | "1/1";
  /** Slot opcional para acciones auxiliares (p.ej. "+ Mi Viaje"). */
  actions?: React.ReactNode;
}

export function SmartCard({
  title,
  subtitle,
  description,
  imageUrl,
  href,
  badge,
  aspect = "4/3",
  actions,
}: SmartCardProps) {
  const Wrapper: any = href ? "a" : "div";
  const wrapperProps = href ? { href, className: "group block" } : { className: "block" };
  const aspectClass =
    aspect === "16/9" ? "aspect-video" : aspect === "1/1" ? "aspect-square" : "aspect-[4/3]";

  return (
    <Wrapper {...wrapperProps}>
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition group-hover:-translate-y-0.5 group-hover:shadow-md">
        <div className={`${aspectClass} w-full overflow-hidden bg-muted`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          {subtitle ? (
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{subtitle}</p>
          ) : null}
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          {description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {badge ? (
            <span className="mt-2 inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {badge}
            </span>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            {href ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Ver más <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span />
            )}
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        </div>
      </article>
    </Wrapper>
  );
}

export function SmartGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function SmartEmpty({ message }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {message ?? "Sin resultados por ahora."}
    </div>
  );
}