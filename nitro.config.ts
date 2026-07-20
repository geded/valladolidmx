import { defineConfig } from "nitro";

export default defineConfig({
  // Pin the latest compatibility date validated by R4. Leaving this as
  // "latest" can generate a future UTC date for deployments built west of UTC.
  compatibilityDate: "2026-07-20",
});
