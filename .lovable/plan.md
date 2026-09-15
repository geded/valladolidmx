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
2. Completar variantes responsivas para las imágenes publicadas elegibles, empezando por Home.
3. Conectar el componente oficial de imagen responsiva a los componentes compartidos y plantillas existentes.
4. Declarar tamaño, proporción, carga diferida y prioridad según la posición real de cada imagen.
5. Medir peso, tiempos, errores y fallback antes de ampliar cada lote.

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

### Lote 2 — Plantillas públicas compartidas

- Aplicar el mismo componente oficial a héroes, tarjetas, galerías, miniaturas y listados.
- Empezar por componentes compartidos para evitar cambios duplicados y cubrir varias plantillas con el delta mínimo.
- Migrar sólo consumidores que tengan identidad de imagen y variantes verificables; los demás conservarán automáticamente el original.

### Lote 3 — Cobertura y endurecimiento

- Completar el procesamiento gradual del catálogo publicado, con lotes pequeños, reintentos y rollback.
- Confirmar que no queden miniaturas descargando originales grandes ni imágenes visibles sin dimensiones.
- Mantener los originales inmutables y las URLs canónicas estables.

## Validación

En cada lote:

- Typecheck, pruebas del resolver, carga y fallback, Route Inventory y Governance.
- Comparación visual completa en **1440, 834, 430 y 390 px**.
- Revisión de Home, constructor, preview y rutas públicas afectadas.
- Medición antes/después de bytes, tiempo de primera imagen, LCP y errores.
- Comprobación de canonical, OG, JSON-LD y ALT sin cambios.
- Rollback inmediato del lote si aparece una diferencia visual o una imagen rota.

## Resultado esperado

La misma experiencia visual y editorial, pero cada navegador descargará el formato y tamaño adecuados. La prioridad inicial es eliminar la demora visible en Home y después extender el beneficio, de forma controlada, al resto de las plantillas.
