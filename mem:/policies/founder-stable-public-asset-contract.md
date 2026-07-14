---
name: Founder Stable Public Asset Contract
description: Las URLs públicas ya expuestas o indexadas son contratos estables; no se rompen sin análisis, estrategia de compatibilidad, 301, validación SEO y rollback documentado.
type: constraint
---
**Founder Stable Public Asset Contract** (H3·A4, vinculante)

- Toda URL pública de asset ya expuesta o indexada es un **contrato estable**.
- Prohibido romperla o eliminarla sin: (1) análisis de referencias, (2) estrategia explícita de compatibilidad, (3) redirect 301 permanente cuando aplique, (4) validación SEO, (5) rollback documentado.
- Las URLs **internas** de variantes derivadas (`media-derived/…`) **no** son contratos públicos: pueden evolucionar libremente y no deben filtrarse como canónicas de contenido.
- El canónico público de un asset es su URL `resolveMediaSource().canonical` (o la URL legacy preservada).

**Why:** proteger SEO, integraciones externas, capturas indexadas y confianza del ecosistema.
**How to apply:** antes de cualquier cambio de path/host/bucket de originales, ejecutar análisis de referencias + plan 301. Nunca exponer URLs de `media-derived` como canónicas.
