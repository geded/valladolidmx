# I4-D · G3 · Adenda de admisibilidad de evidencia objetiva reproducible v1.0

**Estado:** Approved · **Autoridad:** Founder Directive 2026-08-22 («MODO CIERRE I4-D — SIN MÁS PRUEBAS REDUNDANTES»)
**Alcance:** exclusivamente documental. No modifica código funcional, no activa flags, no toca producción.
**FLAG:** `omxds_visual_v1_contracts_enabled=false` · **G3:** BLOCKED

## 1. Problema resuelto

La sección 4 del Acceptance Report exigía validación humana para los doce escenarios
`G3-H01…G3-H12`. Dos de ellos (`G3-H03` 1024 px y `G3-H04` 1440 px) son **inejecutables
por un humano** en la superficie disponible: el Studio expone únicamente Móvil (390),
Tablet (768) y Desktop (1280). Exigir evidencia humana imposible bloquea el gate sin
aumentar la calidad de la aceptación.

## 2. Regla de admisibilidad (mínima)

Un escenario `G3-H*` puede acreditarse con **evidencia objetiva reproducible** cuando
cumple, de forma simultánea, las cinco condiciones siguientes:

1. **Determinista y mecánico**: el criterio se expresa como medición numérica o
   comparación estructural (px de overflow, `position` computado, igualdad de
   encabezados/CTAs, presencia de indicador de foco), sin juicio perceptual humano.
2. **No ejecutable humanamente** en la superficie disponible, o ejecutable con
   resultado idéntico y sin aportar información adicional.
3. **Reproducible**: existe script y artefacto versionado con parámetros exactos.
4. **Archivada**: JSON de métricas + capturas bajo
   `docs/governance/evidence/omxds-i4-d-g3/`.
5. **Declarada como objetiva**, nunca como humana, en la propia fila del reporte.

Quedan **excluidos** de esta regla y siguen exigiendo humano: percepción asistida
(lector de pantalla), interacción nativa del sistema operativo (zoom de Safari),
autorización real entre dos cuentas distintas y verificación de seguridad/permiso.

## 3. Escenarios acreditados por esta adenda

| ID     | Criterio                        | Evidencia objetiva                                                        | Por qué no humano |
| ------ | ------------------------------- | ------------------------------------------------------------------------- | ----------------- |
| G3-H03 | Responsive 1024 px              | `objective-2026-08-22-h03h04/canvas-exact-widths.json` + capturas          | El Studio no ofrece 1024 px |
| G3-H04 | Responsive 1440 px              | `objective-2026-08-22-h03h04/canvas-exact-widths.json` + capturas          | El Studio no ofrece 1440 px |
| G3-H06 | Teclado: foco, orden, sin trampa| `objective-2026-08-22/security_a11y.json` (25 tabs, 17 paradas, 0 sin indicador, sin trampa) | iPad Safari sin teclado físico en la sesión; criterio mecánico |
| G3-H09 | Tema Sol conserva contenido     | `objective-2026-08-22/themes.json` (1024/1440: mismos headings, mismo CTA count/hash, overflowX 0) | Comparación estructural exacta |
| G3-H10 | Tema Luna conserva contenido    | `objective-2026-08-22/themes.json`                                        | Comparación estructural exacta |

## 4. Escenarios que siguen exigiendo humano

`G3-H05` (zoom nativo de Safari 200 % / reflow 320 px), `G3-H07` (VoiceOver),
`G3-H11` (flujo Draft→Published con dos cuentas reales, conflicto, auditoría y
rollback) y `G3-H12` (autorización y seguridad). `G3-H01`, `G3-H02` y `G3-H08` ya
están acreditados humanamente.

## 5. Efecto

Esta adenda **no cierra G3**. G3 pasa a `PASS` únicamente cuando `G3-H05`, `G3-H07`,
`G3-H11` y `G3-H12` estén en `PASS` con evidencia humana legítima, con `Open P0: 0`
y `Open P1: 0`.
