# Fase 0 — Fundaciones Valladolid.mx (plan final aprobado + reglas de ejecución)

## Reglas de ejecución durante el desarrollo

1. Si surge una decisión importante de UX/arquitectura/estructura no cubierta por el Blueprint, **detener y consultar** antes de implementar.
2. Componentes desacoplados y reutilizables — nada hardcodeado a "Oriente Maya" o "Valladolid"; región/destino siempre vía props/mock.
3. Cada componente importante lleva comentario JSDoc con propósito, responsabilidades y dependencias.
4. Arquitectura preparada para **múltiples regiones turísticas** (jerarquía País→Estado→Región→Destino, mocks tipados, rutas `/oriente-maya/...` con región como parámetro lógico).
5. Cero deuda técnica deliberada. Si aparece una solución mejor compatible con el Blueprint, reportarla antes de implementarla.

## Dos ajustes finales (ya incorporados)

- **Service Worker preparado pero no activo:** `src/pwa/register-sw.ts` como wrapper inerte documentado, llamado desde `__root.tsx` con guardas de preview/iframe/dev. Cero `sw.js`, cero registro real, cero rompimiento de preview. Listo para activar en fase futura cuando se requiera offline.
- **Tipografía 100% centralizada:** `--font-display`, `--font-sans`, `--font-mono` definidos en `@theme inline`. Body y headings reciben la familia desde `@layer base` en `src/styles.css`. Cero `font-family` literal en componentes.

## Restricciones oficiales

- ❌ Sin Lovable Cloud, BD, RLS, auth real, CMS, paneles, Alux IA, integraciones, lógica real de Arma tu Viaje.
- ❌ Sin imágenes IA como definitivas — placeholders sobrios con gradientes territoriales oklch preparados para reemplazo con fotografía real.
- ❌ Sin Service Worker activo. Solo manifest.

## Orden Home (Doc 12)

Hero → Destinos → Categorías → Rutas sugeridas → Consejo Alux → Arma tu Viaje → Oriente Maya EN VIVO → Empresas recomendadas → Reseñas → Footer. Hero inspira primero; buscador discreto.

## Visible desde Fase 0

Acceso AYV, presencia Alux (flotante deshabilitado + sección + ruta), landing Empresas, breadcrumb territorial, `LanguageSwitcher` (6 idiomas UI), `UserMenu` preparado para 6 roles.

## Archivos a crear/modificar

**Design system**
- `src/styles.css` — tokens oklch (Valladolid cálido + selva + cenote + caliza + atardecer), fuentes centralizadas, utilities `placeholder-territorio/cenote/selva`, dark mode.

**Shell + layout**
- `src/routes/__root.tsx` — head con Fraunces + Inter vía `<link>`, manifest, theme-color; envuelve `I18nProvider` + `SiteHeader` + `<Outlet/>` + `SiteFooter` + `AluxFloatingTrigger`.
- `src/router.tsx` — añadir `defaultErrorComponent`.
- `src/components/layout/`: `SiteHeader`, `SiteFooter`, `BreadcrumbTerritorial`, `LanguageSwitcher`, `UserMenu`, `AluxFloatingTrigger`, `Container`.

**Home**
- `src/routes/index.tsx` — orquesta secciones.
- `src/components/home/`: `Hero`, `DestinosSection`, `CategoriasSection`, `RutasSection`, `ConsejoAluxSection`, `ArmaTuViajeSection`, `EnVivoSection`, `EmpresasSection`, `ResenasSection`.
- `src/components/cards/`: `DestinoCard`, `RutaCard`, `CategoriaCard`, `ResenaCard` (con botón "+ Arma tu Viaje" deshabilitado y tooltip "Disponible próximamente").
- `src/components/common/`: `PlaceholderImage`, `PageShell`, `SectionHeader`, `ComingSoonBadge`.

**Rutas base** (cada una con `head()` único)
- `oriente-maya/index.tsx`, `oriente-maya/$destino.tsx`
- `experiencias.tsx`, `hoteles.tsx`, `restaurantes.tsx`, `eventos.tsx`
- `arma-tu-viaje.tsx`, `alux.tsx`, `empresas.tsx`, `auth.tsx`

**Tipos y config** (alineados a 11.5, preparados para multi-región)
- `src/types/territory.ts` (Country/State/TourismRegion/Destination), `src/types/auth.ts` (enum 6 roles), `src/types/entities.ts`.
- `src/config/languages.ts`, `src/config/site.ts`, `src/config/regions.ts`.

**i18n**
- `src/i18n/context.tsx` + hook `useTranslation`.
- `src/i18n/locales/{es,en,fr,de,it,pt}.json`.

**Mocks (snake_case + UUID)**
- `src/mocks/{destinos,categorias,rutas,resenas,empresas}.ts`.

**PWA**
- `public/manifest.webmanifest`, `public/icon-192.svg`, `public/icon-512.svg`, `public/apple-touch-icon.svg`.
- `public/robots.txt`, `public/sitemap.xml` (esqueleto).
- `src/pwa/register-sw.ts` — wrapper inerte con guardas, documentado.

## Criterios de aceptación

- Home moderna mobile-first, 10 secciones en orden Doc 12.
- Todas las rutas con `head()` único.
- LanguageSwitcher cambia UI entre 6 idiomas.
- Manifest válido, iconos SVG, instalable.
- Cero colores y fuentes hardcodeados.
- Tipos y mocks alineados a serie 11 y a multi-región.

## Entregable final

Resumen ejecutivo · archivos creados · componentes · rutas · decisiones visuales · capturas Playwright de Home (desktop + mobile) y rutas internas · pendientes Fase 1 · observaciones técnicas y consultas pendientes para el usuario.
