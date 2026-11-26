import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const prepareAluxSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionKey: z.string().max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { assertPlatformOrigin } = await import("@/lib/security/public-quota.server");
    assertPlatformOrigin();
    const { prepareOwnedAluxSession, aluxRequestUserId } = await import("./session-ownership.server");
    return { sessionKey: await prepareOwnedAluxSession(data.sessionKey, await aluxRequestUserId()) };
  });