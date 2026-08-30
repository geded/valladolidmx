import type { ReactNode } from "react";
import type { BadgeVM, CrumbVM, MediaVM } from "@/components/surfaces/kit/types";
import type { PremiumPresentation } from "@/lib/omxds/presentation/presentation";

export type PremiumActionVM = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
};

export type PremiumHeroVM = {
  presentation: PremiumPresentation;
  crumbs?: CrumbVM[];
  eyebrow?: string;
  title: string;
  description?: string;
  media?: MediaVM | null;
  badges?: BadgeVM[];
  primaryAction?: PremiumActionVM;
  secondaryAction?: PremiumActionVM;
};

export type PremiumSectionVM = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
};

export type PremiumCardVM = {
  id: string;
  title: string;
  href?: string;
  eyebrow?: string;
  description?: string;
  media?: MediaVM | null;
  badges?: BadgeVM[];
};
