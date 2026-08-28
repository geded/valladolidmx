# G8-Q2D-A · Evidence Manifest · Plantilla reusable `premium-entity-place`

**Blueprint:** `docs/blueprint/19.43-G8-Q2D-A-PREMIUM-ENTITY-PLACE-TEMPLATE-v1.0.md`
**Instrumento:** `docs/governance/product-authorizations/PCA-2026-047.json`
**Fecha:** 2026-08-28
**Base:** cierre de G8-Q2D-0 (Blueprint 19.42, `PCA-2026-046`)

## 1. Alcance entregado

| Elemento | Ruta |
| --- | --- |
| Contrato de plantilla | `src/components/place-premium/place-premium-config.ts` |
| Autoridad visual (congelada) | `src/components/place-premium/PlacePremiumSurface.tsx` |
| `pageKind=place` | `src/lib/experience-builder/page-kind-registry.ts` |
| Presets (6 variantes) | `src/lib/experience-builder/premium-template-registry.ts` |
| Render único | `src/lib/experience-builder/composition-renderer.tsx` |
| Política editorial | `src/lib/experience-builder/editorial-builder-policy.ts` |
| Gate | `bun run validate:q2d:a` |

Migración aplicada: `ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'place'`
(aditiva, idempotente, sin tablas, sin datos, sin RLS afectada).

## 2. Variantes cerradas y direcciones por defecto

| Variante | Dirección por defecto |
| --- | --- |
| `zona-arqueologica` | Cinematográfica |
| `cenote` | Cinematográfica |
| `area-natural` | Cinematográfica |
| `museo` | Editorial |
| `templo-convento` | Editorial |
| `mercado-artesanal` | Editorial |

Variante desconocida → fail-closed a Editorial, nunca preset genérico.

## 3. Regla fail-closed de medios

- `cinematic` sin portada gobernada aprobada → Editorial + aviso del
  constructor: "El modo cinematográfico requiere una portada aprobada; se
  muestra Editorial temporalmente."
- La portada no aprobada nunca se renderiza: `hero.cover.url` queda en `null`
  y la ficha usa el marcador neutral aprobado.
- Al aprobar después la portada, el modo Cinematográfico se activa sin
  reconstruir la ficha.

## 4. Selector persistible

`presentation_mode` (`editorial` | `cinematic`) se guarda en la configuración
del bloque `vmx.place.premium-q2d`. El selector local de la vista interna de
aprobación permanece sin persistencia.

## 5. Confirmaciones

- Cero rutas públicas, cero redirects, cero sitemap.
- Sin cambios en "Qué hacer" ni despublicación de destinos históricos.
- `omxds_visual_v1_contracts_enabled` permanece `false`.
- Tipografía, paleta y ambas estructuras visuales quedan congeladas.
- Chichén Itzá y Ek' Balam permanecen en `draft`.

## 6. Gates (2026-08-28)

| Gate | Resultado |
| --- | --- |
| `bun run typecheck` | PASS |
| `bun run lint` | PASS |
| `bun run build` | PASS |
| `bun run validate:q2d:0` | PASS |
| `bun run validate:q2d:a` | PASS |
| `bun run scripts/route-inventory-coverage.ts` | PASS |
| `bun run governance:check` | PASS |
| `bun run governance:product-check` | PASS |
| `bun run governance:product-test` | PASS |
| `bun scripts/governance/sync-governance.mjs --check` | PASS |
