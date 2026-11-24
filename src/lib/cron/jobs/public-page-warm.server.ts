/**
 * Ronda del calentador: visita páginas públicas del propio sitio para que
 * su copia compartida esté lista antes de que llegue un viajero.
 * Sólo lee páginas públicas; no escribe datos ni toca cuentas.
 */
import type { CronJobResult, CronRunContext } from "@/lib/cron/cron-hook-auth.server";
import { sitemapPaths, warmPlan } from "@/lib/cache/page-warm";

const CONCURRENCY = 4;
const TIME_BUDGET_MS = 45_000;

export async function runPublicPageWarm(origin: string, ctx: CronRunContext): Promise<CronJobResult> {
  const t0 = Date.now();
  let all: string[] = [];
  try {
    const res = await fetch(`${origin}/sitemap.xml`);
    if (res.ok) all = sitemapPaths(await res.text());
  } catch {
    /* sin mapa: sólo principales */
  }
  const run = Math.floor(Date.now() / (10 * 60_000));
  const plan = warmPlan(all, run);
  if (ctx.dryRun) return { body: { ok: true, dryRun: true, planned: plan.length } };
  let ok = 0;
  let failed = 0;
  let i = 0;
  async function worker() {
    while (i < plan.length && Date.now() - t0 < TIME_BUDGET_MS) {
      const path = plan[i++]!;
      try {
        const r = await fetch(`${origin}${path}`, {
          headers: { "user-agent": "VmxPageWarm/1.0", accept: "text/html" },
        });
        await r.arrayBuffer();
        if (r.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { body: { ok: true, planned: plan.length, warmed: ok, failed, ms: Date.now() - t0 } };
}
