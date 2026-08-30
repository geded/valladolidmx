# G8-R1-F1K · Destinos premium sin fuga demo

## Diagnóstico confirmado

- Las siete rutas resuelven hoy `dest-{slug}` → `__tpl_destination__` → `DestinationSurface`; la autoridad `vmx.destination.premium-g4` no está conectada directamente al runtime público.
- `DestinationSurfaceContractBoundary` devuelve la superficie legacy cuando el flag está OFF y `premiumEligibility.eligible` es falso. Esto convierte la falta de medios en pérdida de toda la plantilla premium.
- `getPublicDestinationBySlug` y `getDestinationGalleryMedia` firman cualquier medio vinculado sin exigir acreditación G8-M1. Cinco destinos exponen actualmente portadas de `demo-media` con crédito “Imagen generada · demo”.
- Valladolid también queda inelegible: sus tres medios `studio-media/governed/v1p1c` están marcados `is_demo_seed=true` y como IA/conceptuales; no pueden representar una ficha real bajo esta autorización.
- Espita no tiene portada. Ninguno de los siete posee hoy un conjunto completo de portada + galería G8-M1; por tanto, los siete deben resolver Editorial con marcador neutral, dentro de G4.

## Implementación

1. **Autoridad fail-closed de medios de destino**
   - Reutilizar el contrato G8-M1 existente y extraer la evaluación pura/server-only necesaria para que todo archivo con `createServerFn` siga siendo un wrapper delgado.
   - Filtrar portada y galería antes de generar URLs: excluir `demo-media`, `is_demo_seed`, IA/conceptual, temporal, fixture, sin derechos declarados, sin checksum, no aprobado o pipeline no listo.
   - La salida pública sólo recibirá medios G8-M1 válidos; en caso contrario recibirá `null`/lista vacía. No se modifican ni borran activos o vínculos en base de datos.

2. **Conectar la familia G4 a datos reales**
   - Crear un adaptador puro de `PublicDestinationDTO + related + mapPoints + medios acreditados` al contrato existente `DestinationPremiumContent`.
   - No usar el fixture Valladolid ni sus textos/medios como fallback para otros destinos.
   - Derivar únicamente contenido real: breadcrumb, identidad, relato, highlights, navegación de servicios, mapa y tarjetas/relaciones disponibles.
   - Omitir galería y cualquier sección sin datos reales; ningún relleno con Unsplash, demo, fixture o tarjetas de ejemplo.

3. **Separar plantilla de modo visual**
   - Las siete rutas del piloto renderizarán siempre `DestinationPremiumSurface` G4 en modo Editorial, independientemente del flag global y de la elegibilidad cinematográfica.
   - La elegibilidad de portada gobernará sólo `cinematic`; sin portada G8-M1 se mantendrá Editorial y se mostrará el marcador neutral piedra/caliza dentro del hero premium.
   - El flag `omxds_visual_v1_contracts_enabled` permanecerá OFF y no se escribirá `entity_presentation_modes`.
   - Eliminar de la candidata el atributo `data-omxds-visual-foundations="disabled"` sin activar el flag global: la propia superficie de destino declarará localmente el contrato G4 efectivo para QA.

4. **Paridad funcional G4**
   - Mantener en la misma familia: hero, breadcrumb, navegación de servicios, relato editorial, galería sólo si está acreditada, mapa, cercanías/tarjetas reales, contexto territorial de Alux y acceso a Mi Viaje.
   - Reemplazar las tarjetas de ejemplo del G4 por colecciones reales ya cargadas por la ruta.
   - Mantener `noindex,nofollow` en las siete rutas del piloto y no tocar sitemap, publicación, producción ni el flag.

5. **Hub Preview Founder**
   - Crear una ruta interna/noindex que enumere los siete destinos y abra exactamente el runtime candidato con datos reales, no un renderer paralelo.
   - Mostrar por destino: modo efectivo, elegibilidad de portada, razón de fallback, conteo de medios acreditados y enlace de revisión.
   - Registrar la ruta en el inventario canónico obligatorio.

6. **Gates y evidencia**
   - Añadir pruebas de contrato que fallen ante `demo-media`, `is_demo_seed`, IA/conceptual/fixture, crédito demo, superficie legacy y activación cinematográfica sin portada válida.
   - Validar los siete destinos y el hub en 390/768/1440 con Playwright: una H1, cero overflow, cero consola crítica, cero medios/texto demo, G4 presente, Editorial efectivo, marcador neutral, mapa y secciones reales según disponibilidad.
   - Generar capturas completas para las 21 combinaciones destino/viewport y una matriz G4 → runtime por destino.
   - Ejecutar typecheck, pruebas focalizadas, lint, build, cobertura de rutas y gates de gobernanza; cualquier fallo deja el veredicto en NO-GO.

## Invariantes y rollback

- Sin migraciones ni mutación de contenido: la remediación es de resolución, filtrado y presentación Preview.
- Producción/publicación sin cambios; `noindex,nofollow` permanece; flag global OFF; Cinematográfica no se activa.
- Rollback: revertir el adaptador/filtro y retirar la ruta de hub Preview; los datos y medios permanecen intactos.
- STOP al entregar diagnóstico final, URL Preview, capturas, matriz y resultado real de gates. No declarar PASS ni publicar sin aprobación Founder.
