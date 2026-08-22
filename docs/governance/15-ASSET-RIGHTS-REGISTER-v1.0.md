# 15 · Asset Rights Register v1.0

**Fecha:** 2026-08-22 · **Ola:** V1-P1.a · **Blueprint:** `docs/blueprint/19.16-V1-P1a-ASSET-RIGHTS-ALT-DIMENSIONS-GOVERNANCE-AUTHORIZATION-PACK-v1.0.md`
**Manifiesto:** `docs/governance/product-authorizations/PCA-2026-021.json` (Approved)
**FLAG:** OFF · **PRODUCCIÓN:** NO TOCADA · **Sin cambios en binarios, Storage ni `media_assets`.**

Registro canónico de derechos, licencia y atribución de los **11 assets canónicos** de `media_assets`, más los objetos de Storage fuera del universo canónico. Documento puramente declarativo: no modifica ningún binario ni URL pública (Founder Immutable Original Principle, Founder Stable Public Asset Contract).

---

## 1. Vocabulario normativo

**`rights_status`** (valor único obligatorio por asset):

| Valor | Significado |
| --- | --- |
| `declared` | Titular y licencia confirmados por escrito; uso comercial resuelto |
| `pending_owner` | Asset real cuyo titular/licencia debe confirmar un responsable nombrado |
| `demo` | Semilla demo temporal; sin derechos comerciales; nunca producción |
| `technical` | Asset de pipeline/benchmark; nunca editorial ni público |
| `private` | Documento privado de verificación; nunca editorial ni público |

**`production_eligible`**: `true` sólo si `rights_status = declared` **y** existe ALT real **y** dimensiones registradas. En V1-P1.a ningún asset alcanza esa condición.

---

## 2. Registro por asset canónico (`media_assets`, 11 filas)

| # | id | Ubicación | Clase | rights_status | Titular declarado | Licencia | Atribución exigida | Uso comercial | production_eligible | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `2f749dc4-64c9-414a-a61d-5faa9a1f1ba6` | `demo-media/destinations/hero_valladolid.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 2 | `3ebc51c1-2495-4720-bfd6-f239ed647d12` | `demo-media/destinations/hero_izamal.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 3 | `dc0db06f-c25d-4531-ac45-444a5b2c65fe` | `demo-media/destinations/hero_ek_balam.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 4 | `793b019e-db39-484a-bad4-3afe864c4fb9` | `demo-media/destinations/hero_las_coloradas.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 5 | `726a89e4-2378-47ff-b509-b574a5c9fb38` | `demo-media/destinations/hero_rio_lagartos.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 6 | `ca85ba07-8fee-4a57-ab0f-6d3e17b27d0f` | `demo-media/destinations/hero_uayma.jpg` | DEMO | `demo` | Valladolid.mx (semilla generada) | Demo interna, temporal | No | No permitido | false | Founder |
| 7 | `cb8ccb0d-60de-4d37-b178-7802f6d39b24` | `companies/5555…0002/…85b97f6a….jpg` | REAL_UNGOVERNED | `pending_owner` | Empresa titular de la ficha (por confirmar) | Por confirmar | Por confirmar | Por confirmar | false | Equipo de contenido |
| 8 | `57a401dc-68d3-456f-87ba-f5196070376b` | `destinations/1111…0001/…img_6663.jpg` | REAL_UNGOVERNED | `pending_owner` | Valladolid.mx (subida interna, por confirmar autoría) | Por confirmar | Por confirmar | Por confirmar | false | Equipo de contenido |
| 9 | `5f614350-1347-4500-8489-5f84ff36f09e` | `studio-media/2026/…bg01….jpg` | REAL_UNGOVERNED | `pending_owner` | Valladolid.mx (fondo editorial, por confirmar) | Por confirmar | Por confirmar | Por confirmar | false | Equipo de contenido |
| 10 | `1c276d54-7bab-4b36-9b85-5e70d6fe8e01` | `studio-media/2026/…bg02….jpg` | REAL_UNGOVERNED | `pending_owner` | Valladolid.mx (fondo editorial, por confirmar) | Por confirmar | Por confirmar | Por confirmar | false | Equipo de contenido |
| 11 | `642cb15f-0a13-410c-8027-c4ab92034bf5` | `media-original/pilot-v11/vertical-2400h….jpg` | TECHNICAL | `technical` | Valladolid.mx (benchmark interno) | Uso interno de pipeline | No | No aplica | false | Plataforma |

**Ningún asset queda con celdas vacías en `rights_status` (criterio A2). Ningún DEMO es `production_eligible` (criterio A4).**

## 3. Objetos fuera del universo canónico

| Ubicación | Clase | Registro en `media_assets` | rights_status | Tratamiento |
| --- | --- | --- | --- | --- |
| `business-verification/…/*.pdf` (1 objeto) | PRIVATE | No | `private` | Excluido por diseño; nunca editorial ni público |
| `media-derived/**` (33 objetos) | Derivado | No (heredan del original) | Heredado | No se gobiernan de forma independiente; no son URL canónica |

## 4. Duplicados repositorio ↔ Storage

| Asset | Duplicado en repositorio | Resolución propuesta (no ejecutada en V1-P1.a) |
| --- | --- | --- |
| #9 `bg01` | `src/assets/brand/hero/bg01.webp` | Declarar el original de Storage como fuente de verdad; el binario del repositorio se conserva sin cambios hasta decisión de V1-P1.b |
| #10 `bg02` | `src/assets/brand/hero/bg02.webp` | Ídem |

## 5. Estado de gobernanza

| Métrica | Valor |
| --- | --- |
| Assets canónicos | 11 |
| `declared` | 0 |
| `pending_owner` | 4 |
| `demo` | 6 |
| `technical` | 1 |
| `REAL_GOVERNED` (aptos para plantillas premium) | **0** |

Cerrar las 4 filas `pending_owner` es prerrequisito de V1-P1.b. Este registro es la única fuente de verdad de derechos de assets; toda ampliación futura se hace por evolución de este documento, no por duplicación.
