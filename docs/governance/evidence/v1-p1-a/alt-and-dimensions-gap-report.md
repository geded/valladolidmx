# V1-P1.a · Reporte de Brechas de ALT y Dimensiones v1.0

**Fecha:** 2026-08-22 · **Blueprint:** `19.16-V1-P1a-ASSET-RIGHTS-ALT-DIMENSIONS-GOVERNANCE-AUTHORIZATION-PACK-v1.0.md`
**Manifiesto:** ninguno (paquete documental puro) · **FLAG:** OFF · **PRODUCCIÓN:** NO TOCADA
**Fuentes de verdad:** consulta a `media_assets` (2026-08-22), `docs/evidence/omxds-visual/v0-baseline/media/media_assets_inventory.csv`, `docs/evidence/omxds-visual/v0-baseline/media/storage_objects_inventory.csv`.

---

## 1. Resumen ejecutivo

| Brecha                                               | Assets afectados    | % sobre 11 canónicos |
| ---------------------------------------------------- | ------------------- | -------------------- |
| Sin ALT real utilizable en superficie                | 4 (#7, #8, #9, #10) | 36 %                 |
| Sin dimensiones (`width`/`height`) registradas       | 4 (#7, #8, #9, #10) | 36 %                 |
| Sin derechos declarados (`rights_status ≠ declared`) | 11                  | 100 %                |
| Duplicados repositorio ↔ Storage                     | 2 (#9, #10)         | 18 %                 |
| En estado `REAL_GOVERNED`                            | 0                   | 0 %                  |

Los 6 assets DEMO sí tienen ALT descriptivo real y dimensiones 1536×1024, pero permanecen no aptos para producción por licencia demo.

## 2. Brechas de ALT

| Asset                                  | ALT actual       | Defecto                                               | Fuente de verdad para el ALT real                | Responsable         |
| -------------------------------------- | ---------------- | ----------------------------------------------------- | ------------------------------------------------ | ------------------- |
| `cb8ccb0d-60de-4d37-b178-7802f6d39b24` | `85B97F6A….jpeg` | Nombre de archivo — prohibido por `resolveMediaAlt()` | Ficha de la empresa titular + descripción humana | Equipo de contenido |
| `57a401dc-68d3-456f-87ba-f5196070376b` | `IMG_6663.jpeg`  | Nombre de archivo                                     | Ficha del destino + descripción humana           | Equipo de contenido |
| `5f614350-1347-4500-8489-5f84ff36f09e` | (nulo)           | Ausente                                               | Contexto editorial del fondo `bg01`              | Equipo de contenido |
| `1c276d54-7bab-4b36-9b85-5e70d6fe8e01` | (nulo)           | Ausente                                               | Contexto editorial del fondo `bg02`              | Equipo de contenido |

**Regla aplicable:** el ALT nunca se deriva del nombre de archivo. Todo consumo pasa por `resolveMediaAlt()`; ningún componente construye texto alternativo por su cuenta.

## 3. Brechas de dimensiones

| Asset        | width | height | Método de obtención autorizado (V1-P1.b)                      |
| ------------ | ----- | ------ | ------------------------------------------------------------- |
| `cb8ccb0d-…` | —     | —      | Lectura de metadatos del original inmutable, sin re-codificar |
| `57a401dc-…` | —     | —      | Ídem                                                          |
| `5f614350-…` | —     | —      | Ídem                                                          |
| `1c276d54-…` | —     | —      | Ídem                                                          |

Consecuencia operativa de la ausencia de dimensiones: no puede declararse `aspect-ratio` estable, lo que degrada CLS en las superficies que consuman estos assets. Es la razón por la que ninguno es `production_eligible`.

## 4. No-brechas verificadas

- 6 DEMO con ALT descriptivo y dimensiones completas (1536×1024).
- 1 TECHNICAL (`642cb15f-…`) con dimensiones 1600×2400; ALT no aplica por no ser editorial.
- 33 derivados `media-derived/**`: heredan ALT y derechos del original; no constituyen brecha propia.
- 1 objeto PRIVATE (`business-verification/*.pdf`) fuera del universo editorial.

## 5. Faltantes (MISSING) — declarados, no remediados en V1-P1.a

| Vertical            | Cobertura de imagen |
| ------------------- | ------------------- |
| Empresas — portada  | 1 de 28 (3.6 %)     |
| Empresas — logo     | 0 de 28 (0 %)       |
| Hoteles             | 0 %                 |
| Experiencias        | 0 %                 |
| Tours               | 0 %                 |
| Casas de vacaciones | 0 %                 |

## 6. Verificación de criterios

| Criterio                                                            | Resultado |
| ------------------------------------------------------------------- | --------- |
| A1 — 11 filas únicas en la matriz                                   | PASS      |
| A2 — `rights_status` sin celdas vacías                              | PASS      |
| A3 — Titular/licencia o `pending_owner` con responsable             | PASS      |
| A4 — Ningún DEMO `production_eligible`                              | PASS      |
| A5 — Brechas coinciden con evidencia V0 (4/4/11)                    | PASS      |
| A6 — Sin cambios en `src/`, migraciones, `package.json`, `bun.lock` | PASS      |
| A7 — Ninguna URL pública alterada                                   | PASS      |
| A8 — Flags sin cambios                                              | PASS      |

## 7. Siguiente paso

Cerrar las 4 filas `pending_owner` del registro de derechos y medir dimensiones sobre el original inmutable. Ambas acciones pertenecen a **V1-P1.b**, no iniciada.
