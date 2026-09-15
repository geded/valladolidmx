# Optimización integral de imágenes del sitio

## Diagnóstico confirmado

- La portada descarga aproximadamente **5.8 MB** de imágenes en una visita de escritorio medida.
- La imagen editorial de **“¿Qué hacer hoy?”** pesa **154 KB** y tardó cerca de **4.1 s**; la miniatura del evento pesa **265 KB** aunque se muestra a 48×48 px.
- La fotografía principal de Valladolid pesa **650 KB** y se reutiliza en varios tamaños sin una versión adecuada para cada espacio.
- El sitio conserva correctamente los originales, pero las versiones ligeras AVIF/WebP todavía no llegan al navegador: sólo **3 de 73** imágenes publicadas tienen variantes listas y los interruptores del proceso permanecen apagados.
- El componente común de imágenes editoriales sirve la URL original; por eso Home y otras plantillas no reciben automáticamente tamaños responsivos.

## Scope Gate

Autorizado por el Founder en este turno: activar progresivamente imágenes ligeras en **todo el sitio**.

Incluye:

1. Cerrar el bloqueo técnico ya documentado del firmador de variantes, sin rotar ni exponer secretos.
2. Convertir toda carga nueva del CMS, Portal y Experience Builder en un ingreso gobernado: validación previa, original inmutable y optimización automática.
3. Completar variantes responsivas para las imágenes publicadas elegibles, empezando por Home.
4. Conectar el componente oficial de imagen responsiva a los componentes compartidos y plantillas existentes.
5. Declarar tamaño, proporción, carga diferida y prioridad según la posición real de cada imagen.
6. Procesar cargas masivas mediante cola limitada, idempotente y observable, sin ejecutar trabajo pesado desde la pantalla del usuario.
7. Medir peso, tiempos, errores y fallback antes de ampliar cada lote.

No incluye:

- Cambiar fotografías, textos, orden, estilo o estructura de las plantillas.
- Alterar URLs públicas canónicas, ALT, SEO, permisos o contenido del CMS.
- Publicar o desplegar sin autorización posterior.
- Crear un segundo sistema de imágenes o componentes visuales paralelos.

## Preservation Gate

Se preservarán sin cambios visuales:

- Home Premium completa, incluida “¿Qué hacer hoy?”.
- Plantillas Premium de destinos, lugares, empresas, productos, eventos y listados.
- Encuadre, punto focal, proporción, ALT, crédito y URL canónica de cada imagen.
- Header, footer, breadcrumb, mapas, Alux, Mi Viaje y navegación.
- Experience Builder, preview y página pública como una misma autoridad.

## Implementación por lotes reversibles

### Lote 1 — Desbloqueo seguro y Home

- Sincronizar el secreto del firmador mediante el procedimiento aprobado, comparando únicamente huellas y nunca valores.
- Revalidar el ciclo técnico con un solo activo y volver a dejar los interruptores en estado seguro si falla cualquier control.
- Generar variantes de las imágenes reales usadas en Home.
- Evolucionar el componente editorial existente para producir `<picture>` con AVIF/WebP/JPEG, `srcset`, `sizes`, dimensiones y fallback al original.
- Marcar como prioritaria únicamente la imagen principal visible al abrir la portada; mantener carga diferida en “¿Qué hacer hoy?” cuando esté fuera de la primera vista.

### Lote 2 — Ingreso inteligente y escalable

- Pedir y comprobar el uso de la foto —portada, galería, tarjeta, miniatura o logo— para asignar requisitos claros de orientación y resolución mínima.
- Rechazar antes de subir archivos no admitidos, dañados, excesivos o con dimensiones insuficientes, con mensajes comprensibles para empresa y editor.
- Conservar un solo original inmutable y registrar cada imagen una sola vez; una reanudación o reintento no duplica trabajo.
- Crear automáticamente versiones AVIF, WebP y JPEG en anchos útiles, sin ampliar imágenes pequeñas.
- Encolar cada imagen con una clave única; procesar lotes pequeños, con límite de concurrencia, reintentos espaciados y bloqueo para impedir dos procesadores simultáneos.
- Mostrar estados claros: “Recibida”, “Optimizando”, “Lista” y “Necesita revisión”. La carga editorial termina al guardar el original; la optimización continúa de forma segura sin congelar la pantalla.
- Ante una jornada con cientos de empresas, la cola absorbe el volumen y regula el ritmo; nunca dispara cientos de procesos paralelos ni depende de una página abierta.
- Pausar automáticamente ante saturación o fallos repetidos, conservar el original y avisar al administrador; reanudar sólo de forma controlada.

### Biblioteca Media — visibilidad y navegación

- **Empresa:** verá únicamente las imágenes que pertenecen a sus empresas y productos, más una colección oficial compartida cuando el administrador la habilite. Nunca podrá explorar fotos privadas de otra empresa.
- **Editor territorial:** verá las imágenes de las entidades incluidas en su ámbito autorizado.
- **Administrador y superadministrador:** podrán consultar todo el catálogo, con filtros por empresa, destino, responsable y estado.
- La entrada principal será **“Mis imágenes”**, con buscador por nombre, empresa, producto y texto alternativo; filtros por fecha, orientación, estado y uso.
- Los usos se presentarán como filtros claros: **Portadas**, **Galerías** y **Logos**. Una misma imagen podrá estar vinculada en más de un lugar sin duplicar el original.
- **Miniaturas no serán una biblioteca editable ni una carga adicional:** el sistema las generará automáticamente como versiones derivadas de portadas y galerías.
- Cada ficha mostrará dónde se usa la imagen, su empresa/producto, quién la subió, fecha, estado de optimización y si requiere revisión.
- El selector contextual abrirá prefiltrado según la tarea: al elegir una portada mostrará imágenes horizontales aptas; para logo, imágenes de logo; para galería, imágenes compatibles.
- Se admitirán selección múltiple, paginación/carga progresiva y orden por recientes para navegar miles de imágenes sin descargar todo el catálogo.
- Las asignaciones a portada, galería o logo serán relaciones administradas, no nombres de carpetas ni copias físicas del archivo.

### Lote 3 — Plantillas públicas compartidas

- Aplicar el mismo componente oficial a héroes, tarjetas, galerías, miniaturas y listados.
- Empezar por componentes compartidos para evitar cambios duplicados y cubrir varias plantillas con el delta mínimo.
- Migrar sólo consumidores que tengan identidad de imagen y variantes verificables; los demás conservarán automáticamente el original.

### Lote 4 — Cobertura y endurecimiento

- Completar el procesamiento gradual del catálogo publicado, con lotes pequeños, reintentos y rollback.
- Confirmar que no queden miniaturas descargando originales grandes ni imágenes visibles sin dimensiones.
- Mantener los originales inmutables y las URLs canónicas estables.
- Probar una carga simultánea equivalente a **100 empresas**, con múltiples fotos por empresa, verificando que no haya duplicados, bloqueo de pantallas ni degradación del sitio público.

## Validación

En cada lote:

- Typecheck, pruebas del resolver, carga y fallback, Route Inventory y Governance.
- Comparación visual completa en **1440, 834, 430 y 390 px**.
- Revisión de Home, constructor, preview y rutas públicas afectadas.
- Medición antes/después de bytes, tiempo de primera imagen, LCP y errores.
- Comprobación de canonical, OG, JSON-LD y ALT sin cambios.
- Rollback inmediato del lote si aparece una diferencia visual o una imagen rota.
- Pruebas de volumen, reintento, deduplicación, pausa, recuperación y límite de concurrencia de la cola.
- Pruebas de aislamiento entre empresas y ámbitos editoriales, incluidos intentos de acceso directo a imágenes ajenas.

## Resultado esperado

La misma experiencia visual y editorial, pero cada navegador descargará el formato y tamaño adecuados. La prioridad inicial es eliminar la demora visible en Home y después extender el beneficio, de forma controlada, al resto de las plantillas.
