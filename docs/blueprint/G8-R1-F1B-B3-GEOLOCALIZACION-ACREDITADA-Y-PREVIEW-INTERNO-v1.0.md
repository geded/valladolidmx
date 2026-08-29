# G8-R1-F1B-B3 · Geolocalización Acreditada y Preview Interno de Borradores v1.0

**Estado:** Approved · **Versión:** 1.0 · **Fecha:** 2026-08-29
**Dominio primario:** D04 · content-experience
**Autoridad:** Autorización Founder G8-R1-F1B-B3 (2026-08-29)
**Base:** cierre acreditado de `G8-R1-F1B-S1` (modelo de procedencia) y del lote editorial
`docs/governance/evidence/g8-r1-f1b-b2/EDITORIAL-REVIEW-REPORT-v1.0.md`

## 1. Propósito

Completar exclusivamente la geolocalización de las 15 fichas del lote B1/B2 y habilitar una vista
interna autenticada que renderice los borradores con la **misma superficie productiva**, sin crear
un renderizador paralelo y sin publicar nada.

## 2. Invariantes

1. **Una consulta deliberada por dirección.** Nada de autocomplete, typeahead ni geocodificación
   desde el navegador. Único proveedor: Nominatim/OpenStreetMap.
2. **Política de uso respetada.** User-Agent identificable con contacto técnico, rate limit
   ≥ 1 req/s, allowlist cerrada de direcciones acreditadas del lote.
3. **Caché idempotente.** El resultado crudo se persiste con URL, fecha, `osm_type`/`osm_id`,
   licencia ODbL y atribución; una segunda ejecución no vuelve a consultar.
4. **Validación humana obligatoria.** Se aceptan sólo resultados coherentes en estado, municipio,
   localidad y vialidad; discrepancia de calle = rechazo.
5. **Precisión declarada sin inflar.** `edificio` · `calle` · `localidad` · `municipio` ·
   `no_resoluble`. Sólo `edificio` o `calle` coherente pueden acreditarse.
6. **Prohibido aproximar al centro del destino.** Lo no acreditado queda
   `pending_manual_confirmation`.
7. **Procedencia campo por campo.** Toda coordenada escrita registra
   `entity_field_provenance` con `source_kind = open_geodata`, snapshot previo y auditoría con
   metadata de rollback.
8. **Preview interno fail-closed.** Ruta bajo `_authenticated`, rol editorial verificado en el
   servidor, `noindex, nofollow`, sólo lectura: no publica, no aprueba, no activa flags.
9. **Cero publicación.** Sin sitemap, redirects, medios, scraping de POIs, PR, merge ni despliegue.
   `omxds_visual_v1_contracts_enabled=false`.

## 3. Componentes

| Componente | Ruta | Rol |
| --- | --- | --- |
| Instrumento de geocodificación | `scripts/omxds/r1-f1b-b3/geocode-batch.mjs` | Consulta única, caché, evaluación territorial |
| Caché y evidencia | `docs/governance/evidence/g8-r1-f1b-b3/geocode-cache.json` | Resultado crudo, licencia, veredicto |
| Lectura de borrador | `src/lib/cms/business-draft-preview.functions.ts` | Server fn autenticada, rol editorial, sólo lectura |
| Vista interna | `src/routes/_authenticated/cms/empresas.$businessId.preview.tsx` | Reutiliza la superficie productiva de empresa |
| Contrato ejecutable | `scripts/omxds/r1-f1b-b3/geolocation-preview.contract.test.ts` | Gate `validate:r1:f1b:b3` |

## 4. Resultado del lote

- **Acreditadas (6):** El Sazón, Hotel Olbil, Le Muuch, Sikil, Sutuk, Valladolid Expeditions.
- **Pendientes de confirmación manual (9):** por vialidad no coincidente, municipio/localidad
  discrepante o domicilio no acreditado en fuente oficial.

## 5. Gates

`bun run validate:r1:f1b:b3` (18 escenarios de contrato) · `bun run lint` · `bun run typecheck` ·
`bun scripts/route-inventory-coverage.ts` · `bun run governance:check`.

## 6. Rollback

Las coordenadas escritas son reversibles con el snapshot previo registrado en
`content_audit_log`; el preview interno se retira eliminando la ruta y su entrada de inventario.
