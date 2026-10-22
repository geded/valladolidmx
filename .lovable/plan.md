# Fotos ligeras: comparación del Hotel Sutuk y optimización automática en cada subida

## Lo que ya existe (se conserva tal cual)
- 622 de 624 fotos ya tienen sus versiones ligeras creadas (celular, tablet, computadora). Las originales siguen intactas.
- El Inicio ya sabe mostrar versiones ligeras cuando existen. Si una foto no las tiene, muestra la original.
- El editor sube fotos con el mismo encuadre, ajustes, Alux y lote de siempre. Nada de eso cambia.

## Parte 1 · Comparación del Hotel Sutuk (antes de encender nada)
1. Conectar la ficha de empresa (hoteles, restaurantes, etc.) para que lea las versiones ligeras de sus fotos (portada, galería y logo). Si algo falla, muestra la original como hoy.
2. Encenderlo solo para el Hotel Sutuk en el ambiente de prueba.
3. Capturar el antes y después en 1440, 834, 430 y 390 px y medir cuánto pesa la página.
4. Te entrego las capturas. **No se enciende para todo el sitio hasta que lo apruebes.**

## Parte 2 · Optimización automática en cada subida
Cada foto nueva genera sus versiones ligeras en el momento de subirla, en todas las secciones que usan el sistema único de subida:
- Empresas (logo, portada, galería), portal del empresario
- Destinos, zonas, productos/experiencias
- Eventos (portada) y biblioteca del constructor

Cómo funciona, sin que el editor note diferencia:
1. El editor sube la foto igual que hoy y la original se guarda igual que hoy.
2. Justo después, el mismo navegador crea las versiones de 400, 800 y 1200 px en WebP y las entrega al servidor.
3. El servidor revisa que la persona pueda editar esa ficha, guarda las versiones y marca la foto como lista.
4. Si cualquier paso falla (celular viejo, conexión lenta), la subida **no se interrumpe**: la foto queda con su original y el proceso por lotes la optimiza después.
5. Una tarea periódica de respaldo vuelve a revisar fotos sin versiones ligeras.

## Lo que no cambia
- Pantallas, botones, diseño, plantillas, orden y textos del CMS y del sitio público.
- Las URLs públicas de las fotos (SEO intacto).
- Las 2 fotos con fallo parcial siguen mostrando su original.

## Detalles técnicos
- Lectura pública: cargador server-side batched de `{asset, variants ready}` por `cover_media_id`/`business_media`, consumido vía `resolveMediaSource()` (Transparent Derivation). Gate por `media_pipeline_enabled` + allowlist temporal del asset/empresa para la comparación.
- Subida: helper compartido `deriveAndRegisterVariants(file, mediaAssetId)` llamado desde el sistema único (`MediaUploadPanels`/`BusinessMediaPanels`/`DestinationMediaPanels`/`ZoneMediaPanels`/`ProductMediaPanels`/`MediaPickerDialog`/portal). Canvas → WebP; engine `browser-canvas`.
- Server fns: `signDerivedVariantUploads` (autoriza con la misma regla de edición de la ficha; firma rutas en `media-derived/{assetId}/browser-canvas/...`) y `registerDerivedVariants` (valida formato/anchos/bytes, upsert `media_asset_variants`, `pipeline_status='ready'`).
- Respaldo: el script `derive.mjs` (sharp) queda para lotes y fotos fallidas.
- Pruebas: contrato de anchos/formatos permitidos y del fallback a original.
