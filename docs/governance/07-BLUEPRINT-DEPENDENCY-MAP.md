# 07 · BLUEPRINT DEPENDENCY MAP

**Estado:** Draft

**Versión:** 0.2

**Última actualización:** 2026-07-21

**Owner:** Founder (documental) · Núcleo de Gobernanza (mantenimiento)

## 1. Propósito

Este documento reservará el mapa canónico de dependencias entre Blueprints, ADR, modelos de datos, migraciones, componentes, rutas, políticas y evidencia operativa.

## 2. Alcance actual

La numeración y la responsabilidad del documento quedan aprobadas como parte de la reconciliación de gobernanza. El levantamiento completo permanece pendiente y este Draft no crea dependencias nuevas ni modifica las ya aprobadas en documentos de mayor jerarquía.

Este documento depende de `06-BLUEPRINT-MASTER-INDEX.md`: cada nodo y cada arista debe referenciar un identificador existente en el inventario 06. No se pobla mapa alguno en este PR.

## 3. Relaciones mínimas

El mapa completo deberá representar:

- qué documento autoriza cada capacidad;
- qué artefactos implementan esa capacidad;
- qué migraciones y contratos de datos requiere;
- qué módulos dependen de ella;
- qué pruebas, reportes o runbooks demuestran su cierre;
- qué impacto tendría modificarla o retirarla.

## 3.1 Esquema mínimo de nodo

Cada nodo del mapa debe registrar, como mínimo:

- **id** (identificador canónico, coincidente con `06`);
- **tipo** (`blueprint`, `adr`, `policy`, `route`, `component`, `migration`, `table`, `edge_function`, `server_fn`, `test`, `runbook`, `report`);
- **ruta** (path relativo verificable en el repositorio);
- **owner** funcional;
- **estado** (heredado de `06` cuando aplique).

## 3.2 Esquema mínimo de arista

Cada arista debe registrar, como mínimo:

- **origen** (id de nodo);
- **destino** (id de nodo);
- **relación** (`authorizes`, `implements`, `requires`, `depends_on`, `demonstrates`, `supersedes`, `impacts`);
- **evidencia** (ruta a archivo, commit, migración, prueba o reporte que demuestra la relación);
- **última verificación** (fecha ISO).

Aristas sin ruta existente o sin evidencia verificable no pueden entrar al mapa.

## 4. Regla de trazabilidad

Toda relación deberá enlazar artefactos existentes y verificables. Una dependencia inferida se marcará como tal hasta quedar confirmada mediante código, historial o decisión aprobada.

## 5. Criterios objetivos para salir de Draft

Este documento sólo puede pasar a `Approved` cuando:

1. `06-BLUEPRINT-MASTER-INDEX.md` esté `Approved` con sus 439 filas pobladas.
2. Todo nodo del mapa referencie un id existente en `06` o una ruta real del repositorio.
3. Toda arista tenga evidencia verificable (archivo, commit, migración o prueba).
4. Las cadenas críticas mínimas estén representadas (CANON → 15.10.5a/5b/5c/5d → PWA; H-03 → Bloques → DSL; SEO.A1/A2/A3 → rutas; CV1..CV8 → tablas).
5. Exista un procedimiento reproducible de validación (script o checklist) que rechace nodos o aristas sin evidencia.

## 6. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v0.1 | 2026-07-20 | Founder | Reserva del mapa canónico y definición de sus relaciones mínimas. |
| v0.2 | 2026-07-21 | Founder | Esquema mínimo de nodo/arista, dependencia explícita de `06`, owner y criterios de salida de Draft. No pobla mapa. |
