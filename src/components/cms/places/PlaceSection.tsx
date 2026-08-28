/**
 * G8-Q2B · Primitivas de formulario del CMS de Lugares.
 *
 * Agrupan el editor por secciones (identidad, ubicación, contenido, visita,
 * contacto, medios y relaciones) en lugar de una sola columna interminable.
 * Sólo presentación: cero autoridad, cero validación efectiva (server-side).
 */
import type { ReactNode } from "react";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function PlaceSection({ id, title, description, children, actions }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-prose text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {actions}
      </header>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

interface FieldProps {
  name: string;
  label: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  wide?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function PlaceField({ name, label, help, error, required, wide, children }: FieldProps) {
  const id = `place-field-${name}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-xs font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">
        {children({ id, describedBy, invalid: Boolean(error) })}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}
      {help && (
        <p id={helpId} className="mt-1 text-[11px] text-muted-foreground">
          {help}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const textareaClass =
  "min-h-[96px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-background px-4 text-xs font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-wider text-primary-foreground outline-none hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
