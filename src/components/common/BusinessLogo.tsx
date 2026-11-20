/**
 * `BusinessLogo` — Identidad visual de la empresa (render-only).
 *
 * Fuente única: `business_media` role `logo` → `businesses.logo_media_id`,
 * ya firmado por la lectura pública. Es OPCIONAL: sin logotipo acreditado
 * el componente no renderiza nada y la ficha conserva exactamente su
 * composición aprobada (jamás se inventa un placeholder de marca).
 */
import { cn } from "@/lib/utils";
import { resolveMediaSource, type MediaAssetInput } from "@/lib/media/resolve-source";

export interface BusinessLogoProps {
  url: string | null | undefined;
  asset?: MediaAssetInput | null;
  businessName: string;
  /** Diámetro del contenedor. `sm` para líneas, `md` para operador y `lg` para cabeceras. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<BusinessLogoProps["size"]>, string> = {
  sm: "size-8",
  md: "size-12",
  lg: "size-16 sm:size-20",
};

export function BusinessLogo({ url, asset, businessName, size = "sm", className }: BusinessLogoProps) {
  if (!url) return null;
  const resolved = resolveMediaSource(asset, { fallbackUrl: url, context: "logo", sizes: size === "lg" ? "80px" : size === "md" ? "48px" : "32px" });
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card",
        SIZE_CLASS[size],
        className,
      )}
    >
      <picture className="contents">
      {resolved.sources.map((source) => <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />)}
      <img
        src={resolved.src}
        alt={`Logotipo de ${businessName}`}
        loading="lazy"
        className="size-full object-contain"
      />
      </picture>
    </span>
  );
}
