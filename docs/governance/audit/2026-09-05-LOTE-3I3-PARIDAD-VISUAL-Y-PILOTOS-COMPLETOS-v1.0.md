# LOTE 3I.3 · Paridad visual real y pilotos completos — `premium-seo-landing`

Rama: `integration/lovable-valladolidmx` · Fecha: 2026-09-05 · Estado: entregado
para validación visual del Founder. Sin publicación, sin sitemap, sin redirects,
sin `main`.

## A · Geometría de la maqueta (1440 px)

| Región de la maqueta | Implementación | Estado |
| --- | --- | --- |
| Hero dividido 42 / 58, tarjeta única | `lg:grid-cols-[42fr_58fr]`, fotografía a sangre en la mitad derecha, altura ≥ 24rem | PASS |
| Hero editorial: eyebrow, título grande, tipo · destino, filete, promesa, descripción, CTA principal + Mi Viaje | Columna izquierda con jerarquía descendente | PASS |
| "Guardar" discreto sobre la fotografía | Chip flotante arriba a la derecha (sin fotografía cae a la fila de acciones) | PASS |
| Franja de confianza horizontal con divisores finos, sin tarjetas | Fila única `lg:grid-cols-4` con `divide-x` | PASS |
| Cuerpo editorial de 4 áreas simultáneas (≈22 / 31 / 20 / 22) | `lg:grid-cols-[22fr_31fr_20fr_22fr]`, alineación superior común, divisores verticales | PASS |
| Experiencia destacada con fotografía grande y texto sobre degradado inferior | `FeaturedOffer` con overlay y etiquetas; resto como lista secundaria | PASS |
| Información práctica como lista compacta con iconos | Lista `dl` con divisores e icono por dato (nuevo campo administrable) | PASS |
| Contexto territorial con medio, destino, dirección, distancia, coordenadas y enlace | Área 4 con medio acreditado o marcador editorial | PASS |
| Banda Alux baja, horizontal, con mascota oficial | Banda secundaria al pie con `AluxMark` | PASS |
| Selectores Editorial/Cinematográfica | Inexistentes (fail-closed) | PASS |

## B · Autoría CMS-first (ampliación aditiva)

- Nuevo campo administrable **icono** en cada dato de "Información para tu
  visita" (reloj, calendario, equipaje, accesibilidad, sostenibilidad, boleto,
  información). Contrato: `SeoLandingInfoIcon`; valor desconocido cae a
  `info`, nunca rompe la página.
- El selector de portada del CMS ahora ofrece, además de los medios de la
  entidad, la **Biblioteca de Medios gobernada** (`studio-media`), marcando los
  activos demo. Permite resolver la portada sin tocar la ficha de origen.
- Sin migración de esquema, sin tabla nueva, sin plantilla paralela: los 18
  slots y la RPC `eb_save_composition_draft` siguen siendo la única vía.

## C · Pilotos completos (borrador · `noindex,nofollow`)

| Landing | Vista previa interna (caduca 12 sep 2026) |
| --- | --- |
| Zazil Tunich | `/preview/composition/41f207fd2e6adcf48ce9f8519d9b83f3c8efb94dde1f60d7c76e9ffd3b04cf99` |
| Chichén Itzá | `/preview/composition/4c345eae579c5711a251a0eb81d7a0cec8508dd743f5d893c9d080d6471bd246` |
| Cenote Suytun | `/preview/composition/c693ebd132c1b17ef5167e87545fab99fc01d82246d10642a072e730d96e1235` |

Cada piloto lleva 4 señales de confianza, 4 beneficios, información práctica con
iconos, contexto territorial con distancia y cierre Alux. Zazil suma la
experiencia destacada con fotografía; Chichén y Suytun usan medio contextual en
el área territorial.

## D · Demo Pack

- Activos demo: `studio-media/landing-demo-2026-09-05/zazil-tunich-cover-demo.jpg`
  (`e35ff1ea-…`) y `…/zazil-tunich-experiencia-demo.jpg` (`68e64394-…`), ambos
  `is_demo_seed = true`, `alt_text_source = ai`, `review_state = ai_suggested`,
  metadata `{"demo":true,"lote":"3I.3","no_production":true}`.
- Los textos de confianza, beneficios y datos prácticos son **contenido demo**
  cargado en el borrador; requieren validación editorial antes de publicar.
- Retención: no se elimina ningún dato demo hasta autorización literal del
  Founder.

## E · QA visual y validación técnica

- 9 casos (3 landings × 1440 / 834 / 430): overflow horizontal 0, un solo `h1`,
  0 imágenes rotas, 0 errores de consola. Capturas en `/tmp/browser/3i3/`.
- Typecheck limpio · ESLint 0 errores · 777/777 pruebas (5297 aserciones) ·
  build de producción correcto · Route Inventory 247 rutas.

## Límites y pendientes

- Los tres pilotos siguen en borrador `noindex,nofollow`.
- NO VERIFICADO: aprobación visual del Founder sobre las tres vistas previas.
- Pendiente heredado de 3I.1: el archivado de landings legacy sigue bloqueado
  por el contrato de estado en la base; requiere autorización explícita.
