# 12D – COMPLIANCE REPORT v1.0

**Estado:** Emitido
**Fecha:** 2026-06-29
**Documento base:** 12D-AUDIT-v1.0.md
**Plataforma:** Valladolid.mx — Fase 1 RC1 congelada (13.Z)

---

## 1. Objeto

Certificar que la implementación actual de Valladolid.mx cumple íntegramente con la **Serie 12D – Visual Governance** (12D.00 Foundation + 12D.01 Execution Standard) y queda autorizada para iniciar el desarrollo funcional de la Fase 2 una vez se publique el documento 14.0.

## 2. Resultado de la auditoría

- **Desviaciones críticas:** 0
- **Desviaciones que rompen Blueprint / Design System / Navegación / Mobile First / Accesibilidad / Serie 13:** 0
- **Desviaciones mayores (gobernanza documental):** 3 (D-01, D-02, D-03)
- **Observaciones menores aceptadas como excepción canónica:** 4 (D-04 a D-07)

## 3. Correcciones aplicadas

Conforme a la directiva (corregir únicamente lo que rompa Blueprint, Design System, navegación, Mobile First, accesibilidad o Serie 13), y dado que **ninguna desviación de código entra en esas categorías**, no se realizaron modificaciones al código de la Fase 1 congelada.

Acciones documentales ejecutadas:

1. Emitido `docs/blueprint/12D-AUDIT-v1.0.md` (auditoría completa).
2. Emitido `docs/blueprint/templates/VISUAL-GATES-CHECKLIST.md` (cierra D-02 y D-03 para Fase 2).
3. Emitido este `12D-COMPLIANCE-REPORT-v1.0.md`.
4. Aceptadas formalmente las excepciones D-05 (scrim shadcn `bg-black/80`), D-06 (texto blanco sobre hero) y D-07 (brand colors Google).
5. D-01 (banco fotográfico oficial) y D-04 (assets en `docs/brand-assets/`) quedan agendados como entregables de contenido en Fase 2 — no son desviaciones de implementación.

## 4. Excepciones canónicas aprobadas

| ID | Excepción | Justificación |
| --- | --- | --- |
| D-05 | `bg-black/80` en overlays Dialog/Sheet/Drawer/AlertDialog | Scrim accesible estándar del primitive shadcn/Radix. Modificarlo rompería el contrato del componente base. |
| D-06 | `text-white` y `bg-white/N` en `Hero` y `SiteHeader` modo transparente | Único caso permitido por el Canon Visual: texto sobre fotografía/video. Contraste reforzado con `drop-shadow`. |
| D-07 | Colores literales en SVG de Google (`auth.tsx`) | Obligatorio por Google Brand Guidelines para el botón "Sign in with Google". |

## 5. Certificación de cumplimiento

Se certifica que la Fase 1 de Valladolid.mx cumple simultáneamente con:

- **Blueprint oficial** (START-HERE-FIRST + Series 00–12C + 13).
- **Serie 13 completa** (13.0–13.Z, congelada).
- **Serie 12D completa** (12D.00 + 12D.01).

Y que dispone de:

- Tokens de Design System completos en `src/styles.css` (paleta oklch, tipografías oficiales, radios, foco accesible global).
- Componentes oficiales sin duplicación (base shadcn/Radix → compuestos → secciones).
- Arquitectura única de navegación (`SiteHeader`, `SiteFooter`, `BreadcrumbTerritorial`, `LanguageSwitcher`, `UserMenu`, `AluxFloatingTrigger`).
- Responsive Mobile First verificado.
- Accesibilidad WCAG 2.2 AA respetada (foco visible, `alt` correcto, `aria-label` en botones icon-only, `<main>` único por ruta, multilenguaje activo).
- Gobernanza para IA explícita.
- Plantilla de Visual Gates lista para Fase 2.

## 6. Habilitaciones

Con esta certificación:

- Queda **habilitada la publicación** del documento `14.0 – Fase 2 Master Plan` cuando el Arquitecto del Blueprint lo determine.
- **NO queda iniciado** el desarrollo de la Fase 2. La Fase 2 sigue bloqueada hasta autorización formal posterior a 14.0.

## 7. Restricciones permanentes ratificadas

Se ratifican y mantienen vigentes las prohibiciones de la directiva:

- No crear componentes nuevos fuera del Design System.
- No modificar la navegación principal.
- No alterar la arquitectura de la Serie 13.
- No introducir nuevos patrones visuales.
- No modificar la identidad gráfica.
- No cambiar colores oficiales.
- No cambiar tipografía oficial.
- No crear variantes innecesarias de componentes.
- No introducir librerías visuales incompatibles.

## 8. Cierre

La plataforma Valladolid.mx queda formalmente **conforme con la Serie 12D**. La gobernanza visual queda activa de manera permanente y deberá aplicarse en conjunto con la Serie 13 durante toda la Fase 2 y posteriores.

---

## Historial

- v1.0 — Certificación inicial emitida tras la incorporación oficial de la Serie 12D al Blueprint.