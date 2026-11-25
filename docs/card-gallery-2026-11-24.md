# Galería aprobada de empresas · 2026-11-24

## Alcance

Founder aprobó la maqueta a las 23:54 UTC. Se evoluciona únicamente el área fotográfica de las tarjetas existentes: portada más hasta cuatro fotos de galería de la misma empresa. No se cambian estructura, texto, precio, insignias, ubicación, enlaces, favoritos, Mi Viaje, mapa, visibilidad, filtros ni orden.

Autoridades: `TerritorialListingReviewSurface` (preset `vmx.listing.premium-g5`, DTO de `listing-public-contract`) y `TourismCard` en `TourismListingSurface`. Ambas reutilizan `CardMediaGallery`; no hay tarjeta paralela. La maqueta también consume la tarjeta oficial, no su implementación temporal.

Lectura: `businesses` publicado/no eliminado/aprobado → `business_media` con role gallery en orden editorial → `media_assets` publicado/no eliminado. Cliente anónimo verifica elegibilidad antes de firmar con el servicio existente. Sólo se devuelven hasta cuatro fotos, con variantes del pipeline cuando corresponde, nunca ficha completa, menú, productos, contactos ni escrituras.

Primera carga: únicamente portada; no se solicitan datos de galería hasta flecha/gesto. Sólo se montan imágenes visitadas. Los fallos conservan la portada y permiten reintentar; sin fotos extra queda portada única. La capacidad está apagada por defecto fuera de los listados. Tarjetas de entidades no empresariales conservan sus fotos, sin tomar prestada la galería de otro negocio.

Decisión técnica documentada en el AGENTS local de tourism-card; raíz sin espacio disponible, reglas existentes intactas.

## Verificación

- Comparación completa antes/después de `/hoteles`, `/restaurantes`, `/casas-de-vacaciones` y `/experiencias` en 1440/834/430/390: 16 comparaciones con textos, enlaces y alturas de secciones idénticos; cero desbordes y cero errores de página.
- Galerías reales de hoteles y restaurantes: flechas adelante/atrás, fotos cargadas y una única imagen inicial, confirmadas en 1440 y 390. Gesto táctil nativo por CDP en 390 avanza a segunda foto. Los resultados preliminares ambiguos por esperas fijas se repitieron esperando estado e imagen efectivamente cargados.
- Navegación: Kuran Japonesa & Oriental abre en `/oriente-maya/valladolid/restaurantes/kuran-japonesa-oriental`, título real visible; regreso al listado PASS.
- Fotos adicionales y capturas inspeccionadas; la tarjeta conserva Recomendado y Guardar.
- 17 pruebas PASS: límite/deduplicación/portada única (3), firmas (1), elegibilidad de variantes (2), visibilidad (8), contrato BusinessCard (3).
- Compilación automática: última entrada build OK. Diff-check limpio.
- Governance dependency map, knowledge graph y artifact integrity PASS tras regenerar inventario. Product Authorization global conserva fallos de huellas históricas ajenas al lote; no se reconciliaron sin autorización explícita. Se evita duplicar la autorización vigente PCA-2026-101 para TerritorialListingReviewSurface; PCA-2026-118 registra el delta y los restantes archivos.
- Lint global agotó el límite de diez minutos; no se declara PASS. No se ejecutaron compilación ni revisión de tipos manuales.

## Pendientes y límites

Sin publicación automática. La revisión autenticada del Constructor, Safari/iPhone físico y cierre de autorizaciones históricas no están certificados. No se certifica carga de mil viajeros ni que esta mejora reduzca los tiempos variables del alojamiento. Evidencia de ejecución y capturas temporales en `/tmp/browser/card-gallery/`; este informe conserva resultados, no promete persistencia de esas capturas.