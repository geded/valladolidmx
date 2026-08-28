# I4-D · G3 · Índice consolidado de evidencia

**FLAG:** `omxds_visual_v1_contracts_enabled=false` · **Producción:** no tocada · **G3:** BLOCKED (funcional PASS · multi-actor DEFERRED)

| Artefacto                                                                      | Contenido                                                                                                                             | Escenarios que acredita                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `canvas-viewport/canvas-noscale-metrics.json`                                  | 390/768/1280 sin transform: overflowX 0, header sticky visible                                                                        | Apoyo H01, H02                                                            |
| `canvas-viewport/canvas-viewport-metrics.json`                                 | Métricas antes/después de scroll por viewport                                                                                         | Apoyo H01, H02                                                            |
| `canvas-viewport/human-validation-2026-08-22.json`                             | Validación humana iPad Safari Móvil/Tablet/Desktop                                                                                    | H01, H02 (humano) · DEF-G3-001 CLOSED                                     |
| `canvas-viewport/human-validation-2026-08-25.json`                             | Aceptación humana Founder del canvas remediado: sticky PASS, overflow 0 y paridad con superficie pública en Móvil/Tablet/Desktop      | DEF-G3-001 **CLOSED/PASS** · refuerzo H01–H04                             |
| `human-session-2026-08-21/HUMAN-RECORDING-MANIFEST.json` + `.mp4`              | Grabación táctil real iPad (sha256 `30e01a4b…65ea3`)                                                                                  | H08 (humano)                                                              |
| `human-session-2026-08-21/HUMAN-RECORDING-MANIFEST-H03-H04.json` + `.mp4`      | Grabación iPad 20:31:45 (sha256 `f469ace5…b34f4`, 15.96 s): controles 1024 y 1440 con scroll real y encabezado visible                | H03, H04 (humano)                                                         |
| `objective-2026-08-22-h03h04/RUN.json` + `canvas-exact-widths.json` + capturas | Viewports exactos 1024 y 1440: overflowX 0, header sticky tras scroll, 0 errores                                                      | H03, H04 (objetiva, combinada)                                            |
| `objective-2026-08-22/security_a11y.json`                                      | Barrido de teclado (25 tabs, 17 paradas, 0 sin foco visible, sin trampa) + preview con token inválido `noindex` y fail-closed sin PII | H06 (objetiva) · apoyo parcial H12                                        |
| `objective-2026-08-22/themes.json`                                             | Paridad estructural Sol/Luna en 1024 y 1440 (headings, CTA count/hash, overflowX 0)                                                   | H09, H10 (objetiva)                                                       |
| `objective-2026-08-22/objective.json`                                          | Reflow 320 px y equivalente de zoom 200 % sin overflow                                                                                | H05 (objetiva admisible · §2 bis, limitación verificable del dispositivo) |
| `EVIDENCE-ADMISSIBILITY-ADDENDUM-v1.0.md`                                      | Regla de admisibilidad de evidencia objetiva                                                                                          | Marco de H03, H04, H06, H09, H10                                          |
| `H07-VOICEOVER-MINIMAL-RUNBOOK.md`                                             | Procedimiento mínimo ejecutable desde iPad (8–10 min)                                                                                 | H07                                                                       |
| `FINAL-HUMAN-SESSION-RUNBOOK.md`                                               | Sesión humana restante                                                                                                                | H07, H11, H12                                                             |

## Estado consolidado

- **PASS humano:** H01, H02, H03, H04, H08.
- **PASS objetiva:** H05 (§2 bis), H06, H09, H10 (H03 y H04 refuerzan con evidencia objetiva combinada).
- **BLOCKED, requiere humano:** H07 (VoiceOver).
- **DEFERRED (Founder 2026-08-22):** H11, H12 — dependencia: segunda identidad editorial real y sesión operativa de aprobación.

**Cierre I4-D:** FUNCTIONAL ACCEPTANCE `PASS` · OPERATIONAL MULTI-ACTOR ACCEPTANCE `DEFERRED`.
`validate:i4:d` permanece fail-closed por diseño; no se fabrica evidencia humana.

**DEF-G3-001:** `CLOSED/PASS` (validación humana Founder 2026-08-25). FLAG OFF · producción no tocada.
