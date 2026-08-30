# G8-R1 · FASE 0 · Inventario Probatorio Read-Only

**Estado:** READ-ONLY completado · cero escrituras de producto · cero SQL · cero publicación
**HEAD:** `80b9127d5cbe57da69699d29f3ee7673e8d9dc4e` · árbol `52dda389ae4fd5fcadb2469271938c048748d336`
**Gate previo:** `validate:q2d:b` → **PASS** (20/20 casos + evidencia estática completa)
**Ancestros acreditados:** `22f78833` (G8-Q2D-0) y `85c012b7` (G8-Q2D-A) presentes en el historial de HEAD.

---

## 1 · Estándar de paridad (autoridad de referencia)

`premium-entity-place` (G8-Q2D-A/B) define los **siete criterios** de nivel productivo:

| # | Criterio | Instrumento en `premium-entity-place` |
|---|---|---|
| P1 | Datos reales del CMS | `place-public-reads.server.ts` + `place-public-reads.functions.ts` |
| P2 | Contrato/DTO público versionado | `place-public-contract.ts` |
| P3 | Medios gobernados, sin invención | portada aprobada del propio lugar → marcador neutral |
| P4 | Edición administrativa | `/cms/lugares` + `PlaceEditor.tsx` |
| P5 | Presentación persistible | `PlacePresentationPanel.tsx` + RPC `admin_set_place_presentation_mode` |
| P6 | Ruta fail-closed + preview autenticada | `/oriente-maya/$destino/lugares/$slug` (404 público en borrador) |
| P7 | SEO preparado sin publicar | breadcrumb territorial, canónico, JSON-LD, **sin** sitemap ni redirects |

---

## 2 · Universo real de plantillas premium en HEAD

### 2.a · Presets de composición (`premium-template-registry.ts`, v1.0.0)

| Familia | Presets | Autoridad de render | Contenido actual |
|---|---|---|---|
| `home` | 1 (`premium-g4-approved`) | `HomePremiumSurface` | Fixture determinista `home-premium-content.ts` |
| `destination` | 1 (`destino-premium-g4-approved`) | `DestinationPremiumSurface` | Fixture `destination-premium-content.ts` |
| `listing` | 6 (hoteles, restaurantes, experiencias, eventos, casas-de-vacaciones, que-hacer) | `ListingPremiumSurface` → `TourismListingSurface` | Fixture `listing-premium-content.ts` |
| `place` | 6 variantes cerradas | `PlacePremiumSurface` | **Datos reales CMS** |

**Total: 14 presets de composición.**

### 2.b · Presets de ficha por entidad (`entity-premium-templates.ts`, v1.0.0)

| Preset | Estado | `autoAssign` |
|---|---|---|
| `premium-entity-hotel` | aprobada | `true` |
| `premium-entity-restaurant` | aprobada | `true` |
| `premium-entity-event` | aprobada | `true` |
| `premium-entity-experience` | aprobada | `true` |
| `premium-entity-tour` | aprobada | `true` |
| `premium-entity-vacation-rental` | **pendiente_aceptacion_founder** | `false` |

**Total: 6 presets de entidad.** Consumidos hoy **sólo** por `PremiumPresetGallery.tsx`; ningún route público los resuelve.

**Universo total auditado: 20 plantillas premium.**

---

## 3 · Matriz de paridad frente a `premium-entity-place`

Leyenda: ✅ cumple · ◐ parcial · ✘ ausente

| Familia | P1 Datos | P2 Contrato | P3 Medios | P4 CMS | P5 Presentación | P6 Fail-closed | P7 SEO | Nivel |
|---|---|---|---|---|---|---|---|---|
| **place** (6 variantes) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **Referencia** |
| **home** | ✘ fixture | ✘ | ◐ gobernados fijos | ◐ Studio | ✘ | ✘ | ◐ | Brecha alta |
| **destination** | ✘ fixture | ✘ | ◐ gobernados fijos | ◐ Studio | ✘ | ✘ | ◐ | Brecha alta |
| **listing** (6) | ◐ *doble vía* | ✘ | ◐ | ◐ Studio | ✘ | ✘ | ✅ rutas legacy | Brecha media |
| **entity** (6) | ✘ no resuelto | ◐ schema declarado | ✘ | ✘ | ✘ | ✘ | ◐ | Brecha alta |

### Hallazgo crítico H-R1-01 · Doble vía en listados

Las seis rutas públicas de listado (`/hoteles`, `/restaurantes`, `/experiencias`, `/eventos`, `/casas-de-vacaciones`, `/que-hacer`) **ya consumen datos reales** (`listMarketplaceBusinesses`, `listPublishedEvents`, `listPublishedDestinations`) renderizando `TourismListingSurface` directamente. El preset premium G5 (`ListingPremiumSurface` + fixture) **no está conectado a ninguna ruta pública**: sólo vive en la preview interna `/lovable/g5-listing-readiness-preview` y en el canvas de Studio.

Consecuencia: existen dos representaciones del mismo listado. No es una regresión — es exactamente la brecha que G8-R1 debe cerrar — pero **prohíbe** cualquier atajo que publique el fixture: la paridad se alcanza haciendo que el preset consuma la lectura real, nunca al revés.

### Hallazgo H-R1-02 · Presets de entidad huérfanos

`entity-premium-templates.ts` declara rutas canónicas, adaptadores y componentes productivos, pero **ninguna ruta de entidad** (`$destino.$categoria.$empresa`, `producto.$slug`, `eventos.$slug`) invoca el resolutor. Las superficies vigentes siguen siendo `BusinessSurface`, `ProductSurface`, `EventSurface`.

### Hallazgo H-R1-03 · Presentación persistible inexistente fuera de Lugares

`src/components/cms/` no contiene ningún panel de presentación salvo `places/PlacePresentationPanel.tsx`. Home, Destino, Listados y Entidades no tienen forma administrativa de fijar modo Editorial/Cinematográfico.

### Hallazgo H-R1-04 · `premium-entity-vacation-rental` bloqueado

Único preset con `status: pendiente_aceptacion_founder` y `autoAssign: false`. **No puede** entrar en ninguna ola de paridad sin aprobación visual Founder previa (misma regla aplicada en Q2D-0).

---

## 4 · Estado de no publicación (ratificado)

- Cero rutas públicas nuevas respecto a Q2D-B.
- `sitemap[.]xml.ts` sin fichas de lugar (verificado por instrumento).
- Cero redirects registrados para lugares.
- Manifiesto Q2D-B declara `omxds_visual_v1_contracts_enabled = false`.
- Chichén Itzá y Ek' Balam permanecen en `draft`.

---

## 5 · Manifiesto de olas propuesto (requiere autorización Founder)

Orden por riesgo creciente y por dependencia real, no por preferencia estética:

| Ola | Alcance | Familias | Precondición |
|---|---|---|---|
| **R1-A** | Contratos públicos y lecturas reales (P1+P2) sin tocar render | listing (6) | ninguna |
| **R1-B** | Conexión productiva del preset de listado a las 6 rutas, sustituyendo el fixture por fallback fail-closed | listing (6) | R1-A |
| **R1-C** | Resolutor de entidad activo en rutas canónicas + medios gobernados | entity (5 con `autoAssign: true`) | R1-B |
| **R1-D** | Panel de presentación persistible reutilizable (generalización de `PlacePresentationPanel`) | todas | R1-C |
| **R1-E** | Home y Destino: contenido real del CMS con fixture como fallback | home, destination | R1-D |
| **R1-F** | QA 390/768/1440, gate `validate:r1`, evidencia y cierre | todas | R1-E |

`premium-entity-vacation-rental` queda **fuera del manifiesto** hasta aprobación visual explícita.

---

## 6 · STOP CONDITION

Fase 0 concluida sin modificar producto. **No se inicia R1-A** hasta que el Founder:

1. apruebe (o corrija) el manifiesto de olas de §5;
2. confirme el tratamiento de H-R1-01 (el preset consume la lectura real, el fixture queda como fallback);
3. ratifique la exclusión de `premium-entity-vacation-rental`.

Al recibir la autorización se emitirán, antes de cualquier código: Blueprint `19.45-G8-R1-PREMIUM-TEMPLATES-PARITY-v1.0.md`, instrumento `PCA-2026-049.json` y actualización del Master Index.
