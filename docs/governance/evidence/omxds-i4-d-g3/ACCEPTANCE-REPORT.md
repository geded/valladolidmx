# I4-D · G3 Integration & Evidence Closure · ACCEPTANCE REPORT

**Gate:** G3  
**Initiative:** I4-D · G3 Integration & Evidence Closure  
**Base exacta:** `main@d02942d07b9fc96e9a39f1faf4bbafb28ec7a5c2`  
**Rama:** `feature/omxds-i4-d-g3-integration-evidence-closure-v1`  
**Entorno permitido:** no público, datos totalmente ficticios  
**Verdict:** FUNCTIONAL ACCEPTANCE: PASS · OPERATIONAL MULTI-ACTOR ACCEPTANCE: DEFERRED  
**Open P0:** 0  
**Open P1:** 0

> **Decisión Founder 2026-08-22 (MODO CIERRE I4-D):** no se autoriza crear composición
> sandbox adicional ni cuenta editorial artificial. `G3-H11` y `G3-H12` quedan
> registrados como **DEFERRED** con dependencia explícita: *segunda identidad editorial
> real y sesión operativa de aprobación*. No bloquean el avance funcional y visual de
> Valladolid.mx. `G3-H07` continúa pendiente de percepción asistida real (VoiceOver);
> no se fabrica evidencia humana. `validate:i4:d` permanece fail-closed por diseño.

> **Cierre humano 2026-08-25 (I4-D/G3):** el Founder acepta el canvas remediado en
> Móvil, Tablet y Desktop (encabezado sticky PASS, overflow horizontal 0, buscador
> completo, paridad visual con la superficie pública PASS) y declara **DEF-G3-001
> CLOSED/PASS**. Alcance limitado al defecto y a la paridad visual: no cubre G3-H07,
> G3-H11 ni G3-H12. FLAG `omxds_visual_v1_contracts_enabled` permanece OFF y
> producción no fue tocada. No se inicia P0.

## 1. Regla de cierre

Este reporte es la autoridad humana de aceptación para G3. La automatización puede demostrar contratos y regresión, pero **no puede convertir el gate a PASS por sí sola**. G3 sólo puede quedar en `PASS` cuando:

1. todos los escenarios `G3-H01` a `G3-H12` estén en `PASS` (humano u objetivo admisible según `EVIDENCE-ADMISSIBILITY-ADDENDUM-v1.0.md`);
2. exista evidencia verificable y archivada para cada escenario;
3. `Open P0: 0` y `Open P1: 0`;
4. la suite automatizada I4-D y la validación canónica completa estén en PASS;
5. no se utilicen producción, despliegue, datos reales, flag ON, Premium ni Commerce.

`PASS WITH CONDITIONS` no cierra G3. La adenda no sustituye la validación humana de
G3-H07, G3-H11 ni G3-H12. `G3-H05` queda acreditado por evidencia objetiva admisible
ante limitación verificable del dispositivo (sin control de zoom nativo al 200 %),
conforme a la autoridad Founder 2026-08-22 y a la §2 bis de la adenda.


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
| Harness I4-D                            | PASS    | `bun run test:i4:d` 2026-08-25: 5 pass / 0 fail (54 aserciones)                          |
| Governance Integrity                    | PASS    | `bun run governance:sync` + `governance:validate` 2026-08-25: sin fingerprints stale     |

## 4. Validación de escenarios G3-H01…G3-H12

Completar únicamente en entorno no público con datos ficticios. Para cada fila, registrar referencia de captura/video/log y observaciones. No cambiar a PASS sin ejecutar el escenario.

Desde 2026-08-22 rige `EVIDENCE-ADMISSIBILITY-ADDENDUM-v1.0.md` (Founder Directive «MODO CIERRE I4-D»): los escenarios deterministas y mecánicos no ejecutables humanamente en la superficie disponible pueden acreditarse con evidencia objetiva reproducible, declarada como `PASS (objetiva)` y nunca como humana. Percepción asistida, interacción nativa del sistema, autorización entre cuentas y seguridad siguen exigiendo humano.


| ID     | Escenario                                                                                                                                | Estado  | Evidencia / observaciones |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------- |
| G3-H01 | Responsive 390 px: sin overflow ni pérdida de función                                                                                    | PASS | Validación humana iPad Safari 2026-08-22 sobre `/cms/experience-builder?mode=visual&page=home`, modo Móvil: scroll vertical real dentro del canvas, encabezado visible y `sticky`, sin recorte derecho, buscador y botón completos. Evidencia automática de apoyo: `canvas-viewport/canvas-noscale-metrics.json` (390: overflowX 0). |
| G3-H02 | Responsive 768 px: sin overflow ni pérdida de función                                                                                    | PASS | Validación humana iPad Safari 2026-08-22, modo Tablet: scroll vertical real, encabezado visible y `sticky`, sin overflow interno, buscador completo. Evidencia automática: `canvas-viewport/canvas-noscale-metrics.json` (768: overflowX 0). |
| G3-H03 | Responsive 1024 px: sin overflow ni pérdida de función                                                                                   | PASS (humana + objetiva) | Grabación humana iPad Safari 2026-08-21 20:31:45 (UTC-6) (`human-session-2026-08-21/G3-H03-H04-ipad-safari-2026-08-21.mp4`, sha256 `f469ace5…b34f4`, 15.96 s): selección humana del control **1024** y scroll real dentro del canvas con encabezado visible. Combinada con evidencia técnica `objective-2026-08-22-h03h04/canvas-exact-widths.json` — innerWidth 1024, overflowX 0, header `sticky` visible tras scroll (scrollY 933), 0 errores de consola. |
| G3-H04 | Responsive 1440 px: sin overflow ni pérdida de función                                                                                   | PASS (humana + objetiva) | Misma grabación humana (`sha256 f469ace5…b34f4`): selección humana del control **1440** y scroll real dentro del canvas con encabezado visible. Combinada con `objective-2026-08-22-h03h04/canvas-exact-widths.json` — innerWidth 1440, overflowX 0, header `sticky` visible tras scroll, 0 errores de consola. |
| G3-H05 | Zoom 200 % y reflow 320 CSS px utilizables                                                                                               | PASS (objetiva admisible · limitación verificable del dispositivo) | Autoridad Founder 2026-08-22: la interfaz disponible en el iPad de validación no expone control de zoom nativo al 200 % (captura de limitación aportada por el Founder). Los botones 1024/1440 no son equivalentes (cambian viewport, no escala). Evidencia objetiva admisible bajo `EVIDENCE-ADMISSIBILITY-ADDENDUM-v1.0.md` §2: `objective-2026-08-22/objective.json` → `reflow_320` (innerWidth 320, overflowX 0, header `sticky` visible tras scroll) y `zoom200_1440` (1440 CSS px @200 % ≡ 720 px de layout con dpr 2, overflowX 0, header visible), 0 errores de consola. No se declara evidencia humana. |
| G3-H06 | Flujo completo por teclado, foco visible, orden lógico y sin trampa                                                                      | PASS (objetiva) | Acreditado por la adenda §3. Evidencia: `objective-2026-08-22/security_a11y.json` — 25 tabulaciones, 17 paradas únicas, 0 paradas sin indicador de foco, sin trampa de foco. |
| G3-H07 | Lector real: VoiceOver/Safari, NVDA o TalkBack según dispositivo disponible                                                              | BLOCKED | **Requiere humano** (VoiceOver). Bloque 2 del `FINAL-HUMAN-SESSION-RUNBOOK.md`. |
| G3-H08 | Touch: controles principales operables y sin dependencia de hover                                                                        | PASS | Grabación humana iPad Safari 2026-08-21 (`human-session-2026-08-21/G3-H08-ipad-safari-2026-08-21.mp4`, sha256 `30e01a4b…65ea3`, 22.7 s): operación táctil real sobre `/cms/experience-builder?mode=visual&page=home` sin dependencia de hover. Evidencia complementaria en la misma grabación: cambio entre Móvil, Tablet y Desktop con scroll real dentro del canvas y encabezado `sticky` visible. No aplicable a G3-H05, G3-H07, G3-H11 ni G3-H12. |
| G3-H09 | Tema Sol conserva contenido, orden, CTA y estado                                                                                         | PASS (objetiva) | Acreditado por la adenda §3. Evidencia: `objective-2026-08-22/themes.json` — 1024 y 1440: mismos 7 encabezados, mismo conteo/hash de CTAs (58 / 745) que Luna, overflowX 0. |
| G3-H10 | Tema Luna conserva contenido, orden, CTA y estado                                                                                        | PASS (objetiva) | Acreditado por la adenda §3. Evidencia: `objective-2026-08-22/themes.json` — paridad estructural exacta con Sol en 1024 y 1440, overflowX 0, contraste de fondo `oklch(0.329 0.048 129.7)`. |

| G3-H11 | Slice vertical completo: authorable + binding + preview + Draft→Published + autor/aprobador distintos + conflicto + auditoría + rollback | DEFERRED (dependencia: segunda identidad editorial real y sesión operativa de aprobación) | Sesión humana 2026-08-21 (entorno no público): el administrador abrió Experience Builder y cargaron las composiciones Inicio y Hoteles. Faltan Draft→Published, separación autor/aprobador, conflicto, auditoría y rollback. |
| G3-H12 | Seguridad: operaciones sensibles con actor autorizado, preview sin PII/secrets y fallo gobernado fail-closed                             | DEFERRED (dependencia: segunda identidad editorial real y sesión operativa de aprobación) | Sesión humana 2026-08-21 (entorno no público, flag OFF): «Añadir sección» no ofreció Info Grid y la búsqueda «Info» tampoco lo mostró. Falta verificar actor autorizado en operaciones sensibles, ausencia de PII/secrets en preview y fallo gobernado fail-closed. |

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
  Estado del defecto: **CLOSED/PASS** — validación humana Founder 2026-08-25
  (`canvas-viewport/human-validation-2026-08-25.json`): Móvil, Tablet y Desktop con
  encabezado `sticky` PASS, overflow horizontal 0 y buscador completo; paridad visual
  con la superficie pública PASS. Ratifica la validación humana previa 2026-08-22.
  Estado de aceptación del gate: **G3 permanece `BLOCKED`** exclusivamente por los
  escenarios que exigen humano y aún no se han ejecutado: G3-H07 (VoiceOver),
  G3-H11 (dos cuentas) y G3-H12 (autorización y seguridad). G3-H05 queda acreditado
  por evidencia objetiva admisible ante limitación verificable del dispositivo.
  G3-H03 y G3-H04 quedan acreditados como `PASS (humana + objetiva)` con la
  grabación iPad Safari 2026-08-21 20:31:45 (sha256 `f469ace5…b34f4`) combinada con
  `objective-2026-08-22-h03h04/`. G3-H06, G3-H09 y G3-H10 permanecen
  `PASS (objetiva)` bajo `EVIDENCE-ADMISSIBILITY-ADDENDUM-v1.0.md`. El cierre de
  DEF-G3-001 no cubre los escenarios humanos restantes.


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

### 6.2 Registro de grabación humana (G3-H03 · G3-H04)

| Campo | Valor |
| ----- | ----- |
| Nombre original | `ScreenRecording_08-21-2026_20-31-44_1.mp4` |
| Nombre archivado | `G3-H03-H04-ipad-safari-2026-08-21.mp4` |
| Ruta de evidencia | `docs/governance/evidence/omxds-i4-d-g3/human-session-2026-08-21/` (puntero `.asset.json` + `HUMAN-RECORDING-MANIFEST-H03-H04.json`) |
| Fecha de captura | 2026-08-21 20:31:45 (UTC-6) · archivado 2026-08-22 |
| SHA-256 | `f469ace5e387fb180ce62e7fcbed8cea16b649808897ac484fde1dc068fb34f4` |
| Tamaño / duración | 23 555 409 bytes · 15.96 s · HEVC 2420×1668 |
| Dispositivo / superficie | iPad Safari · `/cms/experience-builder?mode=visual&page=home` |
| Alcance probatorio | G3-H03 `PASS` y G3-H04 `PASS`, combinada con `objective-2026-08-22-h03h04/`. |
| No válido para | G3-H05, G3-H06, G3-H07, G3-H08, G3-H09, G3-H10, G3-H11, G3-H12 |

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

**FUNCTIONAL ACCEPTANCE: PASS.** Contratos, workflow heredado (I4-A/B/C/R), responsive
390/768/1024/1440, reflow, teclado, touch y paridad de temas están acreditados con
evidencia humana u objetiva admisible archivada: `G3-H01`, `G3-H02`, `G3-H03`, `G3-H04`,
`G3-H05`, `G3-H06`, `G3-H08`, `G3-H09`, `G3-H10`. Open P0: 0 · Open P1: 0.

**OPERATIONAL MULTI-ACTOR ACCEPTANCE: DEFERRED.** `G3-H11` y `G3-H12` quedan diferidos
por decisión Founder 2026-08-22, con dependencia explícita **«segunda identidad
editorial real y sesión operativa de aprobación»**. No se crea sandbox, ni usuarios, ni
permisos, ni migraciones, ni RPC. `G3-H07` (VoiceOver) permanece pendiente de percepción
asistida real y se ejecutará con `H07-VOICEOVER-MINIMAL-RUNBOOK.md` cuando el Founder lo
disponga.

**Efecto sobre la automatización.** `validate:i4:d` continúa **fail-closed** de forma
intencional: `scripts/omxds/i4/editorial-builder-g3.evidence.mjs` exige `PASS` en los
doce escenarios y no se fabrica ningún `PASS`. El cierre de I4-D es documental y no
convierte G3 en `PASS` automatizado.

**Invariantes mantenidos:** `omxds_visual_v1_contracts_enabled=false`; producción no
tocada; sin despliegue; toda la evidencia previa conservada íntegra.
