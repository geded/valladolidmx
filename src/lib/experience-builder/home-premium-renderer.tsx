/**
 * Focused public renderer for the canonical Home Premium composition.
 *
 * The Experience Builder keeps using the universal CompositionRenderer.
 * The public `/` route already narrows its snapshot to a single
 * `vmx.home.premium-g4` node, so importing every other surface renderer there
 * only increases the initial route graph. This adapter preserves the exact
 * Home authority, CMS config, i18n, appearance and editor overlay while
 * keeping unrelated page families out of the Home chunk.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { CSSProperties, ReactNode } from "react";
import { HomePremiumSurface } from "@/components/home-premium/HomePremiumSurface";
import {
  HOME_PREMIUM_G4_BLOCK_TYPE,
  resolveHomePremiumG4,
} from "@/components/home-premium/home-premium-config";
import {
  mergeHomeRealContent,
  resolveHomeSectionVisibility,
} from "@/components/home-premium/home-premium-real";
import { useTranslation } from "@/i18n/context";
import { resolveHomePremiumRealContent } from "./smart-blocks.functions";
import { applyI18nToNode } from "./i18n-overlay";
import { appearanceToStyle, hasAppearance, readAppearance } from "./appearance";
import { buildScopedTypographyCss, type FieldTypography } from "./typography";
import type { CompositionNode, CompositionTree } from "./composition-tree";

export interface HomePremiumRendererProps {
  tree: CompositionTree;
  wrap?: (node: CompositionNode, content: ReactNode) => ReactNode;
}

export function HomePremiumRenderer({ tree, wrap }: HomePremiumRendererProps): ReactNode {
  const node = tree.root.children[0];
  if (!node || node.type !== HOME_PREMIUM_G4_BLOCK_TYPE || node.hidden) return null;
  return <HomePremiumNode node={node} wrap={wrap} />;
}

function HomePremiumNode({
  node,
  wrap,
}: {
  node: CompositionNode;
  wrap?: HomePremiumRendererProps["wrap"];
}): ReactNode {
  const { locale, defaultLocale } = useTranslation();
  const localized = locale !== defaultLocale ? applyI18nToNode(node, locale) : node;
  const resolved = resolveHomePremiumG4(localized.config);
  const resolveReal = useServerFn(resolveHomePremiumRealContent);
  const { data } = useQuery({
    queryKey: ["home-premium-real-content"],
    queryFn: () => resolveReal(),
    staleTime: 60_000,
  });

  const content = mergeHomeRealContent(resolved.content, data);
  const sections = resolveHomeSectionVisibility(content, resolved.sections);
  const surface = (
    <HomePremiumSurface
      content={content}
      heroVariant={resolved.heroVariant}
      layout={resolved.layout}
      sections={sections}
      order={resolved.order}
    />
  );

  const appearance = readAppearance(localized.config);
  const typography = localized.config.__typography as Record<string, FieldTypography> | undefined;
  const scopedCss = typography
    ? buildScopedTypographyCss(localized.id, localized.type, typography)
    : "";
  const rawHidden = localized.config.__hidden_on;
  const hiddenOn = Array.isArray(rawHidden)
    ? rawHidden.filter(
        (value): value is "mobile" | "tablet" | "desktop" =>
          value === "mobile" || value === "tablet" || value === "desktop",
      )
    : [];
  const needsStyleWrapper = hasAppearance(appearance) || Boolean(scopedCss) || hiddenOn.length > 0;
  const styled = needsStyleWrapper ? (
    <div
      style={
        {
          ...(hasAppearance(appearance) ? appearanceToStyle(appearance) : {}),
          ...(scopedCss ? { containerType: "inline-size" } : {}),
        } as CSSProperties
      }
      data-eb-typo={scopedCss ? localized.id : undefined}
      data-hidden-on={hiddenOn.length > 0 ? hiddenOn.join(" ") : undefined}
    >
      {scopedCss ? <style dangerouslySetInnerHTML={{ __html: scopedCss }} /> : null}
      {surface}
    </div>
  ) : (
    surface
  );

  return wrap ? wrap(node, styled) : styled;
}
