# Inicio · recuperación de Pueblos Mágicos · 2026-11-25

## Causa comprobada

En producción y preview, Pueblos Mágicos mostraba únicamente Valladolid. La sección filtraba `content.destinos.items` después de aplicar el máximo editorial de cuatro destinos. Las cuatro tarjetas eran Valladolid, Chichén Itzá, Ek Balam y El Cuyo: Espita e Izamal estaban presentes en el corpus publicado pero quedaban fuera del recorte.

## Delta autorizado

Corrección, no rediseño. La misma fusión de datos calcula la selección de Pueblos Mágicos antes del límite exclusivo de Destinos. No se amplía el carril Destinos ni se crean consultas, fuentes CMS o persistencia adicional. Conserva medios, textos y enlaces editoriales del corpus actual. La colección vacía se mantiene vacía, sin inventar pueblos.

Archivos funcionales: `home-premium-content.ts` (proyección opcional), `home-premium-real.ts` (selección y visibilidad), `HomePremiumSurface.tsx` (consumo de esa proyección).

## Autoridad y preservación

- Familia: Home Premium G4, bloque `vmx.home.premium-g4`.
- Público `/`: `HomePremiumRenderer` → `mergeHomeRealContent` → `HomePremiumSurface`.
- Constructor/preview: `composition-renderer.tsx` usa la misma fusión y superficie, acreditado por lectura; no certificado con sesión en este turno.
- Contrato/configuración/preset: sin modificaciones; `home-premium-config.ts` y el contrato del bloque siguen siendo la autoridad editorial.
- Fuente: `resolveHomePremiumRealContentQuery`, corpus de destinos publicado existente.
- Preservados: cuatro tarjetas de Destinos, portada, textos rectores, enlaces anteriores, orden de secciones, alturas, mapas, header/footer, Alux, Mi Viaje, marca, permisos y SEO de `/`.
- Revisión de metadata: `/` conserva `head` y `buildPublicHead`; no se añadieron rutas.

## Verificación

- 41/41 pruebas PASS (4 nuevas de selección y 37 de conexiones Premium).
- Lint de los tres archivos funcionales y la prueba nueva: PASS.
- Compilación automática: `build OK` (última entrada revisada antes del cierre).
- Inicio completo antes/después en 1440, 834, 430 y 390: todas las secciones con mismo texto, enlaces y altura salvo las dos tarjetas recuperadas de Pueblos Mágicos; la altura de esa sección tampoco cambia. Cero desbordamiento horizontal de página y cero errores de página.
- Navegación desde la tarjeta recuperada de Izamal y regreso a Inicio: tres pueblos presentes en los cuatro tamaños.
- Las tres fotos reales cargan, cada una con ancho natural 2400 px. Se revisó captura de la sección en desktop con las tres fotos cargadas y en móvil.
- Evidencia temporal local: `/tmp/browser/home-pueblos/` contiene capturas por sección y comparaciones JSON (no se entrega como documento permanente).
- Governance Integrity: PASS, inventario regenerado.

## Gates y limitaciones

- Alcance declarado en PCA-2026-119; sólo recuperación localizada. No se publica automáticamente.
- Product Authorization global sigue fallando por huellas históricas desactualizadas y coincidencia de permiso histórico de `HomePremiumSurface.tsx` (PCA-2026-093) con el delta nuevo. No se reescriben esas evidencias ni se declara PASS global.
- Route Inventory global falla por `/maqueta-galeria-tarjetas` de la tarea anterior. Esta corrección no añade rutas.
- Constructor autenticado y Safari en iPhone físico no certificados.
- No hay diferencia visual pendiente en el Inicio público verificado fuera del delta autorizado; no se declara certificación integral de la plataforma.

## Rollback

Restaurar los tres archivos funcionales al commit anterior retira únicamente esta proyección y devuelve el comportamiento anterior (un pueblo tras el recorte). No hay cambios de datos o migraciones que revertir.