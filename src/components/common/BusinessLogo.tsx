/**
 * `BusinessLogo` — Identidad visual de la empresa (render-only).
 *
 * Fuente única: `business_media` role `logo` → `businesses.logo_media_id`,
 * ya firmado por la lectura pública. Es OPCIONAL: sin logotipo acreditado
 * el componente no renderiza nada y la ficha conserva exactamente su
 * composición aprobada (jamás se inventa un placeholder de marca).
 */
import { cn } from "@/lib/utils";

export interface BusinessLogoProps {
  url: string | null | undefined;
  businessName: string;
  /** Diámetro del contenedor. `sm` para líneas de texto, `md` para cabeceras. */
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<BusinessLogoProps["size"]>, string> = {
  sm: "size-8",
  md: "size-12",
};

export function BusinessLogo({ url, businessName, size = "sm", className }: BusinessLogoProps) {
  if (!url) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card",
        SIZE_CLASS[size],
        className,
      )}
    >
      <img
        src={url}
        alt={`Logotipo de ${businessName}`}
        loading="lazy"
        className="size-full object-contain"
      />
    </span>
  );
}
