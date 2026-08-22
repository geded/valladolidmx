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
| G3-H01 | Responsive 390 px: sin overflow ni pérdida de función                                                                                    | PASS | Validación humana iPad Safari 2026-08-22 sobre `/cms/experience-builder?mode=visual&page=home`, modo Móvil: scroll vertical real dentro del canvas, encabezado visible y `sticky`, sin recorte derecho, buscador y botón completos. Evidencia automática de apoyo: `canvas-viewport/canvas-noscale-metrics.json` (390: overflowX 0). |
| G3-H02 | Responsive 768 px: sin overflow ni pérdida de función                                                                                    | PASS | Validación humana iPad Safari 2026-08-22, modo Tablet: scroll vertical real, encabezado visible y `sticky`, sin overflow interno, buscador completo. Evidencia automática: `canvas-viewport/canvas-noscale-metrics.json` (768: overflowX 0). |
| G3-H03 | Responsive 1024 px: sin overflow ni pérdida de función                                                                                   | BLOCKED | pendiente: la sesión 2026-08-22 validó 390/768/1280; falta ejecutar 1024 px. |
| G3-H04 | Responsive 1440 px: sin overflow ni pérdida de función                                                                                   | BLOCKED | pendiente: la sesión 2026-08-22 validó Desktop a 1280 px (encabezado `sticky`, sin desbordamiento interno del sitio, ancho excedente gestionado por desplazamiento horizontal del contenedor del editor, sin escalado del iframe); falta ejecutar 1440 px. |
| G3-H05 | Zoom 200 % y reflow 320 CSS px utilizables                                                                                               | BLOCKED | pendiente                 |
| G3-H06 | Flujo completo por teclado, foco visible, orden lógico y sin trampa                                                                      | BLOCKED | pendiente                 |
| G3-H07 | Lector real: VoiceOver/Safari, NVDA o TalkBack según dispositivo disponible                                                              | BLOCKED | pendiente                 |
| G3-H08 | Touch: controles principales operables y sin dependencia de hover                                                                        | PASS | Grabación humana iPad Safari 2026-08-21 (`human-session-2026-08-21/G3-H08-ipad-safari-2026-08-21.mp4`, sha256 `30e01a4b…65ea3`, 22.7 s): operación táctil real sobre `/cms/experience-builder?mode=visual&page=home` sin dependencia de hover. Evidencia complementaria en la misma grabación: cambio entre Móvil, Tablet y Desktop con scroll real dentro del canvas y encabezado `sticky` visible. No aplicable a G3-H05, G3-H07, G3-H11 ni G3-H12. |
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

### Defectos cerrados

- **DEF-G3-001 · Canvas del Experience Builder sin encabezado y con desbordamiento horizontal en vista previa Móvil.**
  **CLOSED (2026-08-22)** por validación humana repetida en iPad Safari sobre
  `/cms/experience-builder?mode=visual&page=home`: Móvil PASS, Tablet PASS y
  Desktop PASS, con scroll vertical real dentro del canvas, encabezado visible y
  `sticky`, sin recorte del buscador y sin desbordamiento interno del sitio. En
  Desktop el ancho excedente se gestiona con desplazamiento horizontal del
  contenedor del editor, sin escalar el iframe.
  Historial: **REOPENED** tras validación humana real en iPad Safari: el encabezado volvía
  a desaparecer después del scroll y el botón circular del buscador quedaba
  recortado en el borde derecho.
  Causa raíz A: el header `overlay` observaba `window.scrollY` del documento del
  editor y el `transform: scale` del canvas rompía `sticky`. Causa raíz B: las
  media queries se resolvían contra el viewport real del navegador y no contra
  el ancho simulado del marco.
  Causa raíz confirmada al reabrir: el `SiteHeader` estaba contenido por el
  wrapper editorial `InertChrome`, cuya altura terminaba junto con el header;
  `position: sticky` no puede desplazarse fuera de los límites de ese ancestro.
  El buscador, aunque el documento medía 390 px, conservaba mínimos intrínsecos
  en sus hijos flex y desplazaba el botón 6 px fuera de su caja.
  Remediación dentro de 18.54/PCA-2026-020: el wrapper del encabezado participa
  como sticky y el documento aislado normaliza `min-width: 0`/`max-width: 100%`
  exclusivamente para el buscador canónico, sin duplicarlo ni sustituirlo.
  La evidencia automática previa queda invalidada como prueba de aceptación
  humana y debe regenerarse con capturas reales antes/después del scroll en
  390, 768 y 1280 px.
  Remediación final aplicada (2026-08-22): se elimina por completo
  `transform: scale` del iframe y todo dimensionado compensatorio; el canvas usa
  viewports reales de 390/768/1280 px y el contenedor del editor desplaza
  horizontalmente cuando el editor es más angosto. Además, `@container` se
  separa del elemento `sticky` de `SiteHeader` y se traslada a un wrapper
  interno, porque la contención de contenedor invalida `position: sticky` en
  Safari (iPad) dentro del scrollport del iframe.
  Scrollport utilizado por `sticky`: documento del propio iframe.
  Medición automática tras scroll real (`canvas-noscale-metrics.json`):
  | Dispositivo | innerWidth | Overflow X | Header `top` | Header visible | `position` | Botón buscador contenido |
  | ----------- | ---------- | ---------- | ------------ | -------------- | ---------- | ------------------------ |
  | Móvil       | 390        | 0 px       | 0            | Sí             | `sticky`   | Sí (right 166.5)         |
  | Tablet      | 768        | 0 px       | 0            | Sí             | `sticky`   | Sí (right 191.5)         |
  | Desktop     | 1280       | 0 px       | 0            | Sí             | `sticky`   | Sí (right 199.5)         |
  Estado del defecto: **CLOSED** (validación humana repetida 2026-08-22, iPad
  Safari, Móvil/Tablet/Desktop PASS).
  Estado de aceptación del gate: **G3 permanece `BLOCKED`** por escenarios
  humanos aún no ejecutados (G3-H03, G3-H04, G3-H05, G3-H06, G3-H07, G3-H09,
  G3-H10) y por G3-H11/G3-H12 en `PARTIAL`. El cierre de DEF-G3-001 no cubre
  esos escenarios y la regla de cierre de la sección 1 exige los doce en `PASS`
  con evidencia verificable.

### 6.1 Registro de grabación humana (G3-H08)

| Campo | Valor |
| ----- | ----- |
| Nombre original | `ScreenRecording_08-21-2026_19-29-52_1.mp4` |
| Nombre archivado | `G3-H08-ipad-safari-2026-08-21.mp4` |
| Ruta de evidencia | `docs/governance/evidence/omxds-i4-d-g3/human-session-2026-08-21/` (puntero `.asset.json` + `HUMAN-RECORDING-MANIFEST.json`) |
| Fecha de captura | 2026-08-21 19:29:52 (UTC-6) · archivado 2026-08-22 |
| SHA-256 | `30e01a4bd2578e10fae78a91421bc8a31f8ff6dd7d40a8b72be63a8ba8565ea3` |
| Tamaño / duración | 37 429 385 bytes · 22.71 s · HEVC 2420×1668 |
| Dispositivo / superficie | iPad Safari · `/cms/experience-builder?mode=visual&page=home` |
| Alcance probatorio | G3-H08 `PASS`; evidencia complementaria de Móvil/Tablet/Desktop con scroll real y encabezado `sticky`. |
| No válido para | G3-H05, G3-H07, G3-H11, G3-H12 |

El binario original se conserva íntegro (inmutable) mediante puntero CDN; no se altera ni recodifica.



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
