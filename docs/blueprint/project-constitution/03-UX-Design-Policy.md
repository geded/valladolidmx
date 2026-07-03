# 03 · UX & Design Policy

**Versión:** 1.0 · Oficial
**Fuente consolidada:** `05-BRAND-AND-DESIGN-PHILOSOPHY.md`, `09-UX-UI-DESIGN-SYSTEM.md`, `12-HOME-MASTER-EXPERIENCE.md`, `12A..12C.2`, `12D.00`, `12D.01`, `15.10.5a` (Workspace Foundations), `15.10.5b` (Contextual Layer), `15.10.5d` (Discovery Layer), memoria Core.

---

## 1. Home como puerta de entrada del ecosistema

La Home representa al **Oriente Maya de Yucatán**, no únicamente a Valladolid. Es el punto de partida narrativo y funcional del viajero.

## 2. Hero protagonista

El Hero es siempre el elemento visual dominante de la Home. Ningún bloque secundario puede competir con él en jerarquía.

## 3. Mega Menú premium · Header elegante

El Header y el Mega Menú son componentes de nivel premium. La versión actual (v1 estática) es la oficial hasta que se ejecute la Iniciativa `15.10.8`.

## 4. Responsive First · Mobile First · Touch First · PWA First

Todo diseño se concibe primero para móvil y superficie táctil. Cero regresiones en superficies existentes.

## 5. Workspace Style

Toda superficie autenticada usa la estética y comportamiento del **Workspace Engine**: sidebars, topbars, inspectors, command palette, sheets, gestos y toasts uniformes.

## 6. Separación de responsabilidades

- **CMS** controla el contenido.
- **Experience Builder** controla la presentación.
- El código controla los contratos y la lógica.

## 7. No navegación por bloques internos del Home

La Home **no** es un índice de anclas internas. Cada sección real del ecosistema tiene su propia ruta pública dedicada.

## 8. Espacio en blanco como principio de diseño

El espacio en blanco es componente activo del diseño, no residuo.

## 9. Jerarquía visual clara

Toda superficie declara una jerarquía inequívoca: título primario, subtítulos, acciones primarias y secundarias, contenido, metadatos.

## 10. Interaction Consistency & State Preservation

Gestos, selección, sheets, inspector, palette, undo, toasts y navegación contextual se comportan **idénticos** en toda la plataforma. Se preservan workspace activo, vista, contexto, selección, inspector, sheets, scroll, búsquedas, filtros y ordenamientos siempre que sea técnicamente posible.

## 11. Shared Design System

Discovery y Workspace comparten tokens, componentes y lenguaje visual, con motores de navegación independientes (`PublicShell` vs `WorkspaceShell`).

---

## Regla operativa

Cualquier propuesta visual/UX debe validar: (a) reutiliza tokens y componentes existentes, (b) preserva jerarquía Hero-primero, (c) mantiene consistencia de interacción, (d) no rompe el Workspace Style.

---

## Conflictos pendientes de decisión del Founder

Ninguno al momento de esta versión.