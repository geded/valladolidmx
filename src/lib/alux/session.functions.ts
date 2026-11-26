import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const prepareAluxSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionKey: z.string().max(128), embedded: z.boolean().optional() }).parse(input))
  .handler(async ({ data }) => {
    const { assertPlatformOrigin } = await import("@/lib/security/public-quota.server");
    assertPlatformOrigin();
    const { prepareOwnedAluxSession, aluxRequestUserId } = await import("./session-ownership.server");
    const prepared = await prepareOwnedAluxSession(data.sessionKey, await aluxRequestUserId());
    // Only the embedded frame (third-party cookies blocked) receives the proof.
    return { sessionKey: prepared.key, proof: data.embedded ? prepared.proof : null };
  });