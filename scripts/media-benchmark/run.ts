/**
 * H3·A4 · M0 · Benchmark runner (scaffold determinista).
 *
 * Este script SOLO se ejecuta manualmente y en local. No forma parte
 * del build ni de los starts. Genera un JSON con métricas por
 * (motor × formato × ancho × muestra) que se envía después con
 * `upload.ts` a la tabla `media_pipeline_benchmarks`.
 *
 * Requiere:
 *   - sharp instalado localmente (`bun add -D sharp`)
 *   - muestras en scripts/media-benchmark/samples/*
 *   - opcional: cuenta Cloudflare Images con CF_ACCOUNT_HASH
 */
import { readdir, readFile, mkdir, writeFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";

type Engine = "sharp" | "cloudflare";
type Format = "avif" | "webp" | "jpeg";

const WIDTHS = [400, 800, 1200, 1600, 2000];
const FORMATS: Format[] = ["avif", "webp", "jpeg"];
const QUALITY: Record<Format, number> = { avif: 50, webp: 75, jpeg: 80 };

async function loadSharp(): Promise<any | null> {
  try {
    // Import dinámico para no explotar cuando no está instalado.
    const mod = await import(/* @vite-ignore */ "sharp" as string);
    return (mod as { default: unknown }).default ?? mod;
  } catch {
    console.warn(
      "[benchmark] sharp no está instalado. Ejecuta `bun add -D sharp` para la comparativa local.",
    );
    return null;
  }
}

async function runSharp(sharp: any, buffer: Buffer, format: Format, width: number) {
  const t0 = performance.now();
  const pipeline = sharp(buffer).resize({ width, withoutEnlargement: true });
  const out = await (format === "avif"
    ? pipeline.avif({ quality: QUALITY.avif })
    : format === "webp"
      ? pipeline.webp({ quality: QUALITY.webp })
      : pipeline.jpeg({ quality: QUALITY.jpeg, mozjpeg: true })
  ).toBuffer({ resolveWithObject: true });
  const dt = performance.now() - t0;
  return { bytes: out.data.length, processing_ms: Math.round(dt) };
}

async function runCloudflare(url: string, format: Format, width: number) {
  const account = process.env.CF_ACCOUNT_HASH;
  if (!account) return { bytes: null, processing_ms: null, note: "CF_ACCOUNT_HASH ausente" };
  // Cloudflare Image Resizing por URL pública:
  const target = `https://${account}.cdn.cloudflare.com/cdn-cgi/image/width=${width},format=${format},quality=${QUALITY[format]}/${encodeURIComponent(url)}`;
  const t0 = performance.now();
  const res = await fetch(target);
  const buf = Buffer.from(await res.arrayBuffer());
  const dt = performance.now() - t0;
  return {
    bytes: buf.length,
    processing_ms: Math.round(dt),
    cache_status: res.headers.get("cf-cache-status") ?? undefined,
  };
}

async function main() {
  const runId = randomUUID();
  const samplesDir = join(process.cwd(), "scripts/media-benchmark/samples");
  const outDir = join(process.cwd(), "scripts/media-benchmark/out");
  await mkdir(outDir, { recursive: true });

  let files: string[] = [];
  try {
    files = (await readdir(samplesDir)).filter((f) =>
      [".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase()),
    );
  } catch {
    console.error(
      `[benchmark] No se encontró ${samplesDir}. Crea muestras según README.md`,
    );
    process.exit(2);
  }
  if (files.length < 5) {
    console.error(
      `[benchmark] Se requieren ≥5 muestras representativas. Encontradas: ${files.length}`,
    );
    process.exit(2);
  }

  const sharp = await loadSharp();
  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    const abs = join(samplesDir, file);
    const buf = await readFile(abs);
    const st = await stat(abs);
    const label = basename(file, extname(file));
    for (const format of FORMATS) {
      for (const width of WIDTHS) {
        // sharp
        if (sharp) {
          try {
            const r = await runSharp(sharp, buf, format, width);
            results.push({
              run_id: runId,
              sample_label: label,
              engine: "sharp" as Engine,
              format,
              target_width: width,
              quality: QUALITY[format],
              output_bytes: r.bytes,
              processing_ms: r.processing_ms,
              source_bytes: st.size,
            });
          } catch (err) {
            results.push({
              run_id: runId,
              sample_label: label,
              engine: "sharp",
              format,
              target_width: width,
              error: String(err),
            });
          }
        }
        // cloudflare (opcional)
        if (process.env.CF_BENCHMARK_URL_BASE) {
          const publicUrl = `${process.env.CF_BENCHMARK_URL_BASE}/${file}`;
          try {
            const r = await runCloudflare(publicUrl, format, width);
            results.push({
              run_id: runId,
              sample_label: label,
              engine: "cloudflare",
              format,
              target_width: width,
              quality: QUALITY[format],
              output_bytes: r.bytes,
              processing_ms: r.processing_ms,
              cache_status: (r as any).cache_status,
              source_bytes: st.size,
            });
          } catch (err) {
            results.push({
              run_id: runId,
              sample_label: label,
              engine: "cloudflare",
              format,
              target_width: width,
              error: String(err),
            });
          }
        }
      }
    }
  }

  const outPath = join(outDir, `${runId}.json`);
  await writeFile(outPath, JSON.stringify({ runId, results }, null, 2));
  console.log(`[benchmark] Escrito ${results.length} filas en ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
