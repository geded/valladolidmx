/**
 * H3·A4 · M0 · Local benchmark runner (sharp only, executable in sandbox).
 *
 * Runs sharp locally over samples/*, produces AVIF/WebP/JPEG variants across
 * canonical widths, and captures bytes, processing_ms, PSNR and SSIM against
 * a losslessly-resized reference. Writes JSON under out/.
 *
 * Cloudflare Image Resizing is NOT executed here (no CF_ACCOUNT_HASH in the
 * sandbox and no Founder-approved billing account); its lane is projected in
 * the addendum from public pricing + measured payload sizes.
 */
import sharp from "sharp";
import { readdir, readFile, mkdir, stat, writeFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import ssimPkg from "ssim.js";

const ssim = ssimPkg.default ?? ssimPkg.ssim ?? ssimPkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(__dirname, "samples");
const OUT_DIR = join(__dirname, "out");

const WIDTHS = [400, 800, 1200, 1600, 2000];
const FORMATS = ["avif", "webp", "jpeg"];
const QUALITY = { avif: 50, webp: 75, jpeg: 80 };

async function computeMetrics(referencePngBuffer, candidateBuffer, width) {
  // Decode candidate to raw RGBA at same width, force alpha for parity.
  const [ref, cand] = await Promise.all([
    sharp(referencePngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(candidateBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (ref.info.width !== cand.info.width || ref.info.height !== cand.info.height) {
    return { psnr: null, ssim: null, note: "size mismatch" };
  }
  // PSNR on RGB only (skip alpha).
  let mse = 0;
  const len = ref.data.length;
  let counted = 0;
  for (let i = 0; i < len; i += 4) {
    for (let c = 0; c < 3; c++) {
      const d = ref.data[i + c] - cand.data[i + c];
      mse += d * d;
      counted++;
    }
  }
  mse /= counted;
  const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

  const refImg = { data: new Uint8ClampedArray(ref.data), width: ref.info.width, height: ref.info.height };
  const candImg = { data: new Uint8ClampedArray(cand.data), width: cand.info.width, height: cand.info.height };
  let ssimScore = null;
  try {
    const s = ssim(refImg, candImg, { downsample: false });
    ssimScore = s.mssim;
  } catch (err) {
    ssimScore = null;
  }
  return { psnr: Number.isFinite(psnr) ? +psnr.toFixed(2) : null, ssim: ssimScore == null ? null : +ssimScore.toFixed(4) };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const runId = randomUUID();
  const files = (await readdir(SAMPLES_DIR)).filter((f) =>
    [".jpg", ".jpeg", ".png"].includes(extname(f).toLowerCase()),
  );
  if (files.length < 5) {
    console.error("Not enough samples in", SAMPLES_DIR);
    process.exit(2);
  }
  const results = [];
  for (const file of files) {
    const abs = join(SAMPLES_DIR, file);
    const buf = await readFile(abs);
    const st = await stat(abs);
    const meta = await sharp(buf).metadata();
    const label = basename(file, extname(file));
    console.log(`\n== ${label} (${meta.width}x${meta.height}, ${meta.format}, ${st.size} B) ==`);

    for (const width of WIDTHS) {
      if (meta.width && meta.width < width) continue; // skip upscale
      // Reference: lossless PNG resized to the same width for fair metrics.
      const refPng = await sharp(buf)
        .resize({ width, withoutEnlargement: true })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toBuffer();

      for (const format of FORMATS) {
        const t0 = performance.now();
        let out;
        try {
          const pipeline = sharp(buf).resize({ width, withoutEnlargement: true });
          if (format === "avif") out = await pipeline.avif({ quality: QUALITY.avif, effort: 4 }).toBuffer();
          else if (format === "webp") out = await pipeline.webp({ quality: QUALITY.webp }).toBuffer();
          else out = await pipeline.jpeg({ quality: QUALITY.jpeg, mozjpeg: true }).toBuffer();
        } catch (err) {
          results.push({
            run_id: runId, sample: label, engine: "sharp", format, target_width: width,
            error: String(err?.message ?? err),
          });
          continue;
        }
        const dt = performance.now() - t0;
        const metrics = await computeMetrics(refPng, out, width).catch((e) => ({ psnr: null, ssim: null, note: String(e?.message ?? e) }));
        results.push({
          run_id: runId,
          sample: label,
          engine: "sharp",
          format,
          target_width: width,
          quality: QUALITY[format],
          source_bytes: st.size,
          source_width: meta.width,
          source_height: meta.height,
          source_mime: `image/${meta.format}`,
          output_bytes: out.length,
          processing_ms: +dt.toFixed(1),
          psnr: metrics.psnr,
          ssim: metrics.ssim,
          reduction_pct: st.size ? +(100 - (out.length * 100) / st.size).toFixed(1) : null,
        });
        console.log(`  ${format.padEnd(4)} @ ${String(width).padStart(4)}w  ${String(out.length).padStart(7)} B  ${dt.toFixed(0).padStart(4)} ms  PSNR=${metrics.psnr}  SSIM=${metrics.ssim}`);
      }
    }
  }
  const outPath = join(OUT_DIR, `${runId}.json`);
  await writeFile(outPath, JSON.stringify({ runId, generatedAt: new Date().toISOString(), engine: "sharp@local", results }, null, 2));
  console.log(`\nWrote ${results.length} rows → ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
