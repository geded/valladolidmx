import { AlertTriangle, Globe, Share2 } from "lucide-react";

type SeoConfig = {
  title?: string;
  description?: string;
  og_image?: string;
  canonical?: string;
  noindex?: boolean;
};

type Props = {
  config: SeoConfig;
  slug: string;
  siteName?: string;
  siteHost?: string;
};

const TITLE_IDEAL: [number, number] = [40, 60];
const DESC_IDEAL: [number, number] = [120, 160];

function counterTone(len: number, [min, max]: [number, number]): { label: string; cls: string } {
  if (len === 0) return { label: "vacío", cls: "text-muted-foreground" };
  if (len < min) return { label: "corto", cls: "text-amber-600" };
  if (len > max) return { label: "largo", cls: "text-red-600" };
  return { label: "ideal", cls: "text-emerald-600" };
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

export function SeoPreview({ config, slug, siteName = "Valladolid MX", siteHost = "valladolidmx.lovable.app" }: Props) {
  const title = (config.title || "").trim();
  const description = stripHtml(config.description || "");
  const image = (config.og_image || "").trim();
  const canonical = (config.canonical || "").trim() || `/${slug === "home" ? "" : slug}`;
  const noindex = Boolean(config.noindex);

  const titleTone = counterTone(title.length, TITLE_IDEAL);
  const descTone = counterTone(description.length, DESC_IDEAL);

  const displayTitle = title || `${siteName} — página`;
  const displayDesc = description || "Añade una descripción para mejorar la vista en Google y redes.";
  const displayUrl = `https://${siteHost}${canonical.startsWith("/") ? canonical : `/${canonical}`}`;

  return (
    <div className="space-y-3">
      {noindex ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <strong className="font-semibold">Página oculta a buscadores.</strong> Los motores no la indexarán mientras "noindex" esté activo.
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md border border-border bg-background p-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Título</span>
            <span className={`font-mono ${titleTone.cls}`}>{title.length}/60 · {titleTone.label}</span>
          </div>
        </div>
        <div className="rounded-md border border-border bg-background p-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Descripción</span>
            <span className={`font-mono ${descTone.cls}`}>{description.length}/160 · {descTone.label}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Globe className="size-3" aria-hidden /> Vista previa en Google
        </div>
        <div className="text-[11px] text-emerald-700 truncate">{displayUrl}</div>
        <div className="mt-0.5 line-clamp-1 text-sm font-medium text-[#1a0dab]">{displayTitle}</div>
        <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{displayDesc}</div>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Share2 className="size-3" aria-hidden /> Vista previa social (Open Graph)
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-32 w-full object-cover" />
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-muted text-[11px] text-muted-foreground">
              Sin imagen · se usará la primera imagen de la página
            </div>
          )}
          <div className="border-t border-border bg-card px-2 py-1.5">
            <div className="truncate text-[10px] uppercase text-muted-foreground">{siteHost}</div>
            <div className="line-clamp-1 text-xs font-semibold">{displayTitle}</div>
            <div className="line-clamp-2 text-[11px] text-muted-foreground">{displayDesc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}