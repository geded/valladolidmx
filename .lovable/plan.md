
# Header editable global — botones del sitio configurables desde el Studio

## Qué vas a poder hacer al terminar

En el Studio (Experience Builder) abrirás un panel nuevo llamado **"Header del sitio"** con:

- Lista de botones actuales (Arma tu Viaje, ES/Idioma, Iniciar sesión, Menú).
- **Reordenar** arrastrando.
- **Ocultar/mostrar** cada uno.
- **Editar** etiqueta, ícono, enlace y estilo (primario / secundario / fantasma) del botón.
- **Agregar** botones nuevos con etiqueta + ícono + link + estilo.
- Al publicar, aplica a **todo el sitio** (Home, Destinos, Empresas, etc.), no solo a Home.

## Cómo funciona por debajo (resumen técnico)

Hoy el `SiteHeader` está hardcodeado dentro de `PublicShell` y solo acepta `config` opcional (no persistido). La composición del Experience Builder solo edita el *contenido* dentro del shell, no el shell mismo — por eso hoy no puedes tocar el Header.

Para hacerlo editable-global, se introduce un concepto de **"Site Chrome"**: una configuración única por sitio, separada de las composiciones de página, que el `PublicShell` lee y aplica a todas las rutas.

```text
┌─────────────────────────────────────────────────────────┐
│  site_chrome (nuevo)  ← una fila publicada por sitio    │
│    header.buttons[]  ← array reordenable                │
│    header.nav[]                                         │
└─────────────────────────────────────────────────────────┘
        ↓ leído por PublicShell (SSR)
┌─────────────────────────────────────────────────────────┐
│  <PublicShell>  →  <SiteHeader config={chrome.header} />│
│    (todas las rutas públicas)                           │
└─────────────────────────────────────────────────────────┘
        ↑ editado desde
┌─────────────────────────────────────────────────────────┐
│  Studio → "Header del sitio" (panel nuevo)              │
│    drag&drop de botones, add/remove, publicar           │
└─────────────────────────────────────────────────────────┘
```

## Alcance del trabajo

### 1. Backend (Lovable Cloud)
- Nueva tabla `site_chrome` con `draft_config` (jsonb) + `published_config` (jsonb) + `updated_at` + revisiones.
- RLS: lectura pública (`anon`) del `published_config`; escritura solo `admin` / `super_admin`.
- Server functions:
  - `getPublishedSiteChrome()` — público, SSR-safe.
  - `getDraftSiteChrome()` — admin.
  - `updateDraftSiteChrome(config)` — admin, con autosave.
  - `publishSiteChrome()` — admin, snapshot a `published_config` + revisión.

### 2. Contrato del botón (schema JSON)
Cada botón del header es un objeto:
- `id` (uuid estable), `kind` (`cta` | `language` | `user_menu` | `menu_toggle` | `custom_link`), `label`, `href`, `icon` (nombre lucide), `variant` (`primary`/`secondary`/`ghost`/`solid-light`), `visible` (bool), `order`.
- Los "sistema" (`language`, `user_menu`, `menu_toggle`) no se pueden borrar, solo ocultar y reordenar.
- Los `cta` y `custom_link` sí se pueden crear y borrar.

### 3. SiteHeader refactor
- Recibe `config.buttons[]` en lugar de props hardcodeadas.
- Recorre el array en orden y renderiza cada tipo con su variante visual.
- Mantiene compatibilidad: si no hay config, usa fallback actual (nada rompe).

### 4. PublicShell
- Loader del root (`__root.tsx`) hace `ensureQueryData(publishedSiteChromeQuery)`.
- Pasa `chrome.header` a `<SiteHeader config={...} />`.
- Si falla la lectura, cae al fallback → sitio nunca se cae.

### 5. Studio — panel "Header del sitio"
- Nuevo item en el sidebar del Experience Builder junto a "Páginas".
- UI: lista drag&drop (dnd-kit ya está en el proyecto), botón "Agregar botón", inspector lateral para editar cada uno (label, href, ícono con picker de lucide, variant).
- Autosave a `updateDraftSiteChrome`.
- Botón "Publicar" reutiliza el mismo patrón del publish existente.

### 6. Preview del Studio
- Mientras editas, el preview del Studio consume `draft_config` (no publicado) para que veas los cambios en vivo.
- El sitio público (`/`, `/oriente-maya`, etc.) consume `published_config`.

## Reglas de arquitectura respetadas

- **Single Studio Principle**: no se crea Studio nuevo — se añade un panel dentro del Experience Builder existente.
- **Workspace First / Discovery First**: el Header es Discovery Layer; se edita desde el Studio pero se renderiza vía `PublicShell` (sin regresiones).
- **Infrastructure Freeze**: no se crean engines, providers ni registries nuevos — se reutiliza el patrón `page_compositions` / `page_revisions` para `site_chrome`.
- **Explainable by Default**: el panel muestra qué botones son sistema (no borrables) y por qué.
- **Build Once, Reuse Everywhere**: el mismo mecanismo servirá luego para editar el Footer, favicon, cookies, etc.

## Riesgos y notas

- **Restricción a "Home"**: descartada; el Header es chrome global, meterlo en la composición de Home crearía divergencia entre páginas.
- **Botón "Iniciar sesión" vs `UserMenu`**: hoy `UserMenu` cambia según si estás logueado (login/perfil). Se mantiene ese comportamiento; el toggle solo controla si el bloque de usuario aparece.
- **Idioma (ES)**: es funcional (dispara `i18n`). Se mantiene como botón sistema con toggle de visibilidad.
- **SEO**: sin impacto; sigue siendo el mismo HTML, solo cambia qué botones se pintan.

## Fuera de alcance de esta historia

- Editar el logo (se hará como historia siguiente si lo pides).
- Editar Footer (misma arquitectura, historia aparte).
- Editar colores/tokens del tema (existe otro flujo).
- Menú móvil personalizado por rol (solo la versión actual, con los mismos botones).

## Entregable

Al final tendrás en el Studio un panel **"Header del sitio"** con drag&drop, add/remove, edición completa de cada botón, autosave y publicar. Los cambios aplican a todas las páginas públicas del sitio tras publicar.
