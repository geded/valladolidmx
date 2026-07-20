# Reconciliación de numeración de gobernanza

**Estado:** Executed

**Versión:** 1.0

**Fecha:** 2026-07-20

## 1. Problema detectado

La carpeta `docs/governance/` contenía dos series simultáneas numeradas `01–05`: cinco documentos aprobados y cinco placeholders Draft. La colisión impedía determinar una secuencia canónica y contradecía el principio de una sola fuente de verdad.

## 2. Decisión ejecutada

| Placeholder anterior | Resolución canónica |
|---|---|
| `01-DOCUMENTATION-GOVERNANCE.md` | Consolidado en `03-DOCUMENTATION-STANDARD.md`, que ya gobierna creación, mantenimiento y deprecación documental. |
| `02-BLUEPRINT-MASTER-INDEX.md` | Renumerado como `06-BLUEPRINT-MASTER-INDEX.md`. |
| `03-BLUEPRINT-DEPENDENCY-MAP.md` | Renumerado como `07-BLUEPRINT-DEPENDENCY-MAP.md`. |
| `04-CANONICAL-VOCABULARY.md` | Consolidado en `01-GLOSSARY.md`, fuente única del vocabulario oficial. |
| `05-KNOWLEDGE-GRAPH.md` | Renumerado como `08-KNOWLEDGE-GRAPH.md`. |

Los placeholders consolidados se retiraron porque nunca fueron aprobados ni contuvieron decisiones: únicamente repetían el propósito de documentos canónicos ya existentes.

## 3. Jerarquía resultante

La serie queda ordenada de `00` a `08`, sin colisiones. Los documentos `00–05` permanecen aprobados; `06–08` permanecen Draft hasta completar sus inventarios.

`docs/blueprint/START-HERE-FIRST.md` conserva su función de entrada al Blueprint histórico, pero ya no se declara autoridad superior al CANON.

## 4. Trabajo posterior

- Completar el inventario de `06` durante la rebase del roadmap.
- Construir el mapa verificable de `07` a partir del repositorio reconciliado.
- Derivar `08` únicamente de fuentes canónicas y relaciones confirmadas.
- Revisar enlaces como parte de cada actualización documental.
