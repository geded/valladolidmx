# Auditoría de rebaseline del roadmap · 2026-07-20

**Estado:** Completed
**Versión:** 1.0
**Ámbito:** documentación y priorización; sin cambios de producto, base de datos o infraestructura
**Resultado:** `PRODUCT EVOLUTION ROADMAP v2.1` reemplaza al v2.0 como única hoja de ruta oficial

## 1. Motivo

El roadmap v2.0 fue aprobado el 4 de julio y su changelog terminó el 5 de julio. El repositorio contiene trabajo posterior —CV5, CV6, AC1, CV8, simulación, hardening, media pipeline, MCP y SEO/GEO— que no había sido incorporado a la fuente oficial de priorización. Como consecuencia, `.lovable/plan.md` todavía ordenaba ejecutar MCP M1.0 aunque existe un Completion Report que lo declara cerrado.

La reconciliación también detectó que los porcentajes del roadmap mezclaban clases de evidencia distintas y que una afirmación de performance se propagó sin coincidir con el benchmark aislado.

## 2. Fuentes revisadas

- gobernanza canónica `docs/governance/00–08`;
- roadmap v2.0 y `.lovable/plan.md` anteriores;
- Founder Audit y Founder Launch Readiness Assessment;
- Blueprints y Completion Reports Serie 16, incluyendo CV5–CV8 y AC1;
- Simulation Pack CV8.S;
- reportes H0–H3, C1, C2 y benchmark H2 P1/P2;
- entregables SEO.A1–A3 y SEO Launch Certification;
- MCP M1.0 Completion Report;
- auditorías de gobernanza y recuperación del gestor de paquetes del 20 de julio.

## 3. Hallazgos

| ID   | Hallazgo                                                                                                         | Resolución en v2.1                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| R-01 | El roadmap oficial omitía cierres posteriores al 5 de julio.                                                     | Se incorporó un ledger consolidado por capacidad y evidencia.                                    |
| R-02 | `.lovable/plan.md` trataba MCP M1.0 como siguiente ejecución, aunque está cerrado.                               | M1.0 se registra cerrado; M1.1–M1.3 quedan diferidos sin GO.                                     |
| R-03 | CV4 aparecía en la narrativa de producto, pero su documento declara que no contiene código.                      | Se clasifica como Blueprint/referencia narrativa, no como cierre técnico.                        |
| R-04 | CV8.0–CV8.8 tienen implementación, pero varios reportes mantienen aprobación u outcome en producción pendientes. | Se clasifican como cierre técnico; no como validación real.                                      |
| R-05 | CV8.9 y CV7 tienen Blueprint, no Completion Report.                                                              | CV8.9 queda como próximo hito; CV7 permanece pendiente y condicionado a señal real.              |
| R-06 | AC1.1–AC1.3 están entregados, pero AC1.4 no.                                                                     | AC1 queda parcial avanzado; AC1.4 es el segundo bloqueador técnico.                              |
| R-07 | Onboarding técnico multi-modo podía confundirse con empresas reales operando.                                    | Se separa capacidad técnica de la meta operativa de 15–25 empresas verificadas.                  |
| R-08 | SEO Certification atribuye −15% de entry a H2, pero P1+P2 aislados midieron −0.09% gzip.                         | Se registra contradicción; −15% deja de ser cifra canónica hasta reconciliar baseline y alcance. |
| R-09 | La optimización P1 reduce roundtrips, pero no tiene TTFB medido en producción.                                   | Se conserva como mejora técnica y se evita declarar outcome de TTFB.                             |
| R-10 | Los porcentajes v2.0 no distinguían documento, implementación, aprobación y operación.                           | Se retiran del estado vigente y se reemplazan por estados y gates.                               |
| R-11 | El producto tiene alta cobertura funcional, pero no evidencia de usuarios y oferta reales.                       | La prioridad cambia de expansión de plataforma a soft launch controlado.                         |

## 4. Orden operativo documentado

Orden derivado de la instrucción de reconciliación, el assessment Founder y la evidencia disponible:

1. integrar y verificar la rama de reconciliación;
2. implementar CV8.9;
3. implementar AC1.4;
4. incorporar 15–25 empresas reales y verificadas;
5. cerrar operación mínima de lanzamiento;
6. ejecutar soft launch y medir uso real;
7. decidir CV7 y expansión contra evidencia.

## 5. Cambios documentales

- `16.00-PRODUCT-EVOLUTION-ROADMAP-v2.0.md` se reemplaza por `16.00-PRODUCT-EVOLUTION-ROADMAP-v2.1.md`.
- `.lovable/plan.md` deja de ser el plan MCP M1 y pasa a reflejar la ruta de reconciliación a soft launch.
- Los puntos de entrada de gobernanza y Blueprint enlazan explícitamente al roadmap v2.1.
- El Blueprint Master Index deja de indicar que el rebaseline está pendiente; su inventario exhaustivo continúa en Draft.

## 6. Límites

- No se auditó el comportamiento de producción ni se afirmó que migraciones o servicios externos estén desplegados.
- No se modificó código, esquema, configuración, dependencia ni lockfile.
- No se otorgó GO implícito para CV8.9, AC1.4, MCP M1.1 o CV7.
- Los documentos históricos conservan su contexto; el historial de Git mantiene el roadmap v2.0 sustituido.

## 7. Criterios de aceptación

- [x] Existe un solo roadmap vigente.
- [x] El roadmap distingue intención, cierre técnico, aprobación y operación.
- [x] El plan Lovable está subordinado y coincide con la siguiente decisión.
- [x] Las contradicciones de evidencia quedan explícitas.
- [x] La prioridad se orienta a usuarios, empresas y operación reales.
- [x] `main` permanece sin cambios directos durante la auditoría.
