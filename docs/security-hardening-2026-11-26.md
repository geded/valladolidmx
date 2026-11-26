# Correcciones autorizadas de seguridad · 26 noviembre 2026

## Alcance y preservación
Corrección localizada de los cinco hallazgos del análisis profundo. No se modificaron plantillas Premium, CMS, importes registrados, reservas existentes, publicación, secretos ni configuración de taxis. Los únicos textos añadidos en descubrimiento aclaran «aprox.» cuando no se consulta una ruta de pago. El checkout no anuncia confirmación de pago antes de acreditarla.

## Cambios
- `order_items`: INSERT/UPDATE/DELETE revocados a visitantes y viajeros; lectura conservada, escritura por los RPC existentes. Confirmación compara precio, moneda y empresa con catálogo y rechaza diferencias sin alterar pedidos confirmados.
- Efectivo: la rutina vigente ya dejaba la solicitud del viajero en `awaiting_payment`, no `paid`. Se reforzó propiedad con comparación segura para valores nulos. El servidor permite confirmar lugares/enviar aviso de pagado solo a personal acreditado; el checkout no envía «viaje confirmado» por una mera solicitud de efectivo.
- Alux: claves nuevas emitidas por servidor y prueba HttpOnly de dispositivo, hash en la misma tabla de sesiones; control compartido en chat público, dock, memoria territorial, señales, captura de contacto y vinculación de cuenta. Tokens de cuenta inválidos se rechazan. No se permite apropiarse de filas antiguas sin prueba; historial local conservado y filas originales no se borran.
- Rutas: visitantes sin cuenta reciben estimación etiquetada, sin llamada facturada; cuentas verificadas conservan la ruta calculada y los controles actuales. No se agregó otro limitador.
- Taxi: se neutralizan prefijos de fórmulas (incluidos espacios y controles) antes de escaparlos para Excel.

## Evidencia
- 25 pruebas de Taxi/acceso/estimación y 2 de confirmación de efectivo PASS; pruebas adicionales de helpers de seguridad PASS.
- Dos navegadores: sesión anónima se reabre con su prueba HttpOnly; una cuenta distinta no puede leer ni vincularla; su propia sesión sí se vincula. Chat ajeno responde 403 antes de IA.
- Viajero temporal autenticado sin privilegios: escritura directa de líneas en tres operaciones devuelve 42501; solicitud de efectivo sobre pedido ajeno rechazada. Ninguna operación creó líneas ni modificó el pedido real.
- `/alux` en 390 px: pregunta turística real, respuesta 200 y texto visible. `/cuenta` autenticada abre correctamente. Capturas inspeccionadas.
- Permisos consultados: SELECT de líneas sí; INSERT/UPDATE/DELETE no. Compilación automática más reciente OK.
- 30 pruebas de anclaje, inyección y recomendaciones de Alux PASS. Integridad de gobernanza PASS (898 avisos históricos). Los cinco hallazgos autorizados se marcaron corregidos; nuevo análisis de backend sin hallazgos activos nuevos. No equivale a un nuevo análisis profundo completo.

## Límites y pendientes
- No se ejecutó cobro real ni confirmación de efectivo sobre una reserva propia; este último camino se comprobó con pruebas del handler y revisión de la rutina aplicada. No se tocaron reservas reales para forzar la prueba.
- No se certificó carga de 1,000 usuarios, Safari físico ni Alux insertado en terceros (cookies en iframe dependen del navegador).
- Endurecimiento amplio de voz, traducciones, límites simultáneos y acreditación del sitio de embed continúa pendiente. El entorno no dispone de un limitador estándar; uno adicional ad hoc necesita decisión informada, no se implementó silenciosamente.
- Fotos bajo dominio propio, pistas públicas y limpieza de archivos huérfanos pertenecen a la auditoría anterior: no están solucionados en este lote ni constituyen aislamiento de seguridad.
- Falta publicar el código. Las migraciones ya se aplicaron. No se promete invulnerabilidad ni ocultar todo código del navegador.

## Continuidad: voz, traducción y concurrencia
Después de que el Founder publicó el primer lote, se reforzó el consumo de IA sin tocar plantillas, CMS, reservas ni configuración editorial:

- El micrófono usaba `alux_public_check_rate`, que sólo cuenta mensajes escritos y por tanto nunca acumulaba transcripciones. Ahora valida audio, origen y tamaño antes de reservar consumo con el RPC atómico existente `mcp_rate_hit`.
- Lectura en voz alta, micrófono y traducción nueva tienen cupos propios por minuto, hora y día, además de un tope diario compartido. Una petición inválida o de origen ajeno no contacta al proveedor.
- Las traducciones ya guardadas se leen sin cuota ni IA. Sólo los lotes con frases ausentes pasan por el control, con límites de cantidad y caracteres.
- Los dos accesos web de Alux comparten la reserva `alux.public_message` antes de cualquier IA. La IA auxiliar de intención no se ejecuta si el canal está apagado, la entrada fue bloqueada o el cupo se agotó.
- Los avisos de voz muestran el mensaje seguro del servidor; las respuestas del proveedor conservan su estado HTTP y los streams impiden transformación de caché.

### Evidencia de continuidad
- 8 pruebas Vitest de cuotas/orígenes/voz, 2 de traducción y 55 históricas de Alux, sesiones y rutas: 65 PASS.
- Compilación automática e integridad de gobernanza PASS. Análisis rápido sin hallazgos activos nuevos; cinco avisos previamente descartados por el Founder se conservaron intactos. Prueba real de lectura «Hola»: audio SSE 200; origen externo: 403 sin llamada al proveedor.
- `/alux` en 390×844: pregunta turística real, respuesta editorial visible, contador `1/40 hoy`, cero errores y cero desbordamiento.
- `/restaurante/copalli-cafe` redirige a la ficha canónica; selector English, Copalli visible, lotes de traducción 200, cero errores y cero desbordamiento. El slug inexistente `cafe-copalli` mostró el 404 esperado y no se modificó.
- Este lote no requirió migraciones, escrituras CMS ni cambios en datos reales. Las cuotas usan tablas y RPC ya existentes.

### Cierre de fotos, traducciones y canal insertado
- Las rutas públicas `studio-media` y `media-derived` conservan su validación editorial y ahora entregan bytes de imagen desde la misma URL; nunca propagan `Location` ni una URL firmada. Se comprobó un JPEG original real de 596,014 bytes y variantes WebP con HTTP 200.
- Sólo fuentes reconocidas por el diccionario o el caché editorial pueden persistir traducciones. Textos arbitrarios se procesan aparte para el visitante sin publicarse ni contaminar el lote confiable.
- El Alux insertado recibe un token HMAC de 15 minutos con host y pistas normalizadas. El marco ya no acepta atribución mediante parámetros sin firma ni permisos de micrófono, geolocalización o portapapeles.
- Seis pruebas de imágenes y seis de tokens/traducción PASS; tipos sin errores. La auditoría de candidatos huérfanos no eliminó archivos: `EventSurface` y `PageShell` conservan protección documental y los demás no tenían evidencia suficiente para una retirada segura.

### Pendientes
Publicar este nuevo lote para aplicarlo al sitio público. La compra real/efectivo sigue reservada a un piloto autorizado. No se certificó Safari físico, carga de 1,000 usuarios, micrófono con audio humano real ni Alux dentro de un sitio externo real; el token se verificó con pruebas unitarias y la lectura de voz sí se ejerció contra el proveedor.

## Reversibilidad
Conservar las restricciones de precios y pagos; no volver a conceder escritura directa. Ante un problema de sesión, corregir el flujo de acreditación en un cambio trazable, sin autorizar claves ajenas ni borrar memoria. Las migraciones se revierten solo mediante una migración nueva autorizada. Los cupos pueden ajustarse en los llamados existentes sin cambiar el contrato visual ni crear otro limitador.
