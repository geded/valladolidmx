---
name: Founder Transparent Derivation Principle
description: Las variantes derivadas son responsabilidad exclusiva del Media Pipeline y sus resolvers. Consumidores nunca construyen URLs, formatos, tamaños ni paths.
type: constraint
---
**Founder Transparent Derivation Principle** (H3·A4, vinculante)

- Toda variante (AVIF/WebP/JPEG × anchos) es responsabilidad exclusiva del Media Pipeline (`media-derived`) y sus resolvers oficiales.
- Los consumidores (componentes, bloques, plantillas, superficies públicas) **jamás** construyen manualmente URLs, formatos, anchos, paths o `srcSet` de variantes.
- Fuente única de verdad de rendering: `resolveMediaSource()` (y `resolveMediaAlt()` para textos).
- Un guard de build bloquea la construcción manual de URLs bajo `media-derived/*`.

**Why:** aislar consumidores de la evolución del pipeline (motor, formatos, anchos, CDN) sin refactor masivo.
**How to apply:** cualquier `<img>` / `<picture>` público debe recibir el objeto resuelto por `resolveMediaSource(assetId, context)` — nunca strings hardcodeados.
