# H3·A4 · M1 · First-Vertical Derivation (sharp self-hosted)

Primera vertical productiva controlada del Media Pipeline. Ejecuta
`sharp` self-hosted **fuera del Worker** (política Founder: sharp no
corre en Cloudflare Workers) para derivar variantes AVIF/WebP/JPEG a
partir de originales inmutables en `media-original`, y las publica en
`media-derived` como assets versionados por engine.

## Reglas M1 (vinculantes)

1. **Original inmutable** — este script sólo LEE `media-original`.
2. **Derivación reproducible** — cada variante persiste
   `engine`, `engine_version`, `format`, `width`, `quality`,
   `source_checksum`, `content_hash`, `generated_at`.
3. **Idempotencia** — repetir la corrida sobre el mismo asset con el
   mismo original y misma configuración NO regenera ni sube binarios;
   marca las variantes como `skipped-idempotent` y no consume egress.
4. **Contrato público estable** — el feature flag
   `media_pipeline_enabled` sigue **OFF**. `resolveMediaSource()`
   continúa devolviendo la URL legacy.
5. **Fallback** — si alguna variante falla, se registra `status='failed'`
   con `error`, el asset queda como `pipeline_status='failed'` y el
   resolver sirve el original legacy. Sin ruptura visible.
6. **Activación controlada** — sólo procesa los asset IDs que declares
   explícitamente. No hay backfill.
7. **Observabilidad** — reporte JSON en `scripts/media-pipeline/out/`.

## Uso

```bash
# Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
node scripts/media-pipeline/derive.mjs --asset-id=<uuid>
node scripts/media-pipeline/derive.mjs --asset-id=<uuid1> --asset-id=<uuid2>
node scripts/media-pipeline/derive.mjs --file=scripts/media-pipeline/samples.txt

# Simulación (no sube, no escribe DB):
node scripts/media-pipeline/derive.mjs --asset-id=<uuid> --dry-run
```

## Matriz por contexto (adenda benchmark M0)

| usage_context | Formatos              | Anchos                  |
| ------------- | --------------------- | ----------------------- |
| hero          | avif, webp, jpeg      | 800, 1200, 1600, 2000   |
| card          | avif, webp, jpeg      | 400, 800, 1200          |
| gallery       | avif, webp, jpeg      | 800, 1200, 1600         |
| thumbnail     | avif, webp, jpeg      | 200, 400                |
| og            | jpeg                  | 1200                    |
| editorial     | avif, webp, jpeg      | 800, 1200, 1600         |
| logo / icon   | webp, png             | 200/400/800 · 64/128/256|

## Rollback

No hay superficies públicas afectadas. Para revertir cualquier corrida:

```sql
-- Regresar el asset al carril legacy:
UPDATE public.media_assets
   SET pipeline_status = 'disabled',
       pipeline_engine = NULL,
       pipeline_last_error = NULL,
       pipeline_processed_at = NULL
 WHERE id = '<uuid>';

-- (Opcional) purgar variantes derivadas de un asset:
DELETE FROM public.media_asset_variants WHERE asset_id = '<uuid>';
```

Los binarios en `media-derived` pueden borrarse por Storage sin afectar
el contrato público (son URLs internas, no canónicas).
