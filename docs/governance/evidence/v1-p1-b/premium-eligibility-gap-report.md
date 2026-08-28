# V1-P1.b · Reporte de Brecha de Elegibilidad Premium

**Fecha:** 2026-08-22 · **Modo:** evidencia documental (READ-ONLY sobre datos)
**Blueprints:** 19.17 (propuesta) · 19.18 (especificación canónica)
**Base:** commit `e93bce064cb76e19efe9d6feeaa2d73ec702a794`
**FLAG:** OFF · **PRODUCCIÓN:** NO TOCADA

---

## 1. Resumen ejecutivo

Con la especificación canónica de 19.18 aplicada bajo su barrera fail-closed,
**ninguna vertical comercial (hotel, restaurante, experiencia/tour) es hoy elegible**
para plantilla premium publicada. La causa es exclusivamente de gobernanza de assets:
no existe imagen real gobernada (derechos + ALT humano + dimensiones) para esas verticales.

Destino es la única vertical con cobertura visual, pero su material es **DEMO**, por lo que
también resulta inelegible para publicación premium bajo §7 de 19.18.

Resultado: la plantilla premium queda **especificada y vigente**, con habilitación diferida.
No se crea ningún bypass, placeholder ni excepción.

---

## 2. Inventario heredado (19.00 / 19.16 · V1-P1.a)

| Clasificación         | Assets                              | Elegible producción | Motivo de bloqueo                                                                          |
| --------------------- | ----------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| DEMO (destinos)       | 6                                   | 0                   | `is_demo_seed` / clasificación DEMO                                                        |
| REAL_UNGOVERNED       | 4                                   | 0                   | `rights_status = pending_owner`, ALT ausente o nombre de archivo, dimensiones desconocidas |
| TECHNICAL             | 1                                   | 0                   | benchmark interno, excluido de superficies editoriales                                     |
| **Total utilizables** | **11 registrados / 10 utilizables** | **0**               | —                                                                                          |

Fuente: `docs/governance/evidence/v1-p1-a/asset-governance-matrix.csv` y
`docs/governance/15-ASSET-RIGHTS-REGISTER-v1.0.md`.

---

## 3. Brecha por vertical

| Vertical         | Requisito bloqueante                                       | Estado                | Efecto en 19.18    |
| ---------------- | ---------------------------------------------------------- | --------------------- | ------------------ |
| Hotel            | portada con ALT real + galería ≥2 + lat/lng + SEO          | sin assets gobernados | no publica premium |
| Restaurante      | portada con ALT real + galería ≥2 + lat/lng + SEO          | sin assets gobernados | no publica premium |
| Experiencia/Tour | portada + features incluye/no incluye + punto de encuentro | sin assets gobernados | no publica premium |
| Destino          | portada con ALT real, provenance gobernada                 | sólo material DEMO    | no publica premium |

---

## 4. Requisitos mínimos para habilitar cada vertical (referencia, no ejecución)

1. `rights_status` distinto de `pending_owner`, con titular y licencia registrados.
2. ALT humano descriptivo por asset (prohibido nombre de archivo).
3. `width`/`height` conocidos antes de publicar.
4. `provenance.kind = governed_source`.
5. Coordenadas reales (Geolocation Mandatory Rule).
6. Metadatos SEO completos: title, description, canonical y JSON-LD.

Cumplidos los seis, `evaluateBusinessPremiumEligibility` deja de emitir `reason`
y la ficha asciende automáticamente a plantilla premium, sin cambio de código.

---

## 5. Reconciliación estructural verificada

| Dimensión                    | Cantidad | Observación                                                           |
| ---------------------------- | -------- | --------------------------------------------------------------------- |
| Bloques oficiales EB         | 13       | `DiscoveryNavigatorBlock` excluido (no oficial)                       |
| Superficies                  | 11       | 4 implicadas + 2 de apoyo                                             |
| Piezas del kit               | 14       | —                                                                     |
| Tipos autorables `vmx.kit.*` | 11       | 3 piezas estructurales sin tipo autorable: EmptyHint, PriceCta, Shell |

Asimetría 14 → 11 documentada y aceptada; no se propone cambio.

---

## 6. Conclusión

**Especificación completa · habilitación bloqueada por gobernanza de assets.**
El bloqueo es el comportamiento correcto y deseado del diseño fail-closed, no un defecto.
No se solicita remediación en esta ola.

**V1-P1.c: NO INICIADA.**
