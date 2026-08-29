# G8-R1-F1B-S1 · Modelo de Procedencia y Reclamación de Fichas Públicas v1.0

**Estado:** Approved · **Versión:** 1.0 · **Fecha:** 2026-08-29
**Dominio primario:** D04 · content-experience
**Autoridad:** Autorización Founder G8-R1-F1B-S1 (2026-08-29)
**Base:** HEAD acreditado de G8-R1-F1A ·
`docs/governance/evidence/g8-r1-f1b-public-sources/PUBLIC-SOURCES-INSTRUMENT-AND-BATCH-PLAN-v1.0.md`

## 1. Propósito

Definir el modelo aditivo mínimo que permitirá, en una fase posterior y bajo autorización expresa,
crear fichas preliminares desde fuentes públicas verificables con procedencia campo por campo,
revisión editorial, caducidad de datos volátiles y snapshot inmutable previo a la reclamación.

Esta etapa entrega **sólo el modelo**. No captura lote, no crea empresas, no publica, no importa
medios, no cambia estados turísticos, flags, sitemap ni redirects.

## 2. Invariantes

1. **Autoridad**: el estado de reclamación es siempre derivado de `business_users` y
   `business_ownership_transfers`; nunca se almacena ni se duplica.
2. **Procedencia append-only**: una fila de procedencia jamás se reescribe; se supersede.
3. **Snapshot inmutable**: los snapshots previos a reclamación no admiten UPDATE ni DELETE.
4. **Fail-closed público**: sin aprobación editorial, ruta canónica, destino, coordenadas y fuente
   vigente, una ficha no puede ser pública.
5. **Autoridad SEO única**: `seo_metadata.noindex`; no se crean columnas robots paralelas.
6. **Cero backfill**: ninguna fila histórica cambia de significado.
7. **Sin importador masivo** en esta fase.

## 3. Componentes

- `public.entity_field_provenance` (nueva, append-only).
- `public.business_claim_snapshots` (nueva, inmutable).
- Columnas aditivas en `public.businesses` y `public.business_hours`.
- `public.resolve_business_claim_state()` · `public.business_public_source_summary()` ·
  `public.create_business_claim_snapshot()`.
- `src/lib/provenance/provenance-contracts.ts` (capa pura) y
  `src/lib/provenance/provenance.functions.ts` (server functions autenticadas).

## 4. Gates

`bun run validate:r1:f1b:s1` = `test:r1:f1b:s1` (31 escenarios) · `lint` · `typecheck` · `test:q2a` ·
`test:q2b` · `test:r1:a` · `route-inventory-coverage` · `governance:check`.

## 5. Evidencia

- `docs/governance/evidence/g8-r1-f1b-s1/COMPLETION-REPORT-v1.0.md`
- `docs/governance/evidence/g8-r1-f1b-s1/MIGRATION-UP-DOWN-v1.0.sql`
- `docs/governance/evidence/g8-r1-f1b-s1/JUNK-RECORD-HOTEL-AUDIT-v1.0.md`

## 6. STOP CONDITION

El modelo queda cerrado. No se inicia la captura del lote ni R1-F1B de datos.
Flag `omxds_visual_v1_contracts_enabled=false`. Cero PR, merge o despliegue.
