# 06 · BLUEPRINT MASTER INDEX

**Estado:** Review Candidate
**Versión:** 1.0-rc1
**Última actualización:** 2026-07-20
**Autoridad:** inventario; no altera estados definidos por el roadmap, decisiones o evidencia.

## 1. Propósito

Este documento es el catálogo canónico del portafolio documental de Valladolid.mx. Permite distinguir autoridad vigente, diseño, implementación, evidencia, historia y trabajo diferido sin asumir que la existencia de un archivo demuestra aprobación o cierre.

## 2. Reglas de lectura

1. La precedencia está definida por [`README.md`](./README.md).
2. El estado de producto vigente procede de [`16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`](../blueprint/16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md).
3. Un Blueprint expresa intención; un Completion/Closure Report aporta evidencia técnica.
4. Producción requiere además integración, despliegue y smoke cuando corresponda.
5. Un documento histórico no se borra: se clasifica y se enlaza con su sucesor.
6. “Familia inventariada” significa que todos los archivos raíz con ese prefijo quedan cubiertos por la fila; no asigna a cada archivo el mismo estado.

## 3. Taxonomía del inventario

| Clase | Significado |
| --- | --- |
| Governance | Regla de autoridad o estándar transversal. |
| Roadmap | Prioridad y gates vigentes. |
| Blueprint | Diseño o propuesta previa a implementación. |
| ADR/Decision | Decisión y consecuencias. |
| Plan/Addendum | Secuencia o ampliación de alcance subordinada. |
| Audit/Research | Hallazgo; no autoriza implementación por sí mismo. |
| Completion/Closure | Evidencia de entrega; puede conservar condiciones. |
| Guide/Runbook | Operación o uso de una capacidad existente. |
| Historical | Conservado para trazabilidad; no gobierna ejecución vigente. |

## 4. Portafolio vigente y evidencia principal

| Capacidad | Diseño/autoridad | Implementación/evidencia | Estado rector | Observación |
| --- | --- | --- | --- | --- |
| Gobernanza documental | `docs/governance/00–05` | auditorías de `docs/governance/audit/` | Approved | `06–08` son esta capa de referencia y requieren aprobación Founder. |
| Roadmap único | `16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md` | `.lovable/plan.md` | Vigente | Sustituye la priorización de roadmaps históricos. |
| CMS/Experience Builder | Serie `14`, `15.10`, Single Studio | cierres `14.*.Z`, `15.10.4d`, `15.10.H-*` | Cerrado/histórico según roadmap | Auditorías previas no prevalecen sobre cierres posteriores. |
| Navigation/Discovery | `15.10.5d`, `15.11` | Completion Reports `15.11`, Serie `16.01–16.09` | Cerrado | Rutas legacy pueden persistir sólo como compatibilidad. |
| Arma tu Viaje | Serie `16.10–16.15` | Completion Reports asociados | Cerrado | Fuente productiva de planeación autenticada. |
| Google Auth | `16.23-E1b` | Completion Report `16.23-E1b` | Cerrado | Producción confirmada por roadmap. |
| Trust/Profile | `16.21`, `16.22` | Closure Reports asociados | Cerrado / cierre técnico | Onboarding técnico no equivale a cohorte real. |
| CV5 Workspace | `16.CV5*` | `16.CV5-COMPLETION-REPORT-v1.0.md` | Cerrado | Barrido visual móvil permanece fuera de alcance. |
| CV6 Live Companion | `16.CV6*` | `16.CV6-LIVE-DESTINATION-COMPANION-CLOSURE-REPORT-v1.0.md` | Cerrado y aprobado | Incluye O1/O2. |
| CV7 Travel Memory | `16.CV7-TRAVEL-MEMORY-LOOP-v1.0.md` | sin Completion Report | Blueprint/diferido | Sólo se abre por gate del roadmap. |
| CV8 Visitor Intelligence | `16.CV8.0–CV8.9` | Completion Reports CV8 + PR #2–#4 | CV8.9 cerrado; CV8.0–8.8 con condiciones | Datos simulados no son tracción real. |
| AC1 continuidad anónima | `16.AC1*` | Completion Report AC1.4–1.5 + PR #5–#7 | Cerrado | Importación, dock y producción verificados. |
| Programa Fundadores | `17.1-PROGRAMA-FUNDADORES-VALLADOLID-OPERATING-PLAN-v1.0.md` | futuro Completion Report | Propuesto para GO | Operación real; no requiere plataforma paralela. |
| Performance H0–H2 | `18.H0`, `18.H1`, benchmark H2 | reportes y benchmark aislado | Mixto | La cifra H2 −15% no es canónica; benchmark registra ~−0.09% gzip. |
| Media H3 | `18.H3*` | M0–M2.3.1 reports | Cierre técnico | Flags/read-path según cada fase; no inferir activación global. |
| SEO/GEO | `SEO.*`, `18.H1`, certificación | Completion Reports A1–A3 | GO con condiciones | GSC, dominio, ALT, hreflang y editorial conservan decisiones explícitas. |
| MCP | `19.MCP-M1.0*` | Completion Report M1.0 | M1.0 cerrado | M1.1–M1.3 diferidos. |

## 5. Inventario exhaustivo por familia

El repositorio contiene 424 documentos Markdown en la raíz de `docs/blueprint/` al corte. Las siguientes familias cubren ese universo por prefijo y función.

| Familia | Cobertura | Clasificación predominante | Autoridad actual |
| --- | --- | --- | --- |
| `00–10` | visión, arquitectura, información, dominio, marca, identidad, CMS, Alux, diseño y glosario históricos | Foundation/Historical | Subordinada a `docs/governance/00–05`. |
| `11.*` | arquitectura, esquema y estándares de base de datos | Specification | Vigente salvo contrato/migración posterior. |
| `12*` | Home, arte visual y gobernanza visual | Blueprint/Audit | Histórica; componentes vigentes se verifican en código/cierres. |
| `13.*` | Fase 1, dominio, cloud, identidad, CMS y QA | Governance/Closure histórica | Base fundacional; subordinada a gobernanza actual. |
| `14.*` | olas CMS, contenido, portal, marketplace, notificaciones y Concierge | Plan/Addendum/Closure | Histórica con evidencia reutilizable. |
| `15.10*` | rebaseline, Experience Builder, Single Studio, plantillas, workspaces, discovery y PWA | Blueprint/Audit/Completion | Estados se resuelven por cierres posteriores y roadmap v2.1. |
| `15.11*` | navegación y deep links | Blueprint/Closure | Cerrado según roadmap. |
| `16.01–16.24` | evolución funcional E1–E7, Trust, Auth, recomendaciones | Blueprint/Completion | Según tabla §4 y roadmap. |
| `16.CV*` | Consumer/Traveler Journey CV0–CV8 | Blueprint/Completion | Según tabla §4 y roadmap. |
| `16.AC*` | continuidad anónima | Blueprint/Completion | AC1.4–1.5 cerrado. |
| `17*` | launch readiness y Programa Fundadores | Assessment/Operating Plan | Condiciona operación y soft launch. |
| `18.*` | performance, SEO baseline y media | Audit/Blueprint/Completion | Mixto; conservar condiciones. |
| `19.*` | MCP | Blueprint/Completion | M1.0 cerrado; expansión diferida. |
| `SEO.*` | schema, metadata, landings y autoridad editorial | Audit/Blueprint/Completion | GO con condiciones; requiere reconciliación específica. |
| `C1*`, `C2*` | optimización y pilotos render-only | Spike/Completion | Patrones cerrados; no justifican expansión automática. |
| `FOUNDER*`, `START*`, índices y plantillas | principios, navegación documental y checklists | Guide/Governance aid | Subordinados a gobernanza y roadmap. |

## 6. Conflictos conocidos que el índice no oculta

| ID | Conflicto | Fuente que prevalece | Acción documental |
| --- | --- | --- | --- |
| IDX-01 | Certificación SEO afirma −15% de H2; benchmark aislado registra ~−0.09% gzip. | Roadmap v2.1 + benchmark. | Corregir certificado sin reescribir el reporte histórico. |
| IDX-02 | Auditorías US-R3 dicen “sin código” aunque existen cierres 2.1–2.6b. | Código + Completion Reports posteriores. | Emitir reconciliación de plantillas. |
| IDX-03 | Marca/sitio principal ValladolidMX y `valladolid.mx` frente a documentos con `quehacerenvalladolid.com` como canónico. | Decisión Founder + CANON cuando se formalice. | Resolver estrategia de dominios SEO antes de cambiar canonicals. |
| IDX-04 | CV4 se describe como narrativo, pero existen capacidades comerciales parciales. | Contratos y evidencia por capacidad. | Auditar sin declarar CV4 completo. |

## 7. Mantenimiento

Toda ola que cambie un estado debe actualizar: roadmap, este índice, mapa `07`, Completion Report y plan operativo. Las filas de familia se revisan cuando aparece un prefijo nuevo; el portafolio §4 se revisa en cada gate del roadmap.

## 8. Control de versiones

| Versión | Fecha | Cambio |
| --- | --- | --- |
| 0.1 | 2026-07-20 | Reserva de función durante reconciliación. |
| 1.0-rc1 | 2026-07-20 | Portafolio vigente, inventario de 424 documentos por familias y conflictos conocidos. |
