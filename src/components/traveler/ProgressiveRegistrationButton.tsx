import type { ReactNode } from "react";
import type { AnonymousRegistrationReason } from "@/lib/traveler/anonymous-draft/registration";
import { useProgressiveRegistration } from "@/lib/traveler/anonymous-draft/use-progressive-registration";

export function ProgressiveRegistrationButton({
  reason,
  children,
  className,
  onBeforeRun,
}: {
  reason: AnonymousRegistrationReason;
  children: ReactNode;
  className?: string;
  onBeforeRun?: () => void;
}) {
  const action = useProgressiveRegistration(reason);
  return (
    <button
      type="button"
      disabled={action.pending}
      onClick={() => {
        onBeforeRun?.();
        action.run();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
