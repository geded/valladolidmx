# Área de trabajo amplia y cierre real del Experience Builder

## Diagnóstico confirmado

- La captura muestra el lienzo de 1440 px reducido a 32% porque compiten simultáneamente la navegación del CMS, la estructura de secciones y la barra de acciones.
- “Escritorio amplio” sólo nombra la vista de 1440 × 900; no causa el problema, pero ocupa espacio y no ayuda a editar.
- El guardado de borradores sí existe y se ejecuta automáticamente después de cada cambio, con detección de conflictos y publicación separada.
- No es correcto afirmar todavía que **todas** las plantillas están completamente conectadas: el catálogo declara más familias que las que hoy tienen vista previa con datos reales, plantilla Premium aprobada y consumo público comprobado.
- El panel mezcla plantillas activas con pruebas históricas y composiciones sin uso público vigente; esa mezcla debe retirarse de la experiencia normal del editor.

## Scope Gate

Autorizado para esta entrega:

1. Mejorar únicamente el área de trabajo del Experience Builder existente.
2. Auditar y cerrar la cadena de cada familia: edición → guardado → vista previa → publicación → página pública.
3. Depurar el catálogo para dejar únicamente plantillas Premium aprobadas y superficies activas.
4. No rediseñar plantillas ni cambiar su contenido, orden, marca o datos.

## Mejora del área de construcción

- Añadir un modo **Ampliar área de trabajo** dentro del Studio único.
- Al activarlo, usar los controles existentes del Workspace para reducir la navegación del CMS y ocultar temporalmente la estructura de secciones; ambos podrán recuperarse con controles siempre visibles.
- Mantener la edición de una sección en panel lateral superpuesto, para no reducir permanentemente el lienzo.
- Sustituir la frase larga por un indicador compacto: `1440 × 900 · 32%`.
- Conservar los seis anchos de comprobación y recordar la vista elegida.
- Mantener salir del modo amplio, volver a Páginas, guardar, versiones, vista previa y publicación siempre accesibles.

## Depuración gobernada del catálogo

- Construir un inventario de cada registro visible con: familia, aprobación, ruta pública, consumidor actual, última revisión y dependencia.
- Mostrar en el editor normal sólo plantillas aprobadas con uso vigente en la plataforma.
- Excluir del selector pruebas antiguas, demos, previews internas y composiciones huérfanas.
- No eliminar físicamente un registro hasta comprobar que ninguna ruta, preview, publicación o historial lo referencia; primero se archiva u oculta de forma reversible.
- Las plantillas internas `__tpl_*__` permanecen sólo cuando sean la autoridad activa de una familia y se presentan con nombre comprensible, no como páginas públicas.

## Cierre de plantillas y persistencia

Crear una matriz verificable por familia con:

- composición y plantilla oficial;
- bloques editables permitidos;
- datos reales usados en el lienzo;
- guardado y recarga del borrador;
- vista previa idéntica a la autoridad Premium;
- publicación separada y consumo real en la ruta pública;
- estado `Conectada`, `Parcial` o `Bloqueada`, sin presentar como editable una familia incompleta.

Prioridad de cierre:

1. Home.
2. Región y Destino.
3. Listados: Qué hacer, Hoteles, Restaurantes, Experiencias, Eventos y Lugares.
4. Empresa, Hotel y Restaurante.
5. Producto/Experiencia, Evento y Lugar.
6. Landings, Alux y Arma tu Viaje.

Las familias sin proveedor de datos reales o sin ruta pública conectada quedarán visibles como pendientes, no como “todo editable”. No se crearán plantillas paralelas ni contenido de demostración público.

## Preservation Gate

Permanecen invariantes:

- plantillas Premium aprobadas y su orden;
- `page_compositions` como única fuente editorial;
- componentes OMXDS, header, footer y breadcrumb;
- CMS, datos y medios existentes;
- Alux, Mi Viaje, mapas, SEO y analítica;
- publicación manual y permisos fail-closed.

## Validación obligatoria

- Probar edición → autoguardado → recarga → vista previa → publicación controlada → lectura pública por cada familia habilitada.
- Comparar constructor, vista previa y página pública completa.
- Revisar 1440, 834, 430 y 390 px, incluyendo apertura/cierre de navegación, estructura e inspector.
- Ejecutar typecheck, pruebas afectadas, suite, Route Inventory y Governance Integrity.
- No publicar el sitio sin autorización expresa.
