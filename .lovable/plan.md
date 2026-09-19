# Ordenar el constructor: una sola galería con las 21 plantillas oficiales

## Por qué hoy solo ves Home

El panel "Mis páginas" no lista plantillas: lista las páginas que ya existen guardadas en el CMS. Hoy existen 19 páginas guardadas, y la mayoría son o fichas de autoridad interna (`Plantilla · Empresa`, `Plantilla · Producto`, `Plantilla · Evento`, `Plantilla · Lugar`, `Plantilla · Destino`, `Plantilla · Región`) o borradores vacíos (`Hoteles`, `Restaurantes`, `Experiencias`, `Oriente Maya`). Sólo Home tiene contenido real porque es la única con composición publicada y editada.

Las otras plantillas aprobadas (los 6 listados G5, las 6 variantes de Lugar, las 6 fichas de entidad, la landing SEO) existen en el registro oficial del sistema, pero no tienen una página de trabajo creada, así que no aparecen en el listado.

## Qué se va a hacer

### 1. Sección "Plantillas oficiales" dentro del constructor

En la página inicial del constructor, encima de "Mis páginas", una galería agrupada por familia con las 21 plantillas aprobadas:

- Inicio (1)
- Destinos (1)
- Listados turísticos (6): Hoteles, Restaurantes, Experiencias, Eventos, Casas de vacaciones, Qué hacer
- Lugares y sitios de interés (6 variantes)
- Fichas de entidad (6): Hotel, Restaurante, Casa de vacaciones, Experiencia, Tour, Evento
- Landing promocional SEO (1)

Cada tarjeta muestra nombre, descripción, ruta pública, estado (Publicada / Borrador / Sin página creada) y un botón:

- si la página de trabajo ya existe, **Abrir** la lleva al editor visual;
- si no existe, **Crear página de trabajo** la genera con el preset aprobado y la abre.

No se crea ningún editor nuevo: se reutiliza la galería de presets que ya existía (`PremiumPresetGallery`) y las funciones de creación existentes del Studio.

### 2. Limpiar lo que no se usa

Se ocultan del listado (de forma reversible, sin borrar datos):

- `premium-g4-approved` (duplicado de Home, tipo "custom", borrador de agosto)
- `marketplace` (terminología ya retirada del producto)

Las fichas `Plantilla · …` dejan de mostrarse como páginas sueltas y pasan a representarse dentro de su familia en la galería, que es su función real.

Nada se elimina de la base de datos en este paso.

### 3. Orden estable

Las familias se ordenan por el registro oficial, no alfabéticamente, para que el constructor tenga siempre la misma estructura: Inicio → Destinos → Listados → Lugares → Fichas → Landing.

## Detalles técnicos

- Fuente única: `premium-template-registry.ts` + `entity-premium-templates.ts` + `seo-landing-template.ts`. No se declara ninguna lista paralela.
- Se cruza el registro con `page_compositions` por `slug`/`kind` para resolver el estado de cada plantilla.
- Cambios en `src/components/experience-builder/PagesPanel.tsx` y reincorporación de `PremiumPresetGallery.tsx` en modo galería agrupada.
- La ocultación usa el mismo mecanismo reversible ya aplicado a las demos históricas.
- Sin cambios en rutas públicas, contratos de bloques ni render público. No se publica nada.

## Verificación

- Typecheck, Prettier y suite dirigida del Experience Builder.
- Revisión visual autenticada del constructor en 1440, 834, 430 y 390.

## 4. Estructura fácil de entender y plantilla por defecto

- Cada familia se presenta con su nombre turístico (Inicio, Destinos, Listados turísticos, Lugares y sitios de interés, Fichas de empresa/producto/evento, Landing promocional), una línea que explica para qué sirve y la ruta pública de ejemplo. Nada de identificadores técnicos en la vista visual.
- Dentro de cada familia se ve de un vistazo qué páginas existen, su estado y qué se puede modificar (contenido, orden de secciones, imágenes, enlaces).
- **Plantilla por defecto por sección:** al crear una página nueva dentro de una sección, el sistema asigna automáticamente la plantilla aprobada de esa familia, sin pedir elegir preset. Si la familia tiene variantes (Lugares), se pregunta sólo la variante; el resto queda preasignado.
- Si una sección todavía no tiene su plantilla aprobada declarada, la creación queda bloqueada con aviso claro (fail-closed), en vez de caer en una plantilla genérica.
