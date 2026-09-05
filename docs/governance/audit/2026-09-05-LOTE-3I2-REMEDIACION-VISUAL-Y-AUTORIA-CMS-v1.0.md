# LOTE 3I.2 · Remediación visual y de autoría CMS — `premium-seo-landing`

Rama: `integration/lovable-valladolidmx` · Fecha: 2026-09-05 · Estado: entregado para
validación visual del Founder. Sin publicación, sin sitemap, sin redirects, sin `main`.

## A · Paridad estructural (maqueta vs resultado)

| Sección de la maqueta | Resultado 3I.2 | Estado |
| --- | --- | --- |
| Hero dividido premium (editorial izq. + fotografía der.) | `SeoLandingSurface` §1: `lg:grid-cols-2`, tarjeta única con borde y sombra; móvil/tablet imagen primero con altura controlada (208/288 px) | PASS |
| Hero sin fotografía | Estado editorial compacto ("Fotografía pendiente de acreditación editorial") + columna única; se elimina el degradado gigante rechazado | PASS |
| Campos del hero | eyebrow (destino), título, tipo/subtipo · destino, promesa, descripción, media + alt + punto focal, CTA principal, CTA Mi Viaje, Guardar | PASS |
| Franja de confianza (hasta 4 señales) | §2: icono, etiqueta, valor, fuente/detalle, estado "Por verificar", visibilidad; carrusel en móvil, 2 col. en iPad, 4 en escritorio | PASS |
| "Por qué es extraordinario" + hasta 4 beneficios con icono | §3 bloque `lg:grid-cols-12` (texto 7 / beneficios 5) | PASS |
| "Experiencias destacadas" (relaciones canónicas, imagen, nombre, resumen, etiquetas) | Módulo `md:col-span-2`; sin imagen se muestra el marcador editorial, nunca una inventada | PASS |
| "Información para tu visita" | Módulo de datos prácticos administrables | PASS |
| "Contexto territorial" | Destino, dirección, distancia/proximidad, coordenadas, texto y "Explorar el destino" | PASS |
| Composición 4 columnas escritorio / 2×2 iPad / vertical móvil | `grid md:grid-cols-2 lg:grid-cols-4` | PASS |
| Cierre Alux compacto | Banda secundaria con logo oficial (`AluxMark`), texto administrable y CTA; sin bloque verde dominante | PASS |
| Selectores Editorial/Cinematográfica visibles | Inexistentes (fail-closed en `chrome`) | PASS |

## B · Autoría CMS-first

- `src/lib/experience-builder/seo-landing/seo-landing-editor.functions.ts`
  - `getSeoLandingEditorModel`: lee la composición, sus 18 slots y los medios
    acreditados de la entidad de origen.
  - `saveSeoLandingEditorModel`: reconstruye el árbol con
    `buildSeoLandingComposition` y escribe **sólo** por la RPC gobernada
    `eb_save_composition_draft`. Rechaza composiciones publicadas
    (`seo_landing_edit_requires_draft`) y árboles sin `chrome` de la familia.
- `src/components/cms/SeoLandingContentEditor.tsx`: panel dentro de la
  sección Landing SEO (botón "Editar contenido"). Permite capturar, relacionar,
  ordenar, ocultar y editar: portada (medio desde Medios, alt, punto focal,
  promesa, tipo/subtipo, CTAs), señales de confianza repetibles con estado,
  beneficios repetibles con icono, experiencias relacionadas por identificador
  canónico, información práctica, contexto territorial (incl. coordenadas) y
  cierre Alux. Los módulos se ocultan sin perder contenido.
- La entidad canónica de origen **no se modifica**: la edición vive en el
  borrador de la composición.
- Ampliación puramente aditiva sobre los 18 slots existentes. Sin migración de
  esquema, sin plantilla paralela, sin nueva tabla.

## C · Pilotos regenerados (borrador · `noindex,nofollow`)

| Landing | Vista previa interna verificada |
| --- | --- |
| Zazil Tunich | `/preview/composition/8c632013b86b886d9affdab6ebf4fb81eaa4ddeeb446e45cac509949d89a122d` |
| Chichén Itzá | `/preview/composition/58ed9876c143d6ef74f455f9747c702c92a8edd27f658d6796bfcc3b0a5b2df0` |
| Cenote Suytun | `/preview/composition/2b582e12eb33ea33c982c11ebe1dacf55a892aa394b5c92396c2a56c1fb69a40` |

Zazil Tunich sigue **sin fotografía acreditada asociada**: se muestra el estado
editorial compacto y el selector de medio queda disponible en el CMS para
resolverlo en cuanto exista el activo. Chichén Itzá y Suytun usan sus medios
reales.

## D · QA visual (12 casos)

Anchos 1440 / 834 / 430 / 390 en las tres landings: overflow horizontal 0, un
solo `h1`, 0 imágenes rotas, 0 errores de consola. Capturas en
`/tmp/browser/3i2/{slug}-{ancho}.png`.

## E · Validación técnica

- Typecheck (`tsgo --noEmit`): limpio.
- Lint (`eslint`): 0 errores, 0 advertencias en los archivos tocados.
- Pruebas: 777/777 (5297 aserciones).
- Build de producción: correcto.
- Route Inventory: 247 rutas cubiertas.

## Límites y pendientes

- Los tres pilotos permanecen en borrador `noindex,nofollow`; sin sitemap, sin
  redirects, sin publicación.
- NO VERIFICADO: paridad con la maqueta validada por el Founder (pendiente de
  su revisión visual sobre las tres vistas previas).
- Pendiente heredado de 3I.1: el archivado de landings legacy sigue bloqueado
  por el contrato de estado en la base; requiere autorización explícita.
