# 06 · BLUEPRINT MASTER INDEX

**Estado:** Draft

**Versión:** 0.3

**Última actualización:** 2026-07-21

**Owner:** Founder (documental) · Núcleo de Gobernanza (mantenimiento)

## 1. Propósito

Este documento reservará el catálogo canónico de todos los Blueprints de Valladolid.mx, su versión, estado, dominio, documento reemplazado y evidencia de cierre.

## 2. Alcance actual

La numeración y la responsabilidad del documento quedan aprobadas como parte de la reconciliación de gobernanza. El roadmap ya fue rebaselined en [`16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](../blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md). El inventario exhaustivo de Blueprints permanece pendiente y, mientras este archivo continúe en estado Draft, no sustituye al roadmap oficial ni modifica el estado de ningún Blueprint.

## 2.1 Universo documental verificable

A la fecha de esta versión, el universo documental total bajo `docs/blueprint/` es **439 archivos únicos**, distribuidos así:

- **424** archivos en la raíz de `docs/blueprint/`.
- **15** archivos en 5 subdirectorios: `artifacts/`, `audits/`, `project-constitution/`, `roadmap/`, `templates/`.
- **424 + 15 = 439**.

El conteo previo de 429 mezclaba 424 archivos raíz + 5 subdirectorios y queda descartado como base de inventario.

## 2.2 Metodología reproducible

El universo se obtiene siempre con comandos deterministas sobre el árbol de trabajo:

```
find docs/blueprint -type f | wc -l                    # 439 archivos únicos
find docs/blueprint -maxdepth 1 -type f | wc -l        # 424 raíz
find docs/blueprint -mindepth 2 -type f | wc -l        # 15 en subdirectorios
find docs/blueprint -mindepth 1 -type d                # 5 subdirectorios
```

Cualquier revisión futura debe reproducir estos números antes de modificar el inventario. Ninguna exclusión está autorizada por ahora: los 15 archivos en subdirectorios (plantillas, artefactos, auditorías, constitución, roadmap) forman parte del universo canónico.

## 3. Contrato del índice

La versión completa deberá incluir, como mínimo, los siguientes campos por cada uno de los 439 blueprints:

- **identificador canónico** (ruta relativa dentro de `docs/blueprint/`);
- **nombre canónico**;
- **versión** documental;
- **estado real** (`Draft`, `Approved`, `Superseded`, `Historical`, `Deprecated`);
- **dominio o módulo responsable**;
- **predecesor** (documento reemplazado);
- **superseded-by** (documento que lo reemplaza, si aplica);
- **implementación** asociada (rutas de código, migraciones, componentes);
- **migración** vinculada (si existe);
- **pruebas** o evidencia operativa;
- **Completion Report** asociado;
- **última revisión** (fecha ISO).

Las dependencias entre blueprints se registran en `07-BLUEPRINT-DEPENDENCY-MAP.md`, no en este índice.

## 3.1 No poblado en este PR

Este PR no puebla las 439 filas del inventario. La población de filas requiere un PR dedicado posterior al superseded-pass y depende del ADR de dominios pendiente cuando toque asignar canonical por superficie.

## 3.2 Overlay provisional de autoridad · superseded-pass Fase 4

Mientras el inventario de 439 filas permanece pendiente, este overlay registra únicamente las tres relaciones `Superseded` aprobadas por el Founder y fusionadas en `main` mediante el commit [`a42d3a6d3546d192b1ea5fda8b11b891ca0cec1e`](https://github.com/geded/valladolidmx/commit/a42d3a6d3546d192b1ea5fda8b11b891ca0cec1e). No constituye el poblado completo del índice ni autoriza inferir estados para otros documentos.

Para este overlay provisional, los tres antecedentes cuentan como registros poblados y los dos sucesores sin fila propia enlazados cuentan únicamente como identificadores referenciados por `07` y `08`. Los sucesores no reciben aquí una fila propia ni un estado documental hasta que exista una clasificación aprobada durante el poblado integral.

| Identificador canónico | Versión | Estado real | Predecesor | `superseded-by` | Dominio | Evidencia | Última revisión |
|---|---:|---|---|---|---|---|---|
| [`18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.0.md`](../blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.0.md) | v1.0 | `Superseded` | — | [`v1.1`](../blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md) | Media pipeline · firmas persistidas | Cabecera del documento + commit de autoridad | 2026-07-20 |
| [`18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md`](../blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.1.md) | v1.1 | `Superseded` | [`v1.0`](../blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.0.md) | [`v1.2`](../blueprint/18.H3-A4-M2.3.1-PERSISTED-SIGNATURE-PRECOMPUTATION-BLUEPRINT-v1.2.md) | Media pipeline · firmas persistidas | Cabecera del documento + commit de autoridad | 2026-07-20 |
| [`18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md`](../blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.0.md) | v1.0 | `Superseded` | — | [`v1.1 FINAL`](../blueprint/18.H3-A4-M2.3.1-PHASE-B-COMPLETION-REPORT-v1.1.md) | Media pipeline · Fase B | Cabecera del documento + commit de autoridad | 2026-07-20 |

Los campos restantes del contrato §3 —implementación, migración, pruebas y Completion Report asociado— se incorporarán durante el poblado integral. Este overlay sólo tiene autoridad sobre estado, precedencia y sustitución.

## 4. Fuente temporal

Hasta completar este índice, el orden de ejecución se determina mediante el [roadmap oficial v2.1](../blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md) y las decisiones aprobadas. La existencia de un archivo en `docs/blueprint/` no implica por sí sola que esté aprobado, implementado o cerrado.

## 5. Criterios objetivos para salir de Draft

Este documento sólo puede pasar a `Approved` cuando se cumplan, verificablemente, todos los siguientes criterios:

1. Las 439 filas del universo documental están pobladas con todos los campos obligatorios definidos en §3.
2. Cada fila referencia únicamente rutas y artefactos existentes en el repositorio.
3. El superseded-pass está cerrado: no hay estado `Draft` heredado sin justificación explícita.
4. El ADR de dominios (Valladolid.mx / quehacerenvalladolid.com) está aprobado y sus canonicals por superficie están reflejados en las filas correspondientes.
5. `07-BLUEPRINT-DEPENDENCY-MAP.md` cita este índice como fuente vinculante.
6. Existe evidencia reproducible del inventario (comandos §2.2) en el Completion Report del PR de poblado.

## 6. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v0.1 | 2026-07-20 | Founder | Reserva del índice canónico y definición de su contrato mínimo. |
| v0.2 | 2026-07-21 | Founder | Universo verificable (439), metodología reproducible, campos mínimos, owner y criterios de salida de Draft. No pobla filas. |
| v0.3 | 2026-07-21 | Founder | Overlay provisional con las tres relaciones `Superseded` aprobadas y fusionadas en Fase 4; el inventario integral continúa pendiente. |
