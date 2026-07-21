import type { ReactNode } from "react";
import type { AnonymousRegistrationReason } from "@/lib/traveler/anonymous-draft/registration";
import { useProgressiveRegistration } from "@/lib/traveler/anonymous-draft/use-progressive-registration";

export function ProgressiveRegistrationButton({
  reason,
  children,
  className,
}: {
  reason: AnonymousRegistrationReason;
  children: ReactNode;
  className?: string;
}) {
  const action = useProgressiveRegistration(reason);
  return (
    <button
      type="button"
      disabled={action.pending}
      onClick={() => action.run()}
      className={className}
    >
      {children}
    </button>
  );
}
