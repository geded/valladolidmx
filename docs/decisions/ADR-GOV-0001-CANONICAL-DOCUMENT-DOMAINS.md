# ADR-GOV-0001 · Dominios canónicos del corpus documental

**Estado:** Approved

**Fecha de decisión:** 2026-07-21

**Tipo:** Governance Architecture Decision Record

**Owner:** Founder (decisión) · Núcleo de Gobernanza (mantenimiento)

**Documentos relacionados:** `docs/governance/00-CANON.md`, `03-DOCUMENTATION-STANDARD.md`, `06-BLUEPRINT-MASTER-INDEX.md`, `07-BLUEPRINT-DEPENDENCY-MAP.md`, `08-KNOWLEDGE-GRAPH.md`

## 1. Contexto

El ledger probatorio cerró la adjudicación documental de 439 archivos, pero `06` conservaba todas las asignaciones como `Pending canonical assignment`. Sin un vocabulario estable de dominios, `07` y `08` no podían derivar accountability, dependencias e impactos sin introducir clasificaciones incompatibles.

## 2. Decisión

Se adoptan catorce dominios primarios, mutuamente exclusivos para fines de accountability documental. Cada fila de `06` recibe exactamente un dominio primario. Las relaciones transversales se representan después como aristas en `07`; no se duplican owners en `06`.

| ID | Dominio | Responsabilidad | Documentos |
|---|---|---|---:|
| `D01` | `product-governance` | Visión, políticas, decisiones, roadmap y control documental | 31 |
| `D02` | `platform-foundation` | Arquitectura, infraestructura, datos base, integraciones y release | 20 |
| `D03` | `identity-security` | Identidad, autenticación, autorización, privacidad y confianza | 45 |
| `D04` | `content-experience` | CMS, Experience Builder, diseño, marca y composición de superficies | 76 |
| `D05` | `destination-discovery` | Descubrimiento territorial, navegación y superficies públicas | 35 |
| `D06` | `marketplace-commerce` | Catálogo comercial, marketplace, promociones, pagos y monetización | 23 |
| `D07` | `provider-operations` | Portal empresarial, onboarding y operación de prestadores | 24 |
| `D08` | `traveler-lifecycle` | Plan, workspace, continuidad, viaje en curso, memoria y PWA | 52 |
| `D09` | `concierge-service` | Casos, solicitudes, cotizaciones, propuestas y operación Concierge | 29 |
| `D10` | `alux-ai` | Alux, IA, recomendación y asistencia inteligente | 16 |
| `D11` | `visitor-intelligence` | Eventos, estado, segmentación, métricas y decisión basada en datos | 28 |
| `D12` | `engagement-notifications` | Notificaciones, mensajería y comunicación transaccional | 14 |
| `D13` | `media-delivery` | Activos, imágenes, variantes, almacenamiento y entrega multimedia | 29 |
| `D14` | `growth-reliability` | SEO, performance, observabilidad, QA de experiencia y readiness | 17 |
|  | **Total** |  | **439** |

## 3. Reglas vinculantes

1. Un documento tiene un solo dominio primario.
2. Blueprints, addenda, reportes y evidencia heredan el dominio de la capacidad que gobiernan o demuestran.
3. Los documentos transversales se asignan al dominio accountable por la decisión; sus impactos secundarios viven como aristas en `07`.
4. El nombre o número de serie no determina por sí solo el dominio.
5. No existe dominio `misc`, `other` ni `pending`.
6. Cambiar el dominio de una fila requiere evidencia, decisión registrada y actualización coordinada de `06–08`.
7. La suma de documentos entre dominios debe coincidir con el universo vigente de `06`.

## 4. Alternativas consideradas

### A. Catorce dominios primarios exclusivos — adoptada

Hace explícito el accountability, permite validación determinista y evita duplicar ownership.

### B. Dominios múltiples por documento — descartada

Confunde responsabilidad primaria con impacto transversal y vuelve ambiguas las métricas de cobertura.

### C. Taxonomía abierta o dominio genérico — descartada

Reduce la utilidad del índice y convierte los casos difíciles en deuda permanente.

### D. Diferir la decisión hasta completar `07` — descartada

Mantendría el bloqueo circular: `07` necesita una fuente estable de IDs, estados y dominios antes de derivarse.

## 5. Secuencia de autoridad

La secuencia canónica queda establecida así:

1. `ADR-GOV-0001` define dominios y reglas.
2. `06` proyecta las 439 asignaciones y recibe aprobación Founder como base congelada.
3. `07` se deriva desde la última versión aprobada de `06`.
4. `08` se deriva desde `06` y `07` aprobados.

La aprobación o completitud de `07` **no** es precondición para aprobar `06`. Esta regla elimina el bloqueo circular sin relajar los controles de evidencia de `07`.

## 6. Consecuencias

- `06` puede cerrar su gate de dominio con 439/439 asignaciones.
- `07` recibe una base estable y no necesita inventar dominios.
- `08` podrá modelar conocimiento con IDs y ownership consistentes.
- Una reclasificación futura será un cambio gobernado, no una edición silenciosa.
- Este ADR no aprueba `06`, no puebla `07`, no construye `08` y no autoriza cambios de código o producción.

## 7. Evidencia de autoridad

El Founder aprobó expresamente el 2026-07-21 la taxonomía de 14 dominios y la asignación recomendada de las 439 filas, y autorizó preparar localmente su formalización canónica. Esta decisión no autoriza publicación en GitHub ni modificación de `07–08`.

## 8. Revisión futura

Revisar este ADR sólo cuando cambie materialmente el universo documental, aparezca una capacidad que no pueda adjudicarse con las reglas vigentes o una auditoría demuestre conflicto sistemático de accountability.
