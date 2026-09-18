# Edición por secciones en plantillas compuestas (mecanismo general)

## Por qué no funciona hoy

Varias plantillas aprobadas no están formadas por secciones sueltas dentro del constructor: son **un solo bloque compuesto**. Inicio es `vmx.home.premium-g4` y contiene internamente hero, categorías, Alux, destinos, Pueblos Mágicos, rutas, experiencias, hospedaje y gastronomía, eventos, qué hacer, mapa y Mi Viaje.

Por eso el editor dice "Editando sección 1 de 1", el panel muestra todos los campos juntos y arrastrar y pegar no tiene nada que reordenar. La edición por secciones y el arrastre ya funcionan, pero sólo en plantillas con varias secciones.

## Qué se va a hacer

Un mecanismo **general** para toda la plataforma: cualquier plantilla compuesta declara sus secciones internas y el constructor las trata como secciones de trabajo reales, sin cambiar el diseño ni el render público.

1. **Registro de secciones internas.** Un único registro declara, por tipo de bloque compuesto, sus secciones: nombre visible, campos que le pertenecen (por prefijo), interruptor de visibilidad y clave de orden.
2. **Estructura.** El panel "Estructura" lista esas secciones internas cuando se edita una plantilla compuesta, con interruptor de visibilidad y tirador de arrastre.
3. **Edición por secciones.** Al elegir una sección, el panel lateral muestra sólo sus campos, con "Editando sección N de M", flechas anterior/siguiente, selector de salto y Cerrar.
4. **Arrastrar y pegar.** El nuevo orden se guarda en la clave de orden del bloque, validada fail-closed contra el orden aprobado.
5. **Selección desde el lienzo.** Tocar una sección del lienzo abre esa sección en el panel.
6. **Cobertura.** Se aplica primero a las plantillas compuestas vigentes: Inicio (`vmx.home.premium-g4`), micrositio de destino (`vmx.destination.premium-g4`) y los 6 listados turísticos (`vmx.listing.premium-g5`). Las plantillas que ya tienen varias secciones siguen funcionando igual. Toda plantilla compuesta futura sólo necesita declararse en el registro.

## Decisión que requiere tu visto bueno

Hoy los presets declaran **orden bloqueado** en estas plantillas. Habilitar arrastrar y pegar significa autorizar que el orden de sus secciones internas sea editable desde el constructor. Diseño, layout y variante siguen bloqueados; sólo cambian orden y visibilidad.

## Detalles técnicos

- Nuevo `src/lib/experience-builder/composite-sections.ts`: registro `blockType -> secciones (key, label, prefijos de campo, clave de visibilidad, clave de orden)`.
- `home-premium-config.ts`, y equivalentes de destino y listados: nueva clave de orden saneada contra el orden aprobado (claves conocidas, sin duplicados, faltantes completados); incluida en la configuración por defecto.
- `VisualStudio.tsx`: cuando el nodo seleccionado es un bloque compuesto registrado, estructura, navegación por secciones y arrastre operan sobre sus sub-secciones.
- `AutoInspector.tsx`: filtro opcional de campos por prefijos.
- Sin cambios en las superficies de render, tokens, contenido CMS ni rutas públicas.

## Preservación y validación

- Preservado: plantillas Premium, secciones, contenido CMS, marca, header/footer, SEO, Alux, Mi Viaje, mapas.
- Validación: Prettier, `tsgo --noEmit`, pruebas de contrato de los bloques, y revisión visual del constructor y de las rutas públicas en 1440 / 834 / 430 / 390.
- No se publica nada.
