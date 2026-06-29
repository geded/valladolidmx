# 12D – AUDIT v1.0

**Estado:** Emitido
**Fecha:** 2026-06-29
**Alcance:** Auditoría completa de la plataforma Valladolid.mx contra la Serie 12D (12D.00 Visual Governance Foundation + 12D.01 Visual Execution Standard).
**Base auditada:** Fase 1 RC1 congelada (Bloques A–E, documento 13.Z-FASE-1-CLOSURE-v1.0).

---

## 1. Metodología

1. Lectura íntegra del Blueprint en el orden obligatorio (START-HERE-FIRST → Serie 00–10 → 11 → 12 / 12A / 12B / 12C.0–C.2 → Serie 13 → 12D.00 → 12D.01).
2. Revisión de la implementación actual en `src/` y `docs/blueprint/`.
3. Comparación 1:1 contra cada capítulo de 12D.00 (caps. 1–7) y 12D.01 (caps. 8–15).
4. Clasificación por capítulo: **Cumple / Cumple parcialmente / No cumple / No aplica**.
5. Ninguna modificación de código durante esta etapa — solo evidencia documental.

---

## 2. Resumen ejecutivo

| Eje 12D | Estado |
| --- | --- |
| Filosofía del producto (12D.00 cap.2) | Cumple |
| Principios UX (cap.3) | Cumple |
| Canon Visual (cap.4) | Cumple |
| Dirección de Arte (cap.5) | Cumple parcialmente (banco fotográfico oficial pendiente — Fase 2) |
| Sistema de Navegación (cap.6) | Cumple |
| Sistema de Componentes (cap.7) | Cumple |
| Responsive Mobile First (12D.01 cap.8) | Cumple |
| Accesibilidad WCAG 2.2 AA (cap.9) | Cumple |
| Gobernanza para IA (cap.10) | Cumple |
| Antipatrones (cap.11) | Cumple |
| Visual Decision Gates (cap.12) | Cumple parcialmente (proceso definido, ausencia de checklist trazable por pantalla) |
| Definition of Done Visual (cap.13) | Cumple parcialmente (DoD funcional ya cubierto por Gates A–E; falta marca explícita por pantalla) |
| Gobernanza y Evolución (cap.14) | Cumple |
| Disposiciones Finales (cap.15) | Cumple |

**Veredicto global:** La implementación de la Fase 1 está **sustancialmente alineada** con la Serie 12D. **No se detectaron desviaciones críticas** que rompan Blueprint, Design System, navegación, Mobile First, accesibilidad o Serie 13. Solo se identifican brechas de gobernanza documental que se resuelven con artefactos (no con código).

---

## 3. Cumplimientos verificados

### 3.1 Filosofía y Canon Visual (12D.00 cap.2 y cap.4)
- Identidad como guía local / concierge digital, no como directorio ni OTA: copy del Home, secciones (`DestinosSection`, `RutasSection`, `ConsejoAluxSection`, `ArmaTuViajeSection`) lo reflejan.
- Un protagonista por pantalla, jerarquía clara, espacios generosos: verificable en `src/components/home/*` y `PageShell`.
- Tipografía oficial centralizada en `src/styles.css` (`--font-display: Fraunces`, `--font-sans: Inter`, `--font-script: Tangerine`). **Ningún componente declara font-family literal.**
- Paleta oficial en tokens oklch (`--primary` Ocre Valladolid, `--accent` Cenote Profundo, `--selva`, `--caliza`, `--atardecer`). No hay colores corporativos hardcodeados fuera de:
  - íconos de marca Google (`auth.tsx`) — obligatorio por brand guidelines de terceros.
  - overlays `bg-black/80` en primitives shadcn (Dialog, Sheet, Drawer, AlertDialog) — patrón estándar de scrim accesible.
  - texto blanco en `Hero` y `SiteHeader` modo transparente — único caso permitido porque va sobre media de hero (contraste reforzado con `drop-shadow`).

### 3.2 Principios UX y Mobile First (12D.00 cap.3 / 12D.01 cap.8)
- Viewport configurado, breakpoints `sm/md/lg` aplicados consistentemente.
- Header (`SiteHeader.tsx`) con menú móvil dedicado y CTAs táctiles `min-h-11`.
- Hero responsive escalado tipográfico `text-[1.875rem] → sm:text-[2.75rem] → md:text-[3.5rem] → lg:text-[4rem]`.
- Carruseles y grids fluyen single-column en móvil.

### 3.3 Sistema de Navegación (12D.00 cap.6)
- Arquitectura única: `SiteHeader` + `SiteFooter` + `BreadcrumbTerritorial` aplicados desde `__root.tsx` a TODO el árbol (Home, micrositios, auth, alux, arma tu viaje, CMS futuro).
- `LanguageSwitcher` y `UserMenu` consistentes entre módulos.
- Rutas tipadas por TanStack Router (`routeTree.gen.ts`).
- Sin navegación paralela ni duplicada.

### 3.4 Sistema de Componentes (12D.00 cap.7)
- Jerarquía respetada:
  1. **Tokens**: `src/styles.css` (@theme inline + :root + .dark).
  2. **Base**: `src/components/ui/*` (shadcn/Radix).
  3. **Compuestos**: `src/components/cards/*`, `src/components/common/*`.
  4. **Secciones**: `src/components/home/*`.
- **Sin duplicación**: una sola `Hero`, un solo `SiteHeader`, una sola `EmpresaCard`, etc.

### 3.5 Accesibilidad (12D.01 cap.9)
- Foco visible global declarado en `@layer base` (`:focus-visible { outline: 2px solid var(--color-ring); }`).
- Imágenes con `alt` adecuado: contenido informativo (`DestinoCard`) describe destino + tagline; decorativo (`Hero` background) usa `alt=""`; logo (`BrandLogo`) usa `SITE.name`.
- `<main id="main">` único por ruta (Home + `PageShell` para el resto). El `<main>` interno de `src/components/ui/sidebar.tsx` es del primitive shadcn y NO se monta en árbol público.
- Soporte multi-idioma activo (`src/i18n/locales/*` con es/en/fr/de/it/pt).
- Botones icon-only (UserMenu, LanguageSwitcher, AluxFloatingTrigger) llevan `aria-label`.
- Contrastes verificados sobre paleta oklch oficial (cap. 4 de la paleta oficial ya validada en Fase 0).

### 3.6 Gobernanza para IA (12D.01 cap.10) y Antipatrones (cap.11)
- Reglas declaradas en `docs/blueprint/13.0-Fase-1-Governance` y `13.0A-Execution-Roadmap`.
- Sin componentes hardcoded con contenido fijo de Valladolid: configuración movida a `src/config/site.ts`, `src/config/regions.ts`, `src/config/languages.ts`.
- Sin librería visual incompatible introducida; stack restringido a Tailwind v4 + shadcn/Radix.
- Mocks (`src/mocks/*`) marcados explícitamente como contractuales de Fase 0, no como deuda.

### 3.7 Gobernanza y Evolución (12D.01 cap.14)
- Blueprint versionado en `docs/blueprint/` con jerarquía documental viva.
- Reportes Gate A–E firmados (13.A–13.E) + cierre 13.Z.
- Migraciones SQL versionadas con convención numérica (13.A-MIGRATIONS-CONVENTIONS).

---

## 4. Desviaciones (clasificadas)

### 4.1 Críticas — `No cumple`
**Ninguna detectada.** La Fase 1 no rompe Blueprint, Design System, navegación, Mobile First, accesibilidad ni Serie 13.

### 4.2 Mayores — `Cumple parcialmente` con impacto medio
| ID | Capítulo 12D | Hallazgo | Riesgo | Recomendación |
| --- | --- | --- | --- | --- |
| D-01 | 12D.00 cap.5 (Dirección de Arte) | El Home y los micrositios renderizan placeholders (gradientes territoriales + `PlaceholderImage`) en lugar de fotografía auténtica del Oriente Maya. | Identidad visual queda atenuada hasta entrega del banco fotográfico oficial. | Resolver en Fase 2 con la entrega del banco fotográfico curado (gestionado desde el CMS de Bloque D). **No es desviación de implementación**, es entrega pendiente de contenido. |
| D-02 | 12D.01 cap.12 (Visual Decision Gates) | Los 9 Gates Visuales (Identidad / UX / Componentes / Responsive / Accesibilidad / Rendimiento / CMS / IA / Calidad Visual) están descritos pero no existe checklist por pantalla en el repositorio. | Riesgo bajo en Fase 1 (sin pantallas nuevas), crítico al iniciar Fase 2. | Crear plantilla `docs/blueprint/templates/VISUAL-GATES-CHECKLIST.md` y aplicarla obligatoriamente desde el primer entregable de Fase 2. |
| D-03 | 12D.01 cap.13 (Definition of Done Visual) | El DoD funcional de la Serie 13 cubre las dimensiones técnicas, pero no incluye marca explícita "Visual DoD aprobado" por pantalla. | Riesgo bajo. | Integrar la marca Visual DoD en el reporte de cada Gate de Fase 2 (no requiere cambios de código). |

### 4.3 Menores — observaciones documentales
| ID | Hallazgo | Acción |
| --- | --- | --- |
| D-04 | Existen 5 archivos `.gitkeep` en `docs/brand-assets/photography/*` y `colors|fonts|icons|logos|social/.gitkeep` esperando los activos oficiales. | Acción en Fase 2 al recibir el banco oficial. Sin impacto técnico. |
| D-05 | `bg-black/80` en overlays shadcn (Dialog/Sheet/Drawer/AlertDialog) es color literal pero corresponde al token de **scrim accesible** estándar del primitive. | Aceptado. Documentado como excepción permitida por compatibilidad con shadcn/Radix. |
| D-06 | Texto blanco sobre hero (`text-white` en `Hero.tsx` y `SiteHeader.tsx` modo transparente). | Aceptado. Único caso permitido por canon visual (texto sobre fotografía/video); contraste reforzado con `drop-shadow`. |
| D-07 | SVG de Google (`auth.tsx`) usa colores literales `#4285F4 #34A853 #FBBC05 #EA4335`. | Obligatorio por brand guidelines de terceros (Google Sign-In). No modificar. |

---

## 5. Riesgos

- **R-1 (medio):** Iniciar Fase 2 sin checklist trazable de Visual Decision Gates abre la puerta a regresiones visuales. *Mitigación:* artefacto D-02 antes del primer entregable de Fase 2.
- **R-2 (bajo):** Demora en banco fotográfico oficial perpetúa la presencia de placeholders. *Mitigación:* prioridad alta en CMS de Fase 2.
- **R-3 (bajo):** Componentes futuros pueden reintroducir literales `text-gray-*` o `bg-white` si nuevos contribuyentes desconocen el canon. *Mitigación:* regla de lint + recordatorio en plantilla de Visual Gates.

---

## 6. Recomendaciones

1. Emitir plantilla `VISUAL-GATES-CHECKLIST.md` (D-02) **antes** de cualquier desarrollo de Fase 2.
2. Aceptar formalmente las excepciones D-05, D-06 y D-07 como parte del canon vivo (overlays shadcn, texto sobre media, brand de terceros).
3. Mantener congeladas la paleta oficial, las fuentes oficiales y la arquitectura de navegación. Cualquier cambio requiere nueva versión del Blueprint.
4. No introducir librerías de UI adicionales (queda excluido cualquier kit que duplique shadcn/Radix).

---

## 7. Impacto estimado de las correcciones

- **Código:** **0 cambios** requeridos para alinear la Fase 1 con la Serie 12D.
- **Documentación:** 1 plantilla nueva (Visual Gates Checklist) + este reporte + reporte de cumplimiento.
- **Esfuerzo:** bajo (gobernanza documental, no implementación).
- **Riesgo de regresión:** nulo (no se toca código de Fase 1 congelada).

---

## 8. Conclusión de la auditoría

La Fase 1 de Valladolid.mx **cumple sustancialmente con la Serie 12D**. Las brechas detectadas son de gobernanza documental, no de implementación, y se resuelven sin tocar la base de código congelada en 13.Z.

Procede emitir el documento `12D-COMPLIANCE-REPORT-v1.0.md` certificando la conformidad antes de habilitar el documento `14.0 – Fase 2 Master Plan`.

---

## Historial

- v1.0 — Auditoría inicial posterior al cierre oficial de la Fase 1 (Gate E aprobado, 13.Z congelado).