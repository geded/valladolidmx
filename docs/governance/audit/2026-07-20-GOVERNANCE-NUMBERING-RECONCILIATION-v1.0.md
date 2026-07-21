# Reconciliación de numeración de gobernanza

**Estado:** Executed

**Versión:** 1.1

**Fecha:** 2026-07-20 · Anexo forense 2026-07-21

## 0. Evidencia Git verificable

- **Commit auditado:** `e02fa340d9bf5569f49e3b9bd0568a687f2c8b17` ("Correct governance numbering and hierarchy", 2026-07-20).
- **Commit padre:** `6ef69c70c1d7d8a886431ac8b1722a02d3ad4683`.
- **HEAD al momento del anexo:** `725d19c8d50b1ae123dc513afa8a437ba9c9c992`.

Placeholders retirados y sus SHA de blob previos, obtenidos con `git rev-parse 6ef69c70:docs/governance/<archivo>`:

| Placeholder retirado | SHA blob previo (verificado) |
|---|---|
| `01-DOCUMENTATION-GOVERNANCE.md` | `0a323a6b176c7869a4b70c58201a932f3fb847df` |
| `02-BLUEPRINT-MASTER-INDEX.md`   | `5446af70681e9af82f3208ee39a8078e07f8f95c` |
| `03-BLUEPRINT-DEPENDENCY-MAP.md` | `8d90f9220ccf0ec6c1ccc90de2e3aa74ad12b0f6` |
| `04-CANONICAL-VOCABULARY.md`     | `b4235300672e18cde6ea735b88dabdc8a09f4e74` |
| `05-KNOWLEDGE-GRAPH.md`          | `5d9e9b0ea40c86c8a78ee243206538cba9855843` |

Todos los SHA fueron recuperados directamente del historial Git; ninguno queda marcado como "no recuperado / no verificado" en esta iteración.

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

Los placeholders consolidados se retiraron.

### 2.1 Distinción entre hecho y afirmación

- **Hecho comprobado (Git):** los cinco archivos existieron en el commit padre `6ef69c70` con los SHA listados en §0 y fueron eliminados por `e02fa340` (verificable con `git show e02fa340 --name-status`). Su tamaño individual era de 7 líneas (marcador de reserva).
- **Afirmación histórica del ejecutor (no derivada de Git):** que los placeholders "nunca fueron aprobados ni contuvieron decisiones" y que "únicamente repetían el propósito de documentos canónicos ya existentes". Esta caracterización refleja el juicio del ejecutor de la reconciliación y no una traza documental de aprobación previa; queda registrada como afirmación, no como hecho verificado.

## 3. Jerarquía resultante

La serie queda ordenada de `00` a `08`, sin colisiones. Los documentos `00–05` permanecen aprobados; `06–08` permanecen Draft hasta completar sus inventarios.

`docs/blueprint/START-HERE-FIRST.md` conserva su función de entrada al Blueprint histórico, pero ya no se declara autoridad superior al CANON.

## 4. Trabajo posterior

- Completar el inventario de `06` durante la rebase del roadmap.
- Construir el mapa verificable de `07` a partir del repositorio reconciliado.
- Derivar `08` únicamente de fuentes canónicas y relaciones confirmadas.
- Revisar enlaces como parte de cada actualización documental.

## 5. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v1.0 | 2026-07-20 | Founder | Reconciliación ejecutada. |
| v1.1 | 2026-07-21 | Founder | Anexo forense: commit auditado, commit padre, HEAD, SHA de blobs previos y distinción entre hecho comprobado y afirmación histórica. |
