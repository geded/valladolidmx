# Lote 3I.3 · Addendum vinculante — Medios y editabilidad total (v1.0)

Fecha: 2026-09-05 · Rama: `integration/lovable-valladolidmx` · Sin publicar · Pilotos en borrador `noindex,nofollow`.

## 1. Media Library como autoridad

Ningún activo embebido ni URL externa. Todos los activos se resuelven desde
`media_assets` (bucket `studio-media`) mediante el contrato público firmado
`/api/public/studio-media/*`. Se reutilizaron los activos acreditados existentes
(`experiences-preview-2026-09-04`, `places-preview-2026-09-03`) y se crearon
10 activos conceptuales temporales en el lote `landing-demo-2026-09-05`.

Metadatos obligatorios en cada activo demo: `is_demo_seed=true`,
`alt_text_source='ai'`, `review_state='ai_suggested'`, `status='draft'`,
`credit`, `title`, `usage_context`, `entity_kind`, `metadata.focal`,
`metadata.aspect_ratio`, `metadata.lifecycle` (`production_eligible:false`,
`replacement_required:true`, `temporary:true`, `usage:'preview_only'`) y
`metadata.rights.author`. Son identificables, reemplazables y eliminables sin
tocar código.

### Inventario de activos creados (lote `landing-demo-2026-09-05`)

| ID | Archivo | Uso | Medidas |
|---|---|---|---|
| `62bd416f-845d-4317-945d-c724f570abbe` | `zazil-territorio-demo.jpg` | contexto territorial | 1600×1100 |
| `4c2c716a-6513-4135-8afc-62a738fe806f` | `zazil-galeria-1.jpg` | galería | 1600×1100 |
| `b3861a9c-5828-43a5-899d-43ba18bdc6e9` | `zazil-galeria-2.jpg` | galería | 1600×1100 |
| `75308570-21e2-4c51-9eaa-aee43683e61f` | `zazil-cover-movil-demo.jpg` | portada móvil | 900×1200 |
| `f9b3db62-d684-4a0c-9c14-1faa5a4d6a37` | `zazil-og-demo.jpg` | imagen social | 1200×630 |
| `b5d92710-b7cc-4431-890b-bd564bfe8f6a` | `chichen-experiencia-demo.jpg` | experiencia destacada | 1600×1100 |
| `d0a138ed-270d-4cef-883b-f9796386a0e7` | `chichen-og-demo.jpg` | imagen social | 1200×630 |
| `3586deb9-ccc9-4a3f-ad93-f661413274d5` | `suytun-experiencia-demo.jpg` | experiencia destacada | 1600×1100 |
| `a810acfc-e284-418c-bd81-adad45ac83b6` | `suytun-og-demo.jpg` | imagen social | 1200×630 |
| `793ab024-2f6b-4f3b-ac76-e094e3e56bed` | `suytun-territorio-demo.jpg` | contexto territorial | 1600×1100 |

Activos reutilizados: `zazil-tunich-cover-demo.jpg`, `zazil-tunich-experiencia-demo.jpg`
(`landing-demo-2026-09-05`), `chichen-itza-gallery.png`, `cenote-suytun-gallery.png`
(`places-preview-2026-09-03`). Logos de Valladolid.mx y Alux: componentes oficiales
del design system, sin duplicar.

## 2. Selectores de medios en el CMS

Nuevo componente `MediaField` en `SeoLandingContentEditor`: miniatura, texto
alternativo, chip de acreditación (`Demo IA · uso conceptual temporal` /
`Sin activo acreditado`), origen (`entidad` / `biblioteca`), crédito, punto
focal editable, «Cambiar activo» y «Quitar». Presente en:

- Fotografía de portada (hero)
- Portada alternativa en móvil (`<picture>` bajo 640 px)
- Imagen social (OG) → se escribe en `chrome.seo.og_image` y la consume `/p/$slug`
- Portada de cada experiencia destacada
- Galería complementaria (hasta 4)
- Imagen de contexto territorial

Las opciones se cargan de `media_assets`: activos de la entidad de origen y de
la biblioteca `studio-media` acreditada.

## 3. Matriz de campos editables verificados

| Módulo | Campos | Estado |
|---|---|---|
| Portada | antetítulo, título, tipo/subtipo, promesa, descripción, 3 selectores de medios | ✅ |
| Confianza | alta, edición, icono, detalle, estado (`por verificar`), orden, ocultar | ✅ |
| Intro editorial | encabezado, cuerpo, orden en el cuerpo, ocultar | ✅ |
| Beneficios | alta, edición, icono, orden, visibilidad | ✅ |
| Experiencias | ID canónico, título, texto editorial, enlace, etiquetas, portada, orden, visibilidad | ✅ |
| Datos de visita | icono, dato, valor, orden, visibilidad | ✅ |
| Territorio | cuerpo, distancia, imagen contextual, orden, visibilidad | ✅ |
| Galería | hasta 4 activos con alt | ✅ |
| Alux | encabezado, cuerpo, visibilidad | ✅ |
| Acciones / Mi Viaje | etiqueta, tipo (ver ficha, agregar a Mi Viaje, guardar), énfasis, enlace | ✅ |
| SEO | title, description, canonical, robots (default `noindex,nofollow`), OG | ✅ |
| Orden de módulos | posición 1–4 de intro, experiencias, datos, territorio | ✅ |

## 4. Prueba de persistencia

Ejecutada con navegador real sobre `/cms/landing-seo` (Chichén Itzá):

1. Valor original: «La ciudad donde la serpiente de luz desciende cada equinoccio.»
2. Edición → «PRUEBA DE PERSISTENCIA 3I.3» → Guardar contenido (autoridad
   gobernada `eb_save_composition_draft`).
3. Recarga completa → valor leído: «PRUEBA DE PERSISTENCIA 3I.3». ✅
4. Reversión → recarga → valor original restituido. ✅
5. Entidades fuente (`points_of_interest`, `businesses`, `products`) sin
   escrituras: sólo se modificaron `page_compositions` y `media_assets`. ✅

## 5. Pilotos

| Piloto | Slug | Estado |
|---|---|---|
| Zazil Tunich | `landing-business-zazil-tunich` | borrador · `noindex,nofollow` |
| Chichén Itzá | `landing-place-chichen-itza` | borrador · `noindex,nofollow` |
| Cenote Suytun | `landing-place-cenote-suytun` | borrador · `noindex,nofollow` |

Vistas previas internas (caducan 2026-09-12, se invalidan al guardar):
`/preview/composition/64bbff62…`, `/preview/composition/b744352c…`,
`/preview/composition/f5dd17ff…`.

## 6. Validaciones

`bunx tsgo --noEmit` limpio · `bun test` 777/777 (5297 aserciones) ·
ESLint limpio en los archivos tocados · `bun run build` correcto ·
Route Inventory 247 rutas · Capturas 1440/834/430 en los tres pilotos:
0 desbordes horizontales, 1 `h1`, 0 imágenes rotas, 0 errores de consola.

## 7. Retención de datos demo

Los activos y contenidos del lote `landing-demo-2026-09-05` permanecen hasta
que el Founder indique literalmente: «Demo validada. Puedes eliminar los datos
temporales.»
