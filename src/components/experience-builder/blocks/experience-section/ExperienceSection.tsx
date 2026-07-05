/**
 * H-03 · Ola I1.c — `vmx.experience.section` (Capa 1: Presentación).
 */
import { cn } from "@/lib/utils";
import type { ExperienceSectionDTO } from "@/lib/experience-builder/blocks/experience-section/contract";

const TONE: Record<string, string> = {
  default: "bg-transparent",
  muted: "bg-muted/40",
  accent: "bg-primary/5",
};

export interface ExperienceSectionProps {
  dto: ExperienceSectionDTO;
  className?: string;
}

export function ExperienceSection({ dto, className }: ExperienceSectionProps) {
  const { variant, eyebrow, title, lead, body, media, attribution, ctas, align, tone, ariaLabel, capabilities } = dto;

  const alignCls = align === "center" ? "text-center items-center mx-auto" : "text-left items-start";
  const Heading = capabilities.seoHeading ? "h2" : "p";

  const textBlock = (
    <div className={cn("flex max-w-3xl flex-col gap-4", alignCls)}>
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</span>
      ) : null}
      {title ? (
        <Heading className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</Heading>
      ) : null}
      {lead ? <p className="text-lg text-muted-foreground">{lead}</p> : null}
      {body ? (
        capabilities.richText ? (
          <div className="prose prose-neutral max-w-none text-base" dangerouslySetInnerHTML={{ __html: body }} />
        ) : (
          <p className="text-base leading-relaxed text-foreground/90">{body}</p>
        )
      ) : null}
      {variant === "quote" && attribution ? (
        <cite className="mt-2 text-sm text-muted-foreground">— {attribution}</cite>
      ) : null}
      {ctas.length > 0 ? (
        <div className={cn("mt-2 flex flex-wrap gap-3", align === "center" && "justify-center")}>
          {ctas.map((c, i) => (
            <a
              key={i}
              href={c.href}
              className={cn(
                "inline-flex min-h-11 items-center rounded-pill px-5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-focus",
                c.emphasis === "primary" && "bg-primary text-primary-foreground hover:opacity-95",
                c.emphasis === "secondary" && "border border-primary text-primary hover:bg-primary/10",
                c.emphasis === "ghost" && "text-primary hover:bg-primary/10",
                c.emphasis === "link" && "px-0 text-primary underline underline-offset-4 hover:no-underline",
              )}
            >
              {c.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section
      aria-label={ariaLabel ?? undefined}
      data-eb-block="experience-section"
      data-eb-anchor={capabilities.anchor ? title ?? undefined : undefined}
      className={cn("w-full py-10 sm:py-14", TONE[tone], className)}
    >
      {variant === "split" && media ? (
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 md:grid-cols-2">
          {textBlock}
          <img src={media.url} alt={media.alt} className="w-full rounded-2xl object-cover shadow-soft" loading="lazy" />
        </div>
      ) : (
        <div className="mx-auto max-w-6xl px-4">
          {textBlock}
          {media && variant !== "quote" ? (
            <img
              src={media.url}
              alt={media.alt}
              loading="lazy"
              className="mt-8 w-full rounded-2xl object-cover shadow-soft"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}