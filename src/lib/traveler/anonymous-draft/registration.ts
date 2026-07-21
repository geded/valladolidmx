import { ANON_COPY } from "./copy";

export type AnonymousRegistrationReason =
  | "save_permanently"
  | "other_device"
  | "share"
  | "reminders"
  | "hard_limit";

export function anonymousRegistrationCopy(reason: AnonymousRegistrationReason) {
  const base = reason === "hard_limit" ? ANON_COPY.limitReached : ANON_COPY.registration;
  return {
    title: base.title,
    description: base.body,
    primaryCta: base.primary,
    dismissCta: base.secondary,
  };
}

export const ANONYMOUS_REGISTRATION_TRIGGERS: ReadonlyArray<AnonymousRegistrationReason> = [
  "save_permanently",
  "other_device",
  "share",
  "reminders",
  "hard_limit",
];
