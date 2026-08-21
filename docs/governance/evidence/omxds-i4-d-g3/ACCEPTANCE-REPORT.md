# I4-D · G3 Integration & Evidence Closure · ACCEPTANCE REPORT

**Gate:** G3  
**Initiative:** I4-D · G3 Integration & Evidence Closure  
**Base exacta:** `main@d02942d07b9fc96e9a39f1faf4bbafb28ec7a5c2`  
**Rama:** `feature/omxds-i4-d-g3-integration-evidence-closure-v1`  
**Entorno permitido:** no público, datos totalmente ficticios  
**Verdict:** BLOCKED  
**Open P0:** UNASSESSED  
**Open P1:** UNASSESSED

## 1. Regla de cierre

Este reporte es la autoridad humana de aceptación para G3. La automatización puede demostrar contratos y regresión, pero **no puede convertir el gate a PASS por sí sola**. G3 sólo puede quedar en `PASS` cuando:

1. todos los escenarios `G3-H01` a `G3-H12` estén en `PASS`;
2. exista evidencia verificable para cada escenario;
3. `Open P0: 0` y `Open P1: 0`;
4. la suite automatizada I4-D y la validación canónica completa estén en PASS;
5. no se utilicen producción, despliegue, datos reales, flag ON, Premium ni Commerce.

`PASS WITH CONDITIONS` no cierra G3.

## 2. Slice vertical canónico

El slice de I4-D utiliza exclusivamente capacidades ya cerradas por I4-A/B/C y su reconciliación:

- bloque authorable: `vmx.experience.section`;
- binding gobernado read-only: `vmx.experience.info-grid` → `geography.location`;
- preview no público mediante `/preview/composition/$token`;
- workflow Draft → Review → Approved → Published;
- separación autor–aprobador;
- conflicto/concurrencia reproducible;
- auditoría;
- rollback como nuevo Draft con revalidación de fuente actual.

No se autoriza crear arquitectura paralela ni corregir producto dentro de I4-D.

## 3. Evidencia automatizada/inheredada

| Criterio                                | Estado  | Evidencia                                                                               |
| --------------------------------------- | ------- | --------------------------------------------------------------------------------------- |
| EBG-01–04                               | PASS    | I4-A + I4-R: allowlist, legacy confinement y `geography.location`                       |
| EBG-05–09                               | PASS    | I4-B: workflow, snapshot aprobado, separación autor/aprobador y preview sin publicación |
| EBG-10–13                               | PASS    | I4-C + I4-R: CAS, rollback, IA bajo revisión y auditoría                                |
| SEC-04/08/09                            | PASS    | evidencia I4-C vigente                                                                  |
| Preview noindex/fail-closed             | PASS    | ruta canónica `/preview/composition/$token` + I4-R                                      |
| Sol/Luna y 390/768/1024/1440 declarados | PASS    | policy I4-0 vigente                                                                     |
| Harness I4-D                            | BLOCKED | pendiente ejecutar `bun run test:i4:d` sobre el paquete final                           |
| Governance Integrity                    | BLOCKED | pendiente paquete final y validación completa                                           |

## 4. Validación humana obligatoria

Completar únicamente en entorno no público con datos ficticios. Para cada fila, registrar referencia de captura/video/log y observaciones. No cambiar a PASS sin ejecutar el escenario.

| ID     | Escenario                                                                                                                                | Estado  | Evidencia / observaciones |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------- |
| G3-H01 | Responsive 390 px: sin overflow ni pérdida de función                                                                                    | BLOCKED | pendiente                 |
| G3-H02 | Responsive 768 px: sin overflow ni pérdida de función                                                                                    | BLOCKED | pendiente                 |
| G3-H03 | Responsive 1024 px: sin overflow ni pérdida de función                                                                                   | BLOCKED | pendiente                 |
| G3-H04 | Responsive 1440 px: sin overflow ni pérdida de función                                                                                   | BLOCKED | pendiente                 |
| G3-H05 | Zoom 200 % y reflow 320 CSS px utilizables                                                                                               | BLOCKED | pendiente                 |
| G3-H06 | Flujo completo por teclado, foco visible, orden lógico y sin trampa                                                                      | BLOCKED | pendiente                 |
| G3-H07 | Lector real: VoiceOver/Safari, NVDA o TalkBack según dispositivo disponible                                                              | BLOCKED | pendiente                 |
| G3-H08 | Touch: controles principales operables y sin dependencia de hover                                                                        | BLOCKED | pendiente                 |
| G3-H09 | Tema Sol conserva contenido, orden, CTA y estado                                                                                         | BLOCKED | pendiente                 |
| G3-H10 | Tema Luna conserva contenido, orden, CTA y estado                                                                                        | BLOCKED | pendiente                 |
| G3-H11 | Slice vertical completo: authorable + binding + preview + Draft→Published + autor/aprobador distintos + conflicto + auditoría + rollback | PARTIAL | Sesión humana 2026-08-21 (entorno no público): el administrador abrió Experience Builder y cargaron las composiciones Inicio y Hoteles. Faltan Draft→Published, separación autor/aprobador, conflicto, auditoría y rollback. |
| G3-H12 | Seguridad: operaciones sensibles con actor autorizado, preview sin PII/secrets y fallo gobernado fail-closed                             | PARTIAL | Sesión humana 2026-08-21 (entorno no público, flag OFF): «Añadir sección» no ofreció Info Grid y la búsqueda «Info» tampoco lo mostró. Falta verificar actor autorizado en operaciones sensibles, ausencia de PII/secrets en preview y fallo gobernado fail-closed. |

## 5. Registro del escenario G3-H11

Completar con datos ficticios:

- Identificador de composición ficticia: `PENDIENTE`
- Slug ficticio: `PENDIENTE`
- Autor de prueba: `PENDIENTE`
- Aprobador distinto: `PENDIENTE`
- Snapshot/hash aprobado: `PENDIENTE`
- Conflicto reproducido: `PENDIENTE`
- Evento de auditoría verificado: `PENDIENTE`
- Rollback a nuevo Draft verificado: `PENDIENTE`
- Fuente `geography.location` revalidada: `PENDIENTE`

## 6. Hallazgos

### P0 abiertos

`UNASSESSED`

### P1 abiertos

`UNASSESSED`

### P2/P3

Registrar aquí sin bloquear G3 salvo que el criterio canónico indique lo contrario.

### Defectos corregidos (no convierten ningún escenario en PASS)

- **DEF-G3-001 · Canvas del Experience Builder sin encabezado y con desbordamiento horizontal en vista previa Móvil.**
  Detectado como `FAIL` real durante la preparación de G3 (escenario móvil).
  Causa raíz A: el header `overlay` observaba `window.scrollY` del documento del
  editor y el `transform: scale` del canvas rompía `sticky`. Causa raíz B: las
  media queries se resolvían contra el viewport real del navegador y no contra
  el ancho simulado del marco.
  Remediación canónica: viewport aislado con `<iframe>` de anchos reales
  (390/768/1280) más observación del scroll sobre la ventana propietaria del
  header. Autorización `PCA-2026-020`, blueprint `18.54`.
  Evidencia automática: `docs/governance/evidence/omxds-i4-d-g3/canvas-viewport/`
  (`canvas-viewport-metrics.json`, capturas por dispositivo): overflow horizontal
  `0 px` y encabezado visible y `sticky` en Móvil, Tablet y Desktop, con paridad
  medida frente al sitio público a 390 px.
  Estado de aceptación: **G3 permanece `BLOCKED`**; la validación humana debe
  repetirse sobre el canvas remediado.


## 7. Prohibiciones observadas

- producción: no utilizada;
- despliegue: no autorizado;
- datos reales: prohibidos;
- `omxds_visual_v1_contracts_enabled`: permanece `false`;
- Premium: fuera de alcance;
- Commerce: fuera de alcance;
- rutas públicas nuevas: ninguna.

## 8. Cierre

Mientras cualquier escenario permanezca `BLOCKED`, o P0/P1 no sean exactamente cero, el veredicto de este documento debe permanecer `BLOCKED` y `validate:i4:d` debe fallar en cerrado.
