# H3·A4 · M0 · Media Pipeline Benchmark Harness

Compara **Cloudflare Image Resizing** vs **sharp self-hosted** sobre un
conjunto representativo de imágenes reales, sin tocar producción.

## Muestras obligatorias (Founder requirement)

Colocar en `scripts/media-benchmark/samples/` (git-ignored):

1. `hero-horizontal.jpg` — hero de alta resolución (≥3000px)
2. `portrait.jpg`         — fotografía vertical
3. `card.jpg`             — tarjeta de empresa (~1200px)
4. `gallery.jpg`          — imagen de galería típica
5. `thumbnail.jpg`        — pequeña (<400px)
6. `transparent.png`      — con canal alfa (opcional)

## Ejecución

```bash
# 1. Instalar sharp localmente (solo entorno de benchmark)
bun add -D sharp

# 2. Configurar env de Cloudflare (para el ejercicio remoto)
export CF_ACCOUNT_HASH=...        # cuenta de imágenes Cloudflare
export CF_IMAGES_TOKEN=...        # opcional para métricas privadas

# 3. Ejecutar comparativa
bun run scripts/media-benchmark/run.ts

# 4. Cargar resultados a `media_pipeline_benchmarks`
bun run scripts/media-benchmark/upload.ts <run.json>
```

## Métricas capturadas por (motor × formato × ancho × muestra)

- `output_bytes`
- `processing_ms`     (worker local o edge)
- `delivery_ms`       (TTFB percibido, sólo cache miss)
- `psnr` / `ssim`     (calidad reconstruida vs original)
- `cache_status`      (`MISS`, `HIT`, `EXPIRED`)
- `visual_notes`      (revisión humana en texto, obligatoria para hero/portrait)

## Reglas

- No sobrescribir originales bajo ningún motivo.
- Los resultados se persisten en `public.media_pipeline_benchmarks`
  y no en Storage productivo.
- Ningún job se dispara automáticamente; toda ejecución es explícita.
