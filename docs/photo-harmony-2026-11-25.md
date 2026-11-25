# Armonización de fotografías · 2026-11-25

## Delta implementado, no publicado
- Home: tarjetas móviles de destinos/experiencias y tarjetas de rutas 4:3; miniatura lateral de experiencias con proporción estable, independiente del texto. «Qué hacer» editorial usa 4:3 si está habilitado por CMS.
- Pueblos Mágicos: 21:9 escritorio; 4:3 móvil/tablet para no comprimir títulos y acciones.
- `PremiumShowcaseGrid`: tarjetas móviles 4:3; `PremiumCompactRow`: miniatura estable. Composición protagonista y columnas de escritorio conservadas.
- `TourismCard`: fotografías 4:3 también con contenido compacto; marcador sin fotografía conserva el formato aprobado. Ajuste alcanza recomendaciones en destinos, empresas, eventos, productos y otros consumidores de la tarjeta oficial.
- Región y tarjetas comunes de listados ya tenían 4:3. No se editan sus plantillas. Miniaturas de servicios de Home conservan su formato lateral específico.

## Autoridades y preservación
Home consume `vmx.home.premium-g4` mediante el renderer público y la biblioteca del Builder, ambos con `HomePremiumSurface`. Rutas/Atlas reutilizan `PremiumShowcase`. Listados/recomendaciones reutilizan `TourismCard`; fuentes DTO/CMS sin modificaciones. No se introduce autoridad nueva, módulo de persistencia ni regla global CSS.

Se conservaron contenidos, medios, enlaces, selección comercial, orden, portadas principales, galerías, encabezado/pie, mapas, Alux y Mi Viaje. No se guardó contenido CMS ni se cambiaron datos, permisos, cron, pagos o migraciones. Las capturas muestran contenido editorial preexistente; las discrepancias entre su fotografía y descripción no se corrigen en esta entrega.

## Rutas comparadas
`/`, `/oriente-maya`, `/oriente-maya/valladolid`, `/hoteles`, `/restaurantes`, `/casas-de-vacaciones`, `/que-hacer`, `/lugares`, `/eventos`, `/rutas`, `/oriente-maya/valladolid/restaurantes/copalli-cafe`, `/oriente-maya/valladolid/hoteles/mesondelmarques`, `/oriente-maya/valladolid/casas-de-vacaciones/casa-de-las-rutas`, `/oriente-maya/valladolid/experiencias/coqui-coqui-valladolid`, `/oriente-maya/valladolid/lugares/calzada-de-los-frailes`, `/eventos/zazil-tunich`, `/rutas/pueblos-coloniales`.

Cada ruta se comparó en 1440/834/430/390. Antes/después: texto y enlaces idénticos, cero desbordes de documento, cero errores de JavaScript registrados. Capturas generales y secciones Home disponibles durante la sesión en `/tmp/browser/photo-harmony`; no son una línea base permanente certificada. `/destinos` devuelve 404 antes y después, por lo que no cuenta como familia verificada. No se modifica su navegación en este lote.

Medidas móviles Home: destinos/experiencias 294×220; rutas 277×208; Pueblos Mágicos 279×209, todas aproximadamente 4:3. Diferente ancho responde al carrusel existente, no a otra proporción. Miniaturas de servicios 96×96 intactas. Pueblos Mágicos escritorio aproximadamente 398×171, 21:9.

## Controles
- 40/40 pruebas: galería y conexiones Premium runtime.
- Paridad de autoría Home: PASS.
- Lint localizado: cero errores, tres avisos Fast Refresh existentes.
- Compilación automática: OK tras los cambios.
- Governance Integrity: PASS, inventario regenerado.
- Product Authorization: FAIL por reconocimientos históricos desactualizados y superposición de PCA-2026-118/120 y PCA-2026-093/119/120. Sin reescritura de pruebas históricas ni reconciliaciones.
- Route Inventory: FAIL, dos maquetas de entregas anteriores no registradas. Esta entrega no crea rutas.
- La aserción histórica de presentación 16:9 compacta se retiró de la prueba de conexión; las pruebas no definen la nueva geometría visual. Esa geometría se compara en navegador.
- Flujo real: búsqueda «Copalli» en restaurantes → abrir ficha → volver al listado comprobado. No se certifica persistencia del filtro por este resultado.

## Pendientes bloqueantes para certificación completa
El constructor abrió con la cuenta del Founder y seleccionó Home, pero las pruebas posteriores no certificaron su canvas/paridad visual. No se guardó ni publicó. La interacción de galería no quedó verificada en esta sesión; 3 pruebas de lógica pasan, pero no sustituyen la interacción. Falta un producto individual publicado comprobado y Safari físico. Las familias restantes que no aparecen en la lista no están certificadas.

**Estado:** delta disponible en preview; no PASS conjunto Scope+Preservation y no certificación de toda la plataforma. Reconciliación de evidencias requiere autorización específica del Founder; no recomendar publicación como entrega totalmente certificada.