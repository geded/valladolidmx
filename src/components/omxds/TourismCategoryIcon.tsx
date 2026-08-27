/**
 * OMXDS G6-S1-B · Founder-approved embroidered category artwork.
 *
 * Single renderer for the 22 immutable tourism category symbols. Canonical
 * artwork is served from /brand/category-icons/*.png. Labels remain HTML in
 * the consuming navigation component. Unknown slugs fail closed.
 */
import { resolveCategoryIcon, type CategoryIconVariant } from "@/lib/omxds/category-icon-registry";

export interface TourismCategoryIconProps {
  slug: string;
  variant?: CategoryIconVariant;
  size?: number;
  spaceCredited?: boolean;
  scheme?: "light" | "dark";
  monochrome?: boolean;
  className?: string;
}

function clampSize(variant: CategoryIconVariant, size: number | undefined, credited: boolean) {
  const fallback = variant === "compact" ? 36 : 44;
  const value = size ?? fallback;
  const max = credited ? 56 : variant === "compact" ? 40 : 48;
  const min = variant === "compact" ? 32 : 40;
  return Math.min(Math.max(value, min), max);
}

export function TourismCategoryIcon({
  slug,
  variant = "standard",
  size,
  spaceCredited = false,
  scheme = "light",
  monochrome = false,
  className,
}: TourismCategoryIconProps) {
  const entry = resolveCategoryIcon(slug);
  if (!entry) return null;

  const px = clampSize(variant, size, spaceCredited);
  const filter = monochrome ? "grayscale(1) contrast(1.2)" : undefined;

  return (
    <svg
      viewBox="0 0 256 256"
      width={px}
      height={px}
      aria-hidden="true"
      focusable="false"
      data-omxds-category-icon={entry.slug}
      data-variant={variant}
      data-omxds-icon-size={px}
      data-omxds-icon-scheme={monochrome ? "monochrome" : scheme}
      data-omxds-icon-textile="approved-embroidered-artwork-v1"
      className={className}
    >
      <image
        href={`/brand/category-icons/${entry.slug}.png`}
        x="0"
        y="0"
        width="256"
        height="256"
        preserveAspectRatio="xMidYMid meet"
        style={{ filter }}
      />
    </svg>
  );
}
