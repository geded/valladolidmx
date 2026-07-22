# 08 · KNOWLEDGE GRAPH

**Estado:** Approved

**Versión:** 0.8

**Última actualización:** 2026-07-21

**Owner:** Founder (documental) · Núcleo de Gobernanza (mantenimiento)

## 1. Propósito

Este documento define la vista semántica canónica de Valladolid.mx. Conecta el vocabulario oficial, los documentos gobernados, los dominios responsables y los artefactos de implementación sin redefinir ninguna fuente.

El grafo responde cuatro preguntas operativas: **qué significa un concepto, quién lo gobierna, qué lo implementa y qué puede verse afectado por un cambio**.

## 2. Fuentes y precedencia

| Fuente | Estado | Función en el grafo |
|---|---|---|
| `01-GLOSSARY.md` v1.1 | Approved | Conceptos y definiciones oficiales. |
| `06-BLUEPRINT-MASTER-INDEX.md` v0.10 | Approved | Accountability documental por dominio. |
| `ADR-GOV-0001` | Approved | Taxonomía de 14 dominios. |
| `07-BLUEPRINT-DEPENDENCY-MAP.md` v0.8 | Approved | 1016 nodos técnicos y 1,119 relaciones verificadas. |

Ante contradicción prevalece la fuente canónica originaria. `08` enlaza conocimiento; no modifica definiciones, estados, owners ni evidencia.

## 3. Modelo semántico

Cada nodo declara `id`, `type`, `source` y `evidence`. Cada arista declara `origin`, `relation`, `destination`, `source`, `evidence` y `verified_at`.

Relaciones autorizadas: `defines`, `refines`, `authorizes`, `implements`, `requires`, `demonstrates`, `depends_on`, `part_of`, `governed_by` y `supersedes`.

No se admiten nodos huérfanos de fuente, aristas con extremos inexistentes, autorreferencias, duplicados ni relaciones sin evidencia.

## 4. Proyección canónica v0.8

| Métrica | Total |
|---|---:|
| Conceptos del Glosario | 56 |
| Dominios canónicos | 14 |
| Nodos heredados de `07` | 1016 |
| Nodos totales | 1086 |
| Relaciones heredadas de `07` | 1119 |
| Relaciones de accountability documental | 470 |
| Relaciones totales | 1589 |

El dataset completo reside en `docs/governance/generated/08-KNOWLEDGE-GRAPH.json`. No se duplica dentro de este Markdown para evitar dos fuentes divergentes.

## 5. Vistas de consulta

| Vista | Pregunta que resuelve | Recorrido |
|---|---|---|
| Autoridad | ¿Dónde está definida y autorizada una idea? | concepto ← `defines` ← Glosario; dominio ← `authorizes` ← ADR |
| Accountability | ¿Quién responde por un documento? | documento → `governed_by` → dominio |
| Implementación | ¿Qué código, migración o prueba materializa una decisión? | artefacto → relaciones verificadas de `07` → documento |
| Impacto | ¿Qué puede cambiar si se modifica un nodo? | aristas entrantes y salientes del nodo |

## 6. Reglas de evolución

1. Los conceptos sólo se crean o redefinen en `01-GLOSSARY.md`.
2. Los dominios y owners sólo cambian mediante `ADR-GOV-0001` y `06`.
3. Las dependencias técnicas sólo se incorporan después de verificarse en `07`.
4. `08` se regenera cuando cambia cualquiera de sus fuentes; no se corrige manualmente el JSON derivado.
5. Toda actualización debe ejecutar `node scripts/governance/validate-knowledge-graph.mjs`.

## 7. Criterios de aprobación

| Criterio | Estado | Evidencia |
|---|---|---|
| Glosario de referencia armonizado | Cumplido | `01` v1.1 Approved; 56 conceptos proyectados. |
| Mapa de dependencias aprobado | Cumplido | `07` v0.6 Approved (deriva de `06 v0.7` e incorpora los documentos Commerce y los tres documentos Visual propuestos sin inferir implementación). |
| Fuente canónica por nodo | Cumplido | Validación rechaza nodos sin `source` o `evidence`. |
| Evidencia por relación | Cumplido | Validación rechaza aristas sin fuente, evidencia o fecha. |
| Validación reproducible | Cumplido | `scripts/governance/validate-knowledge-graph.mjs`. |
| Aprobación Founder de v0.5 | Cumplido | El Founder aprobó expresamente el contenido de v0.5 bajo Founder Directive 442 (universo documental 442) y autorizó elevarlo a `Approved`. |

## 8. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v0.1 | 2026-07-20 | Founder | Reserva del grafo canónico y definición de sus fuentes. |
| v0.2 | 2026-07-21 | Founder | Modelo mínimo, dependencia explícita de `01` y `07`, owner y criterios de salida. |
| v0.3 | 2026-07-21 | Founder | Proyección provisional de cinco nodos y tres relaciones `supersedes`. |
| v0.4 | 2026-07-21 | Founder | Proyección integral reproducible de conceptos, dominios, documentos, artefactos y relaciones verificadas; aprobada por el Founder como cierre final. |
| v0.5 | 2026-07-21 | Founder | Reconciliación bajo Founder Directive 442: proyecta los 3 Closure Reports incorporados a `06 v0.6`, hereda 6 nodos y 3 aristas nuevas de `07 v0.5`, y añade 3 relaciones `governed_by` de accountability documental. |\n| v0.6 | 2026-07-21 | Founder | Proyecta los documentos Commerce `18.01–18.02`, hereda 2 nodos de `07 v0.7` y añade 2 relaciones `governed_by` hacia D06; no acredita implementación ni abre Gate B2. |
| v0.8 | 2026-07-22 | Founder | Regenerada desde `07 v0.8` (derivada de `06 v0.10`). Incorpora 23 DOC nuevos con `governed_by` a sus dominios por Adjudicación Integral Controlada (Opción A). Universo accountable: **470**. |
