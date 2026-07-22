# Baseline V0 · Adjudicación Integral Controlada (Opción A) — 2026-07-22

**Estado:** Approved · Registro de auditoría documental
**Autoridad:** Founder Decision 2026-07-22 · Governance Reconciliation · Opción A
**Alcance:** adjudicación de los 11 documentos `18.06`–`18.16` del Baseline V0 (Checkpoints 1–6) al Master Index (`06`), Dependency Map (`07`) y Knowledge Graph (`08`).
**Restricciones:** no modifica contenido sustantivo de los documentos, no reabre los 119 hallazgos congelados, no crea `bootstrap_exceptions`, no altera ADRs ni la taxonomía canónica de 14 dominios.

## 1. Marco normativo aplicado

1. `docs/decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md` — 14 dominios primarios mutuamente exclusivos; un solo dominio por documento; sin dominio `misc` / `other` / `pending`.
2. Reglas 2 y 3 del ADR: los reportes, auditorías y evidencia heredan el dominio de la capacidad que gobiernan o demuestran; los transversales se asignan al dominio accountable por la decisión.
3. Precedentes canónicos en `06` verificados uno a uno antes de la asignación (sin proximidad temática automática).

## 2. Tabla de adjudicación

| Documento | Naturaleza | Dominio primario | Precedente / evidencia canónica |
|---|---|---|---|
| `18.06-OMXDS-VISUAL-ROUTE-INVENTORY-AUDIT-v1.0.md` | Census del árbol `src/routes/` | `D02 · platform-foundation` | Política DOS Route Inventory (`SSC-01·P2`, memoria vigente); el propio documento declara accountability `platform-foundations`. |
| `18.07-OMXDS-VISUAL-SURFACE-INVENTORY-AUDIT-v1.0.md` | Auditoría de superficies del Discovery Layer (15.10.5d) | `D05 · destination-discovery` | Serie `15.10.5d.*` y `PUBLIC-SURFACES-MIGRATION` → D05. |
| `18.08-OMXDS-VISUAL-MEDIA-INVENTORY-v1.0.md` | Inventario de activos multimedia | `D13 · media-delivery` | `18.H3-A2-STORAGE-MEDIA-AUDIT` y serie `18.H3-A3/A4` → D13. |
| `18.09-OMXDS-VISUAL-MAP-AUDIT-v1.0.md` | Auditoría de mapas, pines y coordenadas | `D05 · destination-discovery` | Regla `Geolocation Mandatory` (D05) y `15.11-NAVIGATION-BLUEPRINT` (D05). |
| `18.10-OMXDS-VISUAL-SEO-BASELINE-v1.0.md` | Baseline SEO | `D14 · growth-reliability` | `18.H0-PERFORMANCE-SEO-BASELINE` y `18.H1-SEO-METADATA-SWEEP` → D14. |
| `18.11-OMXDS-VISUAL-RESPONSIVE-BASELINE-v1.0.md` | Baseline responsive + jerarquía visual | `D14 · growth-reliability` | `12C.2-Responsive-Mobile-First-Performance-Final-Acceptance` → D14; QA de experiencia. |
| `18.12-OMXDS-VISUAL-PERFORMANCE-BASELINE-v1.0.md` | Baseline de performance en laboratorio | `D14 · growth-reliability` | `18.H0` y `12D-COMPLIANCE-REPORT` → D14. |
| `18.13-OMXDS-VISUAL-ACCESSIBILITY-BASELINE-v1.0.md` | Baseline diagnóstico de accesibilidad | `D14 · growth-reliability` | QA de experiencia y readiness pertenecen a D14 por definición del ADR. |
| `18.14-OMXDS-VISUAL-PREMIUM-CASE-ZAZIL-TUNICH-v1.0.md` | Piloto vertical de composición de superficie empresa premium | `D04 · content-experience` | `15.10.H-03-EPICA-1-I2d-BUSINESS-SURFACE-FINAL-CLOSURE` → D04. No es onboarding/operación de proveedor (D07); es composición y branding de superficie. |
| `18.15-OMXDS-VISUAL-CROSS-CUTTING-FINDINGS-MATRIX-v1.0.md` | Matriz consolidada de hallazgos CP1–CP5 | `D01 · product-governance` | Instrumento de gobernanza documental (agregación de decisiones). |
| `18.16-OMXDS-VISUAL-V0-BASELINE-READINESS-GATE-v1.0.md` | Gate documental de cierre CP6 | `D01 · product-governance` | Decisión de gobernanza sobre el ciclo V0. |

Suma delta por dominio: `D01=+2`, `D02=+1`, `D04=+1`, `D05=+2`, `D13=+1`, `D14=+4`. Total incorporado: **11**.

## 3. Reconciliación técnica aplicada

| Artefacto | Antes | Después |
|---|---:|---:|
| `06-BLUEPRINT-MASTER-INDEX.md` — filas adjudicadas | 459 | 470 |
| `07-BLUEPRINT-DEPENDENCY-MAP.json` — nodos DOC | 447 | 470 |
| `07-BLUEPRINT-DEPENDENCY-MAP.json` — nodos totales | 993 | 1016 |
| `08-KNOWLEDGE-GRAPH.json` — DOC accountable | 447 | 470 |
| `08-KNOWLEDGE-GRAPH.json` — aristas `governed_by` | 447 | 470 |
| `GOVERNANCE-ARTIFACT-INVENTORY.json` — gaps residuales | 61 (ejecución previa) | 38 (baseline preservado) |
| Validador `validate-dependency-map.mjs` | expected `447 / v0.8` | expected `470 / v0.10` |

La reconciliación incorporó, además, los 12 documentos RV0.1/RV0.2 (`19.01`–`19.12`) que ya estaban adjudicados en `06 v0.9` pero faltaban en `07`/`08`, cerrando su brecha operativa sin re-adjudicar contenido.

## 4. Resultado de validadores (Bun)

| Validador | Resultado | Métricas |
|---|---|---|
| `bun scripts/governance/validate-dependency-map.mjs` | **PASS** | 470 filas · 1016 nodos · 1119 aristas · 4 cadenas críticas. |
| `bun scripts/governance/validate-knowledge-graph.mjs` | **PASS** | 56 conceptos · 14 dominios · 1089 nodos · 1659 aristas · 470 documentos accountable. |
| `bun scripts/governance/validate-governance-integrity.mjs` | **PASS** | 1582 artefactos · 946 covered_exact · 598 covered_inherited · 38 gaps grandfathered · 97.6% cobertura · 0 errores. |

## 5. Restricciones observadas

- Sin cambios en `src/`, UI, DB, rutas, configuración de producto.
- Contenido sustantivo de `18.06`–`18.16` y `19.01`–`19.12` no modificado.
- 119 hallazgos Baseline V0 y `GAP-TZ-01` intactos.
- Sin `bootstrap_exceptions` nuevas; sin relajación de validadores; sin ocultación de gaps.
- Migraciones inmutables no tocadas.

## 6. Trazabilidad

- Autorización: Founder Decision 2026-07-22 · Governance Reconciliation · Opción A.
- Master Index actualizado: `docs/governance/06-BLUEPRINT-MASTER-INDEX.md` v0.10.
- Dependency Map actualizado: `docs/governance/07-BLUEPRINT-DEPENDENCY-MAP.md` v0.8 · `docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json`.
- Knowledge Graph actualizado: `docs/governance/08-KNOWLEDGE-GRAPH.md` v0.8 · `docs/governance/generated/08-KNOWLEDGE-GRAPH.json`.
- Inventario regenerado por generador oficial: `docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json`.
- Runtime oficial: Bun v1.3.3.