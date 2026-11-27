# Taxi desde la ficha · corrección localizada

## Alcance
Recogida desde el GPS actual, destino de la ficha y cotización sólo con ambos puntos. Archivos de producto autorizados: `TaxiQuoteForm.tsx` y `taxi/rules.ts` (PCA-2026-122). No se modificaron plantillas, CMS, enlaces de regreso, marca, mapas, tarifas, zonas, pagos ni solicitudes reales.

## Verificación
- 3 pruebas nuevas: recogida anterior sustituida por GPS; destino Copalli preservado; sin cotización mientras falta recogida.
- 11 pruebas existentes de reglas, pago, registro y zonas pasan con su ejecutor Bun.
- Compilación automática OK e integridad del inventario PASS.
- Copalli → Taxi: GPS simulado 20.689/-88.202; destino real guardado de Copalli 20.6984763/-88.1418369; cotización pública de $290 MXN y enlace de regreso conservado. No se envió solicitud ni se activaron conductores.
- Recorrido Copalli → Taxi → volver en 1440/834/430/390: destino y coordenadas correctos, todas las secciones presentes, sin errores de navegador ni desbordes en la ficha. GPS denegado con recogida antigua guardada: recogida vacía, destino Copalli conservado y precio no calculado.

## Límites de cierre
El control global de autorizaciones conserva discrepancias históricas en revisiones reconocidas de archivos ajenos a este cambio; no se actualizaron esos permisos ni evidencias. Las nuevas rutas no se añadieron porque no existen rutas nuevas. El mapa de Google no está disponible en el origen del sandbox: su cartografía, GPS en iPhone físico y piloto con conductor no se certifican aquí. No se publica automáticamente.