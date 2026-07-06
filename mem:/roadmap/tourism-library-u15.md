---
name: U1.5 Tourism Library Hardening — cerrada
description: Cierre oficial de la Tourism Component Library como infraestructura estable. Guardarraíl `tourism-guard.ts`, unificación `vmx.product.hero`→`vmx.experience.hero` vía adapter `ExperienceHeroFromProduct`, matriz oficial de familias.
type: feature
---
U1.5 · Tourism Component Library Hardening está cerrada (2026-07-06).

Resultado vinculante:
- La Tourism Component Library es infraestructura estable del producto. Futuras evoluciones se hacen por composición (`variant`/`capabilities`/`extensions[]`/`config`) sobre las familias oficiales `vmx.experience.*`.
- `vmx.product.hero` es shim legacy: delega en `vmx.experience.hero` vía `src/components/experience-builder/blocks/experience-hero/ExperienceHeroFromProduct.tsx`. Prohibido reintroducir un Hero paralelo de producto.
- Guardarraíl automático: `bun scripts/tourism-guard.ts` bloquea sufijos `-pro/-v2/-next/-lite` en `vmx.experience.*` y cualquier `vmx.<dominio>.hero` fuera del allowlist (`vmx.experience.hero`, `vmx.product.hero` legacy, `vmx.kit.hero` primitive neutro).
- Dependencia técnica registrada: delegación completa del Home Hero (`src/components/home/Hero.tsx`) requiere edición inline del Studio CMS sobre contratos oficiales; se abordará en una iniciativa específica de evolución del Studio. No bloquea U1.5.
- Reporte: `docs/blueprint/15.10.H-03-U1.5-TOURISM-LIBRARY-HARDENING-v1.0.md`.