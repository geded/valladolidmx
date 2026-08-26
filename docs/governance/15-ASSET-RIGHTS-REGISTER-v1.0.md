# 15 · Asset Rights Register v1.0

**Fecha:** 2026-08-22 · **Ola:** V1-P1.a · **Blueprint:** `docs/blueprint/19.16-V1-P1a-ASSET-RIGHTS-ALT-DIMENSIONS-GOVERNANCE-AUTHORIZATION-PACK-v1.0.md`
**Manifiesto:** ninguno. Paquete documental puro; no requiere Product Change Authorization porque no modifica rutas sensibles de producto.
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
| Assets canónicos (V1-P1.a) | 11 |
| Assets gobernados reales (V1-P1.c) | 12 |
| `declared` | 12 |
| `pending_owner` | 4 |
| `demo` | 6 |
| `technical` | 1 |
| `REAL_GOVERNED` (aptos para plantillas premium) | **12** |

Cerrar las 4 filas `pending_owner` es prerrequisito de V1-P1.b. Este registro es la única fuente de verdad de derechos de assets; toda ampliación futura se hace por evolución de este documento, no por duplicación.

## 6. Addendum V1-P1.c · Assets gobernados de producción propia (2026-08-25)

Curaduría e ingesta de 12 imágenes reales gobernadas por vertical — Hotel, Restaurante,
Experiencia/Tour y Destino — mediante producción propia de Valladolid.mx. Cada asset:
`is_demo_seed=false`, `rights_status=declared`, `provenance.kind=governed_source`,
`license=own_production`, `rights_holder=Valladolid.mx`, ALT humano descriptivo, dimensiones
1536×1024, `pipeline_status=ready`, `review_state=approved`, `original_immutable=true`.
Bucket `studio-media`, ruta `governed/v1p1c/<vertical>-<role>.jpg`.

| # | id | Ubicación (`studio-media`) | Vertical | Rol | rights_status | Licencia | production_eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 12 | `809b7e1b-22e6-4a15-af65-06bc46b9d8e5` | `governed/v1p1c/hotel-cover.jpg` | hotel | cover | `declared` | own_production | true |
| 13 | `995e5a74-d10a-48ee-b968-315b754def41` | `governed/v1p1c/hotel-gallery-1.jpg` | hotel | gallery | `declared` | own_production | true |
| 14 | `c43d33b6-f67a-486d-81ce-c979e509dfd0` | `governed/v1p1c/hotel-gallery-2.jpg` | hotel | gallery | `declared` | own_production | true |
| 15 | `0b4978d0-3a15-4f07-ac60-fe93b94c4071` | `governed/v1p1c/restaurant-cover.jpg` | restaurant | cover | `declared` | own_production | true |
| 16 | `b9f33bef-54e6-49fe-9767-fb99748369b5` | `governed/v1p1c/restaurant-gallery-1.jpg` | restaurant | gallery | `declared` | own_production | true |
| 17 | `8702e5bd-8834-4ff5-beaa-e52ea84b2dbd` | `governed/v1p1c/restaurant-gallery-2.jpg` | restaurant | gallery | `declared` | own_production | true |
| 18 | `0603dbfb-762d-496a-a3f2-507d5b892d00` | `governed/v1p1c/experience-cover.jpg` | experience | cover | `declared` | own_production | true |
| 19 | `054505b4-07c7-482e-be02-29a950fc3967` | `governed/v1p1c/experience-gallery-1.jpg` | experience | gallery | `declared` | own_production | true |
| 20 | `5d14e132-1e05-449e-9cbf-4962c4fc55b6` | `governed/v1p1c/experience-gallery-2.jpg` | experience | gallery | `declared` | own_production | true |
| 21 | `453dd8fd-7d1e-419e-95ea-9afa365f363c` | `governed/v1p1c/destination-cover.jpg` | destination | cover | `declared` | own_production | true |
| 22 | `48bdb6fd-91ec-40b4-8262-070cffdbdaf3` | `governed/v1p1c/destination-gallery-1.jpg` | destination | gallery | `declared` | own_production | true |
| 23 | `4c1ffec3-c57f-44e5-99f3-b8c9ffb0b93b` | `governed/v1p1c/destination-gallery-2.jpg` | destination | gallery | `declared` | own_production | true |

Estos 12 assets son los primeros `REAL_GOVERNED` del proyecto y cumplen los seis requisitos
mínimos de habilitación de §4 del reporte de brecha V1-P1.b (derechos, ALT, dimensiones,
provenance gobernada, geolocalización aplicable al asociarse a ficha, SEO al publicar).
La elegibilidad premium por ficha (`evaluateBusinessPremiumEligibility`) requiere además el
flujo de publicación del negocio (portal provenance, plan grant, audit log) — ese cierre
corresponde a V1-P1.d (Demo Pack), no a esta ola. Ninguna superficie pública se modifica:
los assets viven en la Biblioteca de Medios del Experience Builder a la espera de asociarse.

Los originales binarios son inmutables (Founder Immutable Original Principle). Sustituir
una imagen por una foto real futura = ingerir un nuevo `media_asset` (nuevo id) y
reasignar la portada/galería de la ficha; el original generado queda archivado, sin borrar.
