# Gobernanza documental de Valladolid.mx

**Estado:** Active

**Versión:** 1.0

**Última actualización:** 2026-07-20

Este directorio contiene la jerarquía documental que gobierna Valladolid.mx. Su lectura comienza siempre por el CANON. Ningún Blueprint, roadmap, plan de Lovable, decisión técnica o implementación puede contradecir esta jerarquía.

## Orden canónico

| Orden | Documento | Estado | Responsabilidad |
|---:|---|---|---|
| 00 | [CANON](./00-CANON.md) | Approved | Identidad, propósito y principios constitucionales. |
| 01 | [GLOSSARY](./01-GLOSSARY.md) | Approved | Vocabulario oficial y definiciones únicas. |
| 02 | [ARCHITECTURAL PRINCIPLES](./02-ARCHITECTURAL-PRINCIPLES.md) | Approved | Constitución técnica permanente. |
| 03 | [DOCUMENTATION STANDARD](./03-DOCUMENTATION-STANDARD.md) | Approved | Creación, mantenimiento y deprecación documental. |
| 04 | [DECISION MAKING](./04-DECISION-MAKING.md) | Approved | Evaluación, aprobación y trazabilidad de decisiones. |
| 05 | [BLUEPRINT STANDARD](./05-BLUEPRINT-STANDARD.md) | Approved | Contrato de calidad para nuevos Blueprints. |
| 06 | [BLUEPRINT MASTER INDEX](./06-BLUEPRINT-MASTER-INDEX.md) | Review Candidate | Catálogo del portafolio vigente y las 424 entradas históricas por familia. |
| 07 | [BLUEPRINT DEPENDENCY MAP](./07-BLUEPRINT-DEPENDENCY-MAP.md) | Review Candidate | Trazabilidad entre autoridad, diseño, implementación, datos y evidencia. |
| 08 | [KNOWLEDGE GRAPH](./08-KNOWLEDGE-GRAPH.md) | Review Candidate | Relaciones semánticas entre conceptos, actores, capacidades y artefactos. |

## Regla de precedencia

Cuando dos documentos entren en conflicto, se aplica este orden:

1. `00-CANON.md`.
2. Documentos aprobados `01–05`, en el ámbito que gobierna cada uno.
3. Roadmap oficial vigente.
4. Blueprints y ADR aprobados.
5. PRD, runbooks, reportes y guías.
6. `.lovable/plan.md`, instrucciones de ejecución y notas de trabajo.
7. Documentos Draft.

Los documentos del mismo nivel no se resuelven por fecha o conveniencia. La contradicción debe registrarse y decidirse mediante `04-DECISION-MAKING.md`.

## Punto de entrada al Blueprint histórico

Después de leer esta carpeta, el recorrido del Blueprint comienza en [`docs/blueprint/START-HERE-FIRST.md`](../blueprint/START-HERE-FIRST.md). Ese archivo conserva su función de guía operativa, pero queda subordinado a esta jerarquía.

La única hoja de ruta vigente es [`16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](../blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md). El plan de ejecución `.lovable/plan.md` está subordinado a ella.

## Auditoría

Las correcciones de estructura y gobernanza se registran en [`audit/`](./audit/). Los placeholders retirados no eran documentos aprobados; su consolidación y renumeración está documentada allí para preservar trazabilidad.
