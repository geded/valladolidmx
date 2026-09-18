# Edición por secciones reales en la plantilla Inicio

## Por qué no funciona hoy

La plantilla Inicio no está compuesta por 12 secciones independientes dentro del constructor: es **un solo bloque aprobado** (`vmx.home.premium-g4`) que contiene internamente hero, categorías, Alux, destinos, Pueblos Mágicos, rutas, experiencias, hospedaje y gastronomía, eventos, qué hacer, mapa y Mi Viaje.

Por eso el editor dice "Editando sección 1 de 1", el panel muestra todos los campos juntos, y arrastrar y pegar no tiene nada que reordenar. La edición por secciones y el arrastre ya funcionan, pero sólo sobre plantillas con varias secciones; Inicio no lo es.

## Qué se va a hacer

Hacer que el constructor reconozca las secciones internas de la plantilla Inicio como secciones de trabajo reales, sin cambiar el diseño ni el render público.

1. **Mapa de secciones internas.** Declarar las 12 secciones de Inicio con su nombre visible y los campos que le pertenecen (por prefijo: `hero_*`, `destinos_*`, `eventos_*`, etc.).
2. **Estructura.** El panel "Estructura" lista esas 12 secciones cuando se edita Inicio, con su interruptor de visibilidad (`show_*`, ya existente) y su tirador de arrastre.
3. **Edición por secciones.** Al elegir una sección, el panel lateral muestra únicamente sus campos, con el encabezado "Editando sección N de 12", flechas anterior/siguiente, selector de salto y botón Cerrar (mismos controles ya implementados).
4. **Arrastrar y pegar.** El orden se guarda en una nueva clave `home_section_order` del bloque. `resolveHomePremiumG4` la valida (sólo claves conocidas, sin duplicados, completando faltantes con el orden aprobado) y cae al orden aprobado si es inválida.
5. **Selección desde el lienzo.** Al tocar una sección dentro del lienzo, se abre esa sección en el panel.
6. **Otras plantillas.** Las que sí tienen varias secciones siguen igual; este mapa sólo aplica a bloques compuestos declarados.

## Decisión que requiere tu visto bueno

Hoy el preset declara **orden bloqueado** para Inicio. Habilitar arrastrar y pegar significa autorizar que el orden de las secciones de Inicio sea editable desde el constructor. El diseño, el layout y la variante siguen bloqueados; sólo cambia el orden y la visibilidad.

## Detalles técnicos

- `src/components/home-premium/home-premium-config.ts`: nueva clave `home_section_order` (array de `HomePremiumSectionKey`), saneada fail-closed contra `HOME_PREMIUM_DEFAULT_ORDER`; `homePremiumG4DefaultConfig()` la incluye.
- Nuevo `src/lib/experience-builder/composite-sections.ts`: registro `blockType -> secciones (key, label, prefijos de campo, clave de visibilidad, clave de orden)`.
- `src/components/experience-builder/VisualStudio.tsx`: cuando el nodo seleccionado es un bloque compuesto registrado, la lista de estructura, la navegación por secciones y el arrastre operan sobre sus sub-secciones.
- `src/components/experience-builder/AutoInspector.tsx`: soporte opcional de filtro de campos por prefijos.
- Sin cambios en `HomePremiumSurface`, tokens, contenido CMS ni ruta pública. Sólo se preserva la autoridad de render.

## Preservación y validación

- Preservado: plantilla Home Premium G4, secciones, contenido CMS, marca, header/footer, SEO, Alux, Mi Viaje, mapa.
- Validación: Prettier, `tsgo --noEmit`, pruebas de contrato del bloque, y revisión visual del constructor y de la Home pública en 1440 / 834 / 430 / 390.
- No se publica nada.
