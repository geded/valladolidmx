import { useNavigate } from "@tanstack/react-router";
import { useProtectedAction } from "@/lib/protected-actions";
import { anonymousRegistrationCopy, type AnonymousRegistrationReason } from "./registration";

export function useProgressiveRegistration(reason: AnonymousRegistrationReason) {
  const navigate = useNavigate();
  return useProtectedAction<void, void>({
    kind: "anonymous_trip.persist",
    requirements: { authenticated: true },
    reason,
    gateCopy: anonymousRegistrationCopy(reason),
    action: async () => {
      await navigate({ to: "/cuenta/mi-viaje" });
    },
  });
}
