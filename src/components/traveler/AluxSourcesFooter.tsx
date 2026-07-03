/**
 * AluxSourcesFooter — Iniciativa 7 · Sub-ola H.
 *
 * Renderiza las fuentes que Alux utilizó para producir una sugerencia.
 * Cada fuente proviene de `catalog_refs` del contexto oficial
 * (traveler_alux_context_for_user). Nunca inventa datos.
 */
import { BookMarked } from "lucide-react";
import type { AluxTravelerSource } from "@/lib/traveler/alux-traveler.functions";

export interface AluxSourcesFooterProps {
  sources: AluxTravelerSource[];
}

export function AluxSourcesFooter({ sources }: AluxSourcesFooterProps) {
  if (!sources || sources.length === 0) {
    return (
      <p className="text-[11px] italic text-muted-foreground">
        Sin referencias del catálogo utilizadas.
      </p>
    );
  }
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookMarked className="size-3" aria-hidden /> Fuentes utilizadas
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((s, i) => (
          <li
            key={`${s.kind}:${s.target_id ?? i}`}
            className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px]"
            title={`${s.kind}${s.slug ? ` · ${s.slug}` : ""}`}
          >
            <span className="text-muted-foreground">{s.kind}</span>
            {s.title ? <span className="ml-1">· {s.title}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}