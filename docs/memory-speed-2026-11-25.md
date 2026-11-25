# Memoria y primeras aperturas · 2026-11-25

## Corrección autorizada
El Founder autorizó corregir los hallazgos de la revisión publicada, no rediseñar. Autorización localizada: PCA-2026-121. No se cambiaron plantillas, datos CMS, reglas de visibilidad, precios, pagos, permisos, cuotas, cron ni despliegues.

## Diagnóstico
- La revisión publicada retuvo aproximadamente 24→48 MB de heap JavaScript en veinte ciclos restaurantes→Copalli→regreso, incluso después de GC. El entorno local no presentó el mismo crecimiento: el mapa real no se cargaba allí. Bloquear el colector de visitas no eliminó el crecimiento.
- Una captura de heap de producción identificó elementos desconectados retenidos por referencias internas del SDK de Google Maps (`__gm`, colección de contenedores y listener global de resize). Limpiar únicamente listeners públicos y pines no destruía mapas construidos anteriormente.
- La lectura de una copia pública fría esperaba primero la marca de modificación del CMS y después la copia compartida; solicitudes concurrentes podían duplicar esa segunda lectura.

## Delta mínimo
- El cargador existente ofrece `acquireGoogleMap`: reutiliza contenedores del SDK libres, sin compartir una instancia entre dos mapas activos; mantiene separados los mapas públicos y el selector de ubicación. Contenedores hijos estables ajenos al árbol React.
- InteractiveMap elimina pines, overlays, listeners y bindings antes de liberar el mapa para reutilizarlo. LocationPickerMap aplica el mismo ciclo y elimina sus referencias. Promesas resueltas tras abandonar la pantalla no actualizan su estado.
- PublicReadMemo lee la marca CMS y la copia compartida en paralelo en servidores fríos; deduplica lecturas compartidas pendientes por clave. Sigue comprobando ambas fechas antes de reutilizar datos. No modifica los 60 segundos del HTML, 30 minutos de lecturas públicas, firmas fotográficas ni exclusión de sesiones.

## Controles realizados
- 14 pruebas Vitest: caché/HTML, veinte lectores concurrentes, rechazo de copia anterior al cambio CMS, aislamiento de versiones/dominios y lógica de galería: PASS.
- 17 pruebas del cargador de mapas y fallback: PASS. La prueba de adquisición verifica reutilización y limpieza del contrato, no render real del proveedor.
- Compilación automática: build OK. Lint localizado PASS al excluir las cuatro declaraciones `any` históricas de ensureMemoQuery; sin nuevas incidencias de esa regla.
- 24 revisiones públicas locales: Inicio, Oriente Maya, Valladolid, Hoteles, Restaurantes y Copalli en 1440/834/430/390, sin desbordes ni errores JavaScript. No se alteró JSX de plantillas ni clases de sus superficies; el hijo del mapa conserva tamaño completo y autoridad existente. Las pruebas excluyen solicitudes reales a Google Maps, conforme a la limitación del entorno.
- Buscar Copalli, cambiar a foto 2 de 5, abrir su ficha y regresar con la búsqueda «Copalli» conservada: PASS. La fotografía terminó de cargar en la pantalla de regreso; una captura inmediata del carrusel aún mostraba el fondo de espera.
- Governance Integrity PASS tras regenerar inventario. Product Authorization mantiene FAIL por revisiones históricas y autorizaciones superpuestas; no se modifican evidencias históricas para forzar éxito.

## Pendientes y límites
- Publicar y verificar Google Maps en origen autorizado: cambiar filtros, abrir empresas y regresar; mapa con encuadre, pines, burbujas, rutas, acciones y picker conservados. El entorno del agente no certifica el render real de Google Maps.
- Repetir medición de heap publicado tras veinte recorridos para comprobar que la acumulación se estabiliza. La causa fue diagnosticada y la prevención implementada, pero su resultado publicado aún no está medido.
- Medir primeras aperturas y visitantes reales después de publicar; retirar un viaje secuencial/deduplicar lecturas no prueba por sí solo que desaparezcan todas las esperas del alojamiento. No se promete un tiempo fijo ni se certifican 1,000 usuarios simultáneos.
- Constructor autenticado, Safari físico y autorizaciones históricas pendientes; nada se publica automáticamente.

## Rollback
Restaurar exclusivamente los cuatro archivos funcionales y sus pruebas a `ea61be3b` recupera el comportamiento anterior; no requiere revertir datos ni migraciones. Nunca restaurar rutas, plantillas o historial fuera de este delta.