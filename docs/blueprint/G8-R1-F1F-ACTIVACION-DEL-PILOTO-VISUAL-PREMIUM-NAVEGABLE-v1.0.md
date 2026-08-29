# G8-R1-F1F · Activación del Piloto Visual Premium Navegable — v1.0

- Autoridad: Autorización Founder G8-R1-F1F (2026-08-29)
- Antecedente: `docs/governance/audit/2026-08-29-G8-R1-F1E-0-CMS-OPERATING-SYSTEM-AUDIT-v1.0.md` (bloqueos P2 y P3)
- PCA: `docs/governance/addenda/PCA-2026-029-ADDENDUM-AC.json`
- Flag: `omxds_visual_v1_contracts_enabled` — estado al cierre: **false (OFF)**
- Veredicto: **NO-GO para activación global · PARCIAL declarada**

## 1 · Objetivo

Desplegar los contratos de plantillas premium (A), activar de forma controlada
el flag visual (B) y permitir el render premium de entidades ya publicadas (C),
sin publicar entidades nuevas ni alterar estados editoriales (D no autorizado).

## 2 · Autoridad de presentación (P2)

Precedencia única y documentada, sin contenido paralelo:

1. `entity_presentation_modes` (fila explícita, RLS + RPC gobernadas).
2. Si no existe fila: **Editorial implícito determinista**.
3. Cinematográfica exige fila aprobada **y** portada G8-M1 elegible verificada
   en tiempo real; la pérdida de portada degrada a Editorial de inmediato.

Editorial implícito y Editorial explícito renderizan idénticamente: ambos
resuelven el mismo `effective_mode` en `get_entity_presentation_mode`, cuyo
fallback por defecto es `editorial / not_requested / cover_eligible=false`.
No se ejecuta ningún INSERT masivo: `entity_presentation_modes` permanece en
0 filas y sólo se materializa ante selección, solicitud, aprobación, rechazo,
cambio de modo o auditoría.

## 3 · Falta de fotografía (P3)

Sin portada acreditada: modo Editorial, marcador neutral piedra/caliza, icono
de familia cuando exista, leyenda discreta "Sin fotografía acreditada", cero
foto ajena, cero Unsplash, cero fixture, cero galería vacía, Cinematográfica
no disponible. La ausencia de foto deja de bloquear la navegación y no
sustituye identidad, procedencia, clasificación, ruta canónica, SEO mínimo,
seguridad, aprobación editorial ni datos fundamentales.

## 4 · Inventario de contenido publicado (bloqueante)

| Familia | Publicadas | Reales acreditadas | Demo seed |
| --- | --- | --- | --- |
| Destino | 7 | 1 (`valladolid`) | 6 (`izamal`, `espita`, `ek-balam`, `uayma`, `rio-lagartos`, `las-coloradas`) |
| Empresa | 26 | 3 | 23 |
| Producto | 9 | 0 | 9 |
| Evento | 10 | 0 | 10 |
| Lugar | 5 | 0 | 5 |
| Zona / Artículo | 0 | 0 | 0 |

Las 3 empresas reales publicadas (`cocina-del-frailes`,
`hacienda-san-servacio-boutique`, `ruta-cenotes-y-selva`) tienen portada; su
`source_review_state` es `unreviewed`. El lote real B1–B4 (20 fichas) sigue en
`draft` y no se publica en esta fase.

## 5 · Cobertura real del flag

Rutas que consultan `omxds_visual_v1_contracts_enabled` (5, no 4):

- `src/routes/oriente-maya/$destino.index.tsx`
- `src/routes/oriente-maya/$destino.$categoria.$empresa.index.tsx`
- `src/routes/oriente-maya/$destino.$categoria.$empresa.$producto.tsx`
- `src/routes/producto.$slug.tsx`
- `src/routes/eventos.$slug.tsx`

En todas el flag entra como `enabled={surfaceContractsEnabled || premiumEnabled}`
del `SurfaceContractBoundary`: es un **override global** del camino por ficha,
ya fail-closed por elegibilidad. Home, portada de Oriente Maya, la sección
"Explorar destinos" y los seis listados **no consultan el flag** porque ya
renderizan siempre las superficies premium aprobadas (composición EB publicada,
`RegionSurface`, `TourismListingSurface` / `ListingPremiumSurfaceFromDTO`).
Encenderlo no cambiaría esas superficies: su cobertura premium es permanente,
no condicionada. Esto se documenta explícitamente en lugar de ampliar el
significado del flag de forma silenciosa.

## 6 · Decisión

Se cumplen dos STOP CONDITIONS de la propia autorización:

1. **El inventario publicado incluye datos demo en el piloto**: 53 de 57
   entidades publicadas son `is_demo_seed = true`, incluidas Izamal y Espita,
   exigidas por la cobertura visual obligatoria.
2. **Activación PARCIAL por construcción**: el flag sólo alcanza 5 superficies;
   el resto ya es premium permanente, por lo que la comparación OFF/ON no puede
   acreditar cambio real de hero/tarjetas/jerarquía en ellas.

Por tanto: código y contratos desplegados (A), **flag mantenido en OFF** (B no
ejecutado), render premium por ficha vigente vía elegibilidad acreditada (C
parcial), cero publicaciones nuevas (D respetado).

## 7 · Ruta mínima para el GO

1. Autorización de limpieza: despublicar o marcar el corpus demo publicado.
2. Publicación autorizada del lote real B4 con portada G8-M1.
3. Reejecutar F1F: inventario sin demo → smoke OFF → canary staff → flag ON →
   smoke ON → comparación OFF/ON → rollback OFF probado.

## 8 · Rollback

`update platform_settings set value = 'false' where key =
'omxds_visual_v1_contracts_enabled'` — un solo registro, idempotente, sin
migración. Verificado por lectura directa el 2026-08-29: el flag nunca salió
de `false` durante esta fase, por lo que no fue necesario ejercerlo.

## 9 · Gates

lint PASS · typecheck PASS · Route Inventory PASS · `validate:r1:f1c:a` PASS
(46 + 20 + 38 contratos) · `validate:g8:m1` PASS · governance:check PASS
(sync + integridad + PCA) · smoke público OFF PASS (10 rutas, HTTP 200, 1 H1).
