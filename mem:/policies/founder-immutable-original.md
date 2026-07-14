---
name: Founder Immutable Original Principle
description: El original de todo asset multimedia es inmutable; nunca se sobrescribe ni recomprime. Nueva versión = nuevo asset con nuevo ID.
type: constraint
---
**Founder Immutable Original Principle** (H3·A4, vinculante)

- El binario original en `media-original` es **inmutable**. Prohibido sobrescribir, recomprimir o sustituir físicamente.
- Una nueva versión de contenido **debe** crear un nuevo `media_asset` con nuevo `id` y nueva ruta; el asset anterior queda auditado.
- Buckets de originales sin UPDATE/DELETE para roles operativos; sólo `service_role` bajo procedimiento de retirada auditada.
- El pipeline de derivación (`media-derived`) sí es reproducible y regenerable; los originales no.

**Why:** trazabilidad, auditoría, reversibilidad y estabilidad del contrato público.
**How to apply:** en uploads, versionado editorial o "reemplazo" en CMS, generar siempre nuevo asset y actualizar la referencia lógica; nunca mutar el binario.
