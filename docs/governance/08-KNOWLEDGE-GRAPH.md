# 08 · KNOWLEDGE GRAPH

**Estado:** Draft

**Versión:** 0.2

**Última actualización:** 2026-07-21

**Owner:** Founder (documental) · Núcleo de Gobernanza (mantenimiento)

## 1. Propósito

Este documento reservará el grafo de conocimiento que conecta conceptos oficiales, documentos, decisiones y artefactos de implementación de Valladolid.mx.

## 2. Alcance actual

La numeración y la responsabilidad del documento quedan aprobadas como parte de la reconciliación de gobernanza. El modelo semántico completo permanece pendiente y este Draft no reemplaza definiciones del GLOSSARY ni dependencias del mapa `07`.

Este documento depende explícitamente de:

- `01-GLOSSARY.md` como única fuente de conceptos y definiciones.
- `07-BLUEPRINT-DEPENDENCY-MAP.md` como única fuente de relaciones verificadas entre artefactos.

No se pobla grafo alguno en este PR.

## 3. Fuentes canónicas

El grafo deberá derivarse únicamente de:

- términos aprobados en `01-GLOSSARY.md`;
- principios y reglas de los documentos `00–05`;
- Blueprints y ADR aprobados;
- relaciones verificadas en `07-BLUEPRINT-DEPENDENCY-MAP.md`;
- código, migraciones y evidencia operativa existentes.

## 3.1 Modelo mínimo

Cada elemento del grafo debe registrarse con la estructura mínima:

- **nodo**: identificador único del concepto o artefacto.
- **tipo**: `concept`, `document`, `principle`, `capability`, `artifact`, `role`, `surface`.
- **relación**: `defines`, `refines`, `authorizes`, `implements`, `depends_on`, `part_of`, `governed_by`, `supersedes`.
- **fuente**: documento canónico que origina la entidad o relación (`01-GLOSSARY`, `00-CANON`, blueprint aprobado, ADR).
- **evidencia**: ruta o referencia verificable que sostiene la relación.

Nodos sin fuente canónica o relaciones sin evidencia verificable no pueden entrar al grafo.

## 4. Regla semántica

El grafo enlaza conocimiento; no redefine conceptos. Ante cualquier contradicción prevalece el documento canónico que origina la entidad o relación.

## 5. Criterios objetivos para salir de Draft

Este documento sólo puede pasar a `Approved` cuando:

1. `01-GLOSSARY.md` esté armonizado en su versión de referencia y cubra los conceptos que el grafo pretenda representar.
2. `07-BLUEPRINT-DEPENDENCY-MAP.md` esté `Approved` con aristas verificables.
3. Todo nodo del grafo tenga fuente canónica declarada.
4. Toda relación tenga evidencia enlazada a un artefacto existente o a una decisión aprobada.
5. Exista un mecanismo reproducible de validación que rechace nodos o relaciones sin fuente y sin evidencia.

## 6. Control de versiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| v0.1 | 2026-07-20 | Founder | Reserva del grafo canónico y definición de sus fuentes. |
| v0.2 | 2026-07-21 | Founder | Modelo mínimo (nodo/tipo/relación/fuente/evidencia), dependencia explícita de `01` y `07`, owner y criterios de salida de Draft. No pobla grafo. |
