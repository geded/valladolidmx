# Velocidad de Inicio y Valladolid · 2026-11-24

## Alcance autorizado
Founder: «Autorizado» (21:09 UTC), sobre mejorar carga inicial y buscar entrega de páginas ya preparadas. Mejora de transporte, no rediseño. Archivos: caché pública existente, middleware Start, identificador de publicación en Vite, pruebas y documentación. El permiso histórico PCA-2026-104 ya incluye Vite; PCA-2026-117 registra los archivos adicionales sin duplicarlo.

## Resultado
- Inicio y Valladolid reutilizan su HTML completo en `public_read_cache`, no otra tabla o modelo editorial. Se comprobó una fila real en Lovable Cloud, además de la reutilización local.
- Máximo 60 s, sin entrega stale ni otra copia CDN encima; marca CMS existente comprobada cada 5 s. No se promete actualización cero-milisegundos.
- Sesiones/cookies, Authorization, búsquedas/filtros/presentaciones, solicitudes de recarga, errores, respuestas privadas, Set-Cookie, Vary no compatible y HTML >1 MB no se comparten.
- Clave separada por publicación, URL/origen e idioma. Cuerpo codificado en base64 porque el stream SSR de desarrollo contiene NUL y JSONB no lo admite; se decodifica íntegro, sin cambiar el documento ni comprimir respuestas.
- Middleware de petición utilizado en preview/publicación, no depender exclusivamente de Cache API. En las dos rutas no se apila la copia del borde.

## Mediciones
Muestra local de peticiones HTML sin cookies: Inicio MISS 2.326 s → HIT 0.009 s; Valladolid MISS 3.019 s → HIT 0.188 s. Son tiempos de primer byte de laboratorio, no LCP ni métricas de producción después de publicar. Primera petición tras vencimiento o cambio CMS todavía renderiza: no se alcanzó la meta de primera visita <2 s universal.

Lecturas reales previas de los últimos 7 días: Inicio FCP p75 6.861 s (82), LCP p75 7.488 s (61), INP p75 120 ms (34). FCP/LCP superan 1.8/2.5 s; INP cumple 200 ms. Para CLS y otras rutas faltan 30 lecturas por serie; no se clasifican. Esta ventana incluye versiones anteriores y no acredita resultado del cambio.

## Preservación
Inicio: HomePremiumRenderer → HomePremiumSurface, composición Home del CMS. Destino: DestinationSurfaceProvider/ContractBoundary → DestinationPremiumSurface, DTO del destino y composición existentes. Presets, preview registry, CMS y superficies no editados.

Playwright antes/después completo en 1440/834/430/390: 8 recorridos por fase, HTTP 200, sin errores de página ni desbordes; textos, orden, dimensiones de todas las secciones idénticos. Inspección de capturas superiores/intermedias/pie en mosaico. Variaciones de carga de imágenes del mapa y una tarjeta diferida ya existentes; ninguna geometría o fuente visual nueva. No se afirma prueba autenticada del Constructor, que no fue modificado.

Se preservan ranking/paquetes/rotación, tarjetas, mapas, fotos, Alux, Mi Viaje, header/footer, breadcrumbs y SEO. Las fotos inferiores ya tenían carga diferida: no se quitó contenido de SSR ni se introdujeron placeholders para aligerar artificialmente el HTML.

## Controles
- 13 pruebas PASS: copia HTML compartida, caducidad, CMS, publicación, privacidad/origen, cache público, calentador y firma de fotos.
- Build automático OK; diff-check limpio.
- Inventario regenerado; proyecciones, dependencias, grafo e integridad Governance PASS.
- Governance de autorizaciones global no PASS: revisiones históricas no reconciliadas en manifiestos anteriores. No se actualizan pins ni evidencias sin autorización específica. Scope del delta declarado; no se declara cierre global.

## Demo y rollback
URLs preview: `/` y `/oriente-maya/valladolid`. Sin cuentas, siembra ni datos demo nuevos. Abrir dos veces con Accept:text/html sin cookies; `x-vmx-html` pasa de MISS a HIT. Recarga explícita no utiliza la copia. Producción no cambiada; necesita publicación del Founder y medición posterior.

Rollback: retirar `publicHtmlMiddleware` de la lista en src/start.ts y el bypass de las dos rutas en servePublicPage; deja lecturas/SSR anteriores y no requiere revertir datos del CMS. Filas temporales caducan y se invalidan con el mismo mecanismo CMS.

Pendiente externo: publicación, métricas posteriores y prueba de 1,000 visitantes. No se certifica capacidad concurrente ni rapidez universal.