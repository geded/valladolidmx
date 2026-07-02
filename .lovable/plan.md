
# Segunda iteración del editor: Hero completo, botones flexibles, chips útiles y drag & drop real

## Diagnóstico rápido de lo que reportas

1. **Hero:** los textos ya son editables pero se ven "fijos" — no puedes vaciar el eslogan/eyebrow (cae al valor por defecto en cuanto lo borras). Y los **botones no se pueden eliminar** ni reordenar — están hardcodeados en el componente aunque escondas la etiqueta.
2. **Chips `i18n` / `SEO` en Profesional:** aparecen como badges pero **no abren nada**. Son sólo un letrero. Falta la acción real (idiomas alternos, meta title/description por bloque).
3. **Drag & drop:** hoy sólo reordena **secciones completas** (arriba/abajo). No mueve botones ni tarjetas dentro de una sección.
4. **Header:** ya es editable (menú y CTA), pero está escondido — sólo se selecciona haciendo click en la zona superior, y no hay indicador claro de "esto es el header, click para editar".

## Fixes de esta historia

### 1) Hero totalmente maleable
- Convertir "eyebrow / title / subtitle" en **campos vacíos-permitidos**: si borras el contenido, se queda vacío (no vuelve al default).
- **CTAs como lista** (0 a 3 botones), cada uno con: etiqueta, enlace, estilo (`primario | secundario | fantasma`), ícono opcional, orden.
- **Buscador del Hero** con toggle "mostrar / ocultar".
- El componente `Hero.tsx` renderiza los CTAs desde `config.ctas[]`; fallback a los 2 actuales sólo cuando el array es `undefined` (retrocompatible).

### 2) Chips `i18n` y `SEO` reales en Profesional
- **i18n:** al pulsar el chip de un campo `translatable`, abre un mini-panel con pestañas de idiomas (es/en/pt/fr/it/de) para escribir la traducción. Se guarda en un objeto `{ es: "...", en: "..." }` y el renderer elige según el locale activo.
- **SEO:** en Profesional aparece una sección "SEO de esta página" con `title`, `description`, `og:image`. Se guarda en `tree.chrome.seo` y `__root.tsx` ya soporta head dinámico.
- Chip que no tiene acción (por ahora, `datos`, `cache`) se convierte en tooltip informativo, no botón.

### 3) Drag & drop más fino
- Extender `SortableContext` a los **elementos hijos** de listas estructuradas del inspector (por ejemplo la lista de CTAs del Hero o los items de menú del header) — hoy sólo tienen flechas ↑↓, agrego handle de arrastre.
- Añadir **drop-hints visuales** (línea azul) al arrastrar secciones para que se vea claramente dónde va a caer.
- No implemento "arrastrar bloque del canvas a otra sección" (requiere refactor del árbol) — queda documentado para siguiente historia.

### 4) Header y Footer visibles y editables
- Envolver header/footer del canvas en un **contorno punteado + etiqueta flotante** ("Encabezado del sitio · click para editar" / "Pie de página · click para editar") que aparece al hover.
- Al hacer click, abre el inspector con el contrato que ya existe (menú, CTA, idioma).
- Añadir un botón directo en la barra superior del studio: "Editar encabezado" y "Editar pie" para acceso rápido sin buscar.

### 5) Hydration mismatch del eslogan
Se corrige de paso: normalizo `hero.eyebrow` a "Experiencias que emocionan" en `es.json` (hoy tiene texto con extras que no coinciden con SSR).

## Fuera de alcance (explícito)
- Editor visual DENTRO del canvas (in-place editing de texto sin abrir inspector).
- Arrastrar bloques entre secciones distintas.
- Constructor de formularios con lógica condicional (el bloque form ya existe, mejoras avanzadas después).
- Historial visual con thumbnails (queda como lista).

## Archivos que voy a tocar
- `src/components/home/Hero.tsx` — CTAs como lista, toggle buscador, campos vacíos-permitidos.
- `src/lib/experience-builder/block-library.ts` — contrato Hero extendido; SEO fields en chrome.
- `src/lib/experience-builder/composition-renderer.tsx` — mapear ctas y toggle buscador.
- `src/components/experience-builder/AutoInspector.tsx` — chip i18n abre panel de idiomas, drag handles en listas.
- `src/components/experience-builder/VisualStudio.tsx` — botones "Editar header/footer", contornos hover, panel SEO en profesional.
- `src/i18n/locales/es.json` — normalizar `hero.eyebrow`.

## Verificación
1. En el Hero puedes eliminar los dos botones y guardar → se ve el Hero sin botones.
2. Puedes agregar un tercer botón "Reservar" con estilo fantasma y aparece en la web.
3. En Profesional, click en chip `i18n` de "eyebrow" abre pestañas de idiomas.
4. En Profesional, aparece panel SEO con title/description que edita el `<head>` publicado.
5. Al hover del header en el canvas, ves el contorno y puedes hacer click para editar el menú.
6. Al arrastrar items del menú, se ve una línea azul indicando el drop.

¿Sigo con esto o quieres recortar/agregar algo antes de que lo implemente?
