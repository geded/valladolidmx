
# Reparación del Header desktop (v1.1)

## Contexto oficial

En memoria y en `docs/blueprint/15.10.8-INITIATIVE-HEADER-NAVIGATION-BUILDER-v1.0.md` está registrado que el **Header administrable + Mega Menú desde el Experience Builder** (Iniciativa 15.10.8) queda **bloqueada** hasta cerrar: Arma tu Viaje, Alux, Demo Pack, Google y Stripe.

Mientras tanto, la regla vigente es:

> "Cualquier trabajo sobre Header / Mega Menú anterior a su arranque debe limitarse a **correcciones puntuales** sobre la solución v1."

Por lo tanto **no** vamos a construir aún el Header componible. Vamos a **arreglar la v1** para que sea profesional en desktop, sin tocar la arquitectura ni crear rutas/registries nuevos.

## Diagnóstico del amontonamiento

En `src/components/layout/SiteHeader.tsx` conviven en una sola fila de 64px de alto:

1. Logo (`BrandLogo`)
2. `PrimaryMegaMenu` (7 secciones con dropdowns)
3. Botones: CTA "Arma tu Viaje" + LanguageSwitcher + UserMenu + toggle móvil

En anchos desktop reales (1024–1366) el mega menú y la botonera compiten por el mismo eje horizontal, no hay separación jerárquica y el CTA queda pegado al selector de idioma. Además el menú móvil se muestra hasta `@5xl` (≈1280px), lo que deja rangos 1024–1279 en modo drawer aunque hay espacio.

## Objetivo

Header desktop **profesional, respirado y jerárquico** (referencia: Airbnb / Booking / Visit Mexico) sin cambiar contenido ni comportamiento actual, y sin abrir la Iniciativa 15.10.8.

## Alcance (sólo corrección v1)

1. **Topbar utilitaria (fila superior, 32px)** — sólo desktop `lg+`:
   - Izquierda: idioma + moneda (placeholder v1, sólo idioma real).
   - Derecha: enlaces suaves ("Ayuda", "Contacto", "Empresas").
   - Fondo `bg-muted/40`, texto `text-muted-foreground`, sin sombra.
   - En overlay (Home) se oculta para no romper el Hero.

2. **Fila principal (56–64px)** reorganizada en 3 zonas con grid:
   - Zona A (izquierda): Logo.
   - Zona B (centro): `PrimaryMegaMenu` centrado, con separación real entre items (`gap-6`), chevron sutil, subrayado activo, transición 150ms.
   - Zona C (derecha): UserMenu (avatar) + CTA principal "Arma tu Viaje" destacado.
   - LanguageSwitcher se mueve a la topbar → deja de competir con el CTA.

3. **Breakpoint del drawer móvil**: bajar de `@5xl` a `lg` (1024px). Entre 1024–1279 se ve el menú desktop respirado; debajo, drawer.

4. **Mega Menú (mejoras visuales v1, sin cambiar datos)**:
   - Panel con `shadow-elevated`, `rounded-2xl`, borde `border-border/60`.
   - Grid de columnas con títulos en `text-xs uppercase tracking-wide text-muted-foreground`.
   - Hover con `bg-accent/50` y transición 150ms.
   - Cierre por click-fuera y `Escape` (ya existe, se conserva).

5. **Estados**:
   - Overlay (Home): topbar oculta, fila principal transparente sobre scrim (ya existe).
   - Scrolled: fondo sólido `bg-background/95` + `backdrop-blur` + sombra suave (ya existe, se conserva).
   - Sticky (ya existe, se conserva).

## Fuera de alcance (queda para Iniciativa 15.10.8)

- Header como composición del Experience Builder.
- Mega Menú administrable desde el CMS.
- Visibilidad por rol/idioma/dispositivo/fecha.
- Banners de temporada y promos en menú.
- Registry declarativo de navegación pública.

## Archivos afectados

- `src/components/layout/SiteHeader.tsx` — grid de 3 zonas + integración topbar.
- `src/components/layout/PrimaryMegaMenu.tsx` — spacing, tokens visuales, breakpoint `lg`.
- `src/components/layout/SiteTopBar.tsx` **(nuevo, sólo presentacional)** — topbar utilitaria.
- **Cero** cambios en rutas, registries, BD, contratos, EB, Workspace ni Discovery Layer.

## Memoria a actualizar

Añadir a `mem://roadmap/header-navigation-builder.md` una nota:

> "2026-07-07 — Aplicada corrección puntual v1.1 (topbar + reordenación desktop + breakpoint drawer). Sigue bloqueada la Iniciativa 15.10.8. Al arrancarla, el Header v1.1 se reemplaza completo por composición del EB."

## Validación

- Playwright a 1024, 1280, 1440 y 1920 en `/` (overlay), `/marketplace` (solid) y `/oriente-maya/valladolid` (solid). Screenshots antes/después.
- Móvil 375/414: sin regresiones en drawer.
- Typecheck `bunx tsgo --noEmit`.
- Auditoría: no se importa nada nuevo fuera de `@/components/layout/*`.

## Rollback

Revertir los 3 archivos. Sin migraciones, sin cambios de contrato.

## Entrega en 1 ola

Una sola PR con los 3 archivos + screenshots comparativos + nota en la memoria. Sin dependencias externas.

¿Apruebas este plan para ejecutar la corrección v1.1?
