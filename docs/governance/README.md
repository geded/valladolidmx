# Gobernanza documental de Valladolid.mx

**Estado:** Approved  
**Versión:** 2.5  
**Última actualización:** 2026-07-21

Este directorio contiene el sistema canónico que gobierna Valladolid.mx. Su lectura comienza siempre por el CANON. Ningún Blueprint, roadmap, ADR, PRD, plan de Lovable, decisión técnica o implementación puede contradecir esta jerarquía.

## Orden canónico

| Orden | Documento                                                    | Estado   | Responsabilidad                                                                   |
| ----: | ------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------- |
|    00 | [CANON](./00-CANON.md)                                       | Approved | Identidad, propósito, principios, reglas inmutables y North Stars.                |
|    01 | [GLOSSARY](./01-GLOSSARY.md)                                 | Approved | Vocabulario oficial y definiciones únicas.                                        |
|    02 | [ARCHITECTURAL PRINCIPLES](./02-ARCHITECTURAL-PRINCIPLES.md) | Approved | Constitución técnica permanente.                                                  |
|    03 | [DOCUMENTATION STANDARD](./03-DOCUMENTATION-STANDARD.md)     | Approved | Creación, mantenimiento y deprecación documental.                                 |
|    04 | [DECISION MAKING](./04-DECISION-MAKING.md)                   | Approved | Evaluación, aprobación y trazabilidad de decisiones.                              |
|    05 | [BLUEPRINT STANDARD](./05-BLUEPRINT-STANDARD.md)             | Approved | Contrato de calidad para nuevos Blueprints.                                       |
|    06 | [BLUEPRINT MASTER INDEX](./06-BLUEPRINT-MASTER-INDEX.md)     | Approved | Catálogo canónico de 439 documentos, sus estados y dominios responsables.         |
|    07 | [BLUEPRINT DEPENDENCY MAP](./07-BLUEPRINT-DEPENDENCY-MAP.md) | Approved | Dependencias verificadas entre documentos, implementación, migraciones y pruebas. |
|    08 | [KNOWLEDGE GRAPH](./08-KNOWLEDGE-GRAPH.md)                   | Approved | Vista semántica de conceptos, dominios, documentos y artefactos.                  |
|    09 | [OMXDS FOUNDATION](./09-OMXDS-FOUNDATION-v1.0.md)          | Approved | Ecosistema regional, jerarquía de productos, North Star y regla de priorización V1. |
|    10 | [OMXDS VISITOR JOURNEY INTELLIGENCE](./10-OMXDS-VISITOR-JOURNEY-INTELLIGENCE-MEASUREMENT-BLUEPRINT-v1.0.md) | Approved | Medición responsable del recorrido completo, identidad progresiva, atribución, paneles y privacidad. |
|    11 | [OMXDS VALLADOLID.MX V1 CAPABILITY INVENTORY](./11-OMXDS-VALLADOLIDMX-V1-CAPABILITY-INVENTORY-v1.0.md) | Approved | Inventario de las diez capas OMXDS, brechas para soft launch y Programa Fundadores confirmado como primer vertical. |
|    12 | [PROGRAMA FUNDADORES VALLADOLID · GATE B READINESS PACK](./12-PROGRAMA-FUNDADORES-VALLADOLID-GATE-B-READINESS-PACK-v1.0.md) | Proposed | Oferta piloto, selección, consentimiento, soporte y gates B1/B2 para decidir la primera cohorte de cinco empresas. |

Los documentos `00–11` gobiernan dentro de la responsabilidad declarada por cada uno. `06` acredita autoridad documental, no implementación. `07` registra sólo relaciones demostrables; una ausencia significa `Not established`. `08` enlaza fuentes canónicas sin redefinirlas.

## Activos derivados y validación

Las vistas legibles por máquina son artefactos canónicos derivados, no fuentes editoriales independientes:

| Proyección                 | Dataset                                                                                          | Validador                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Mapa de dependencias `07`  | [`generated/07-BLUEPRINT-DEPENDENCY-MAP.json`](./generated/07-BLUEPRINT-DEPENDENCY-MAP.json)     | [`validate-dependency-map.mjs`](../../scripts/governance/validate-dependency-map.mjs)             |
| Grafo de conocimiento `08` | [`generated/08-KNOWLEDGE-GRAPH.json`](./generated/08-KNOWLEDGE-GRAPH.json)                       | [`validate-knowledge-graph.mjs`](../../scripts/governance/validate-knowledge-graph.mjs)           |
| Inventario de integridad   | [`generated/GOVERNANCE-ARTIFACT-INVENTORY.json`](./generated/GOVERNANCE-ARTIFACT-INVENTORY.json) | [`validate-governance-integrity.mjs`](../../scripts/governance/validate-governance-integrity.mjs) |

Estado aprobado de las proyecciones:

- `06 v0.5`: 439 documentos inventariados y asignados a un dominio canónico.
- `07 v0.4`: 982 nodos y 1,116 relaciones verificadas.
- `08 v0.4`: 1,055 nodos y 1,625 relaciones semánticas.

Validación reproducible desde la raíz del repositorio:

```bash
bun run governance:validate
```

Toda modificación a una fuente, dataset o regla de derivación debe actualizar sus proyecciones en el mismo cambio y conservar los validadores en verde.

## Regla de precedencia

Cuando dos documentos entren en conflicto, se aplica este orden:

1. `00-CANON.md`.
2. Documentos aprobados `01–11`, dentro de la responsabilidad que gobierna cada uno.
3. Roadmap oficial vigente.
4. Blueprints y ADR aprobados.
5. PRD, runbooks, Completion Reports, auditorías y guías.
6. `.lovable/plan.md`, instrucciones de ejecución y notas de trabajo.
7. Documentos Draft.

Los documentos del mismo nivel no se resuelven por fecha, longitud o conveniencia. La contradicción debe registrarse y decidirse mediante [`04-DECISION-MAKING.md`](./04-DECISION-MAKING.md).

## Dominios documentales

[`ADR-GOV-0001`](../decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md) está `Approved` y establece la taxonomía oficial de 14 dominios. Cada documento del universo `docs/blueprint/` tiene un dominio primario asignado en `06`; `08` proyecta esa responsabilidad mediante relaciones `governed_by`.

La clasificación por dominio determina accountability documental. No transfiere por sí misma ownership de código, autoridad operativa ni prueba de implementación.

## Ruta de lectura operativa

Después de leer esta carpeta:

1. Consultar [`docs/blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](../blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md), única fuente oficial de priorización vigente.
2. Usar [`docs/blueprint/START-HERE-FIRST.md`](../blueprint/START-HERE-FIRST.md) como entrada al Blueprint histórico.
3. Localizar el documento pertinente y su estado en `06`.
4. Revisar dependencias y evidencia en `07` antes de modificar una capacidad existente.
5. Consultar `08` para análisis de autoridad, accountability, implementación e impacto.
6. Ejecutar únicamente el trabajo autorizado por el roadmap y reflejado en `.lovable/plan.md`.

El roadmap decide prioridad. El índice decide autoridad documental. El mapa registra dependencias verificadas. El grafo permite navegar el conocimiento. Ninguno sustituye a los demás.

## Política de dominios web

La estrategia de dominios web continúa sujeta a decisiones específicas y evidencia de tráfico, contenido y autoridad. Como marco Founder permanente:

- `Valladolid.mx` es la marca y plataforma turística principal.
- `quehacerenvalladolid.com` es un activo SEO complementario.
- No se autoriza un redirect total sin inventario previo de URLs, contenido, tráfico y autoridad.
- Ninguna decisión sobre canonical, hreflang, redirects o consolidación se infiere del ADR de dominios documentales.

`ADR-GOV-0001` clasifica dominios de conocimiento del repositorio; no decide la arquitectura de dominios web.

## Mantenimiento y auditoría

- Los documentos aprobados cambian mediante versión, justificación, revisión y trazabilidad.
- Las definiciones nuevas se incorporan primero a `01-GLOSSARY.md`.
- Las decisiones estructurales se registran como ADR conforme a `04-DECISION-MAKING.md`.
- Los Blueprints nuevos deben cumplir `05-BLUEPRINT-STANDARD.md` antes de aprobarse.
- Los cambios al universo documental se reflejan en `06`; sus dependencias y relaciones derivadas se regeneran en `07–08`.
- Las correcciones históricas y de estructura se registran en [`audit/`](./audit/).
- Un estado `Approved` acredita autoridad documental; no equivale automáticamente a implementación, despliegue u operación real.

### Frescura automática

El workflow `Governance Integrity` compara cada PR contra el inventario canónico. Detecta altas, cambios, renombres y bajas en Blueprints, rutas, migraciones, plantillas, SEO, configuración de dominio, código y pruebas.

La política es incremental:

- las brechas heredadas permanecen visibles y no pueden aumentar;
- todo artefacto nuevo exige trazabilidad exacta en `07/08`;
- todo Blueprint nuevo debe aparecer en `06`;
- las migraciones publicadas son inmutables;
- los cambios sensibles de SEO, dominio o plantillas requieren evidencia documental en el mismo PR;
- el inventario debe regenerarse desde el commit que pretende integrarse.

La línea base, sus límites y el plan de cierre están documentados en [`audit/2026-07-21-GOVERNANCE-INTEGRITY-COVERAGE-AUDIT-v1.0.md`](./audit/2026-07-21-GOVERNANCE-INTEGRITY-COVERAGE-AUDIT-v1.0.md).

## Cierre canónico

La gobernanza `00–11`, la taxonomía de 14 dominios, el mapa de dependencias y el grafo de conocimiento están aprobados y constituyen la base oficial para decisiones, Blueprints, auditorías e implementación futura de Valladolid.mx.

OMXDS Foundation V1.0 establece el marco regional superior sin renombrar Valladolid.mx ni predeterminar el primer vertical operativo.

OMXDS Visitor Journey Intelligence & Measurement Blueprint V1.0 gobierna la observación responsable del viaje completo y no autoriza por sí mismo instrumentación, nuevos tratamientos de datos ni cambios en producción.

OMXDS Valladolid.mx V1 Capability Inventory confirma el Programa Fundadores Valladolid como primer vertical. Autoriza actualizar roadmap y plan operativo, pero no contactar empresas, incorporar la cohorte, activar cobros ni modificar producción.

Programa Fundadores Valladolid Gate B Readiness Pack v1.0 prepara la decisión operativa y separa invitación/incorporación (`B1`) de comercio (`B2`). Permanece `Proposed`; no autoriza contactos, publicación ni cobros.

El cierre no congela el proyecto. Establece el procedimiento para evolucionarlo sin perder identidad, trazabilidad ni sentido de destino.
