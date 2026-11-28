# Roadmap

## Reservar mesa · selector de hora y zonas · 2026-11-27
- [x] Restaurar selector de hora disponible, excluyendo horas pasadas de hoy en Valladolid.
- [x] Sustituir botones de horarios por zonas reales del plano; conectar apartado y mesa reservada a la zona con los RPC existentes.
- [x] Copalli: hora → Cualquiera → apartado → cambio de fecha en 1440/834/430/390, sin errores ni desbordes; 14 pruebas y lint PASS, build automático OK. Sin reservación real ni publicación. Informe: docs/table-booking-zones-2026-11-27.md.
- [ ] Validar reserva de una zona real y comparativa completa del constructor: Copalli no tiene plano/zonas guardadas; la conexión de pruebas no permite ejecutar como visitante. Comparativa del mapa y recomendaciones diferidas no certificada por distinta carga en las capturas.

## Taxi Alux · vehículos, espera e ida y vuelta · 2026-11-27
- [x] Compacto/Camioneta/Van por tamaño del grupo, tarifa por vehículo, asignación sólo a autos donde caben.
- [x] Espera al recoger (min gratis + por minuto), hasta 2 paradas, ida y vuelta por horas con km incluidos y desglose al pedir.
- [ ] Confirmar con taxistas las tarifas reales (hoy valores de prueba).

## Taxi desde la ficha · 2026-11-27
- [x] Recogida con GPS actual (no borrador anterior), destino de la ficha y cotización sólo con ambos puntos; conservar diseño, regreso, tarifas y zonas. 14 pruebas PASS; Copalli → Taxi → volver en 1440/834/430/390, GPS denegado sin cotización ficticia. Informe: docs/taxi-current-origin-2026-11-27.md.
- [ ] GPS y mapa en iPhone físico y publicación: requieren dispositivo/origen autorizado; control global pendiente de reconciliación histórica ajena al delta.

## Botones de la ficha · 2026-11-27
- [x] «Agregar a Mi Viaje» parejo con Compartir/Guardar/Taxi en celular (misma caja que el botón compartido).
- [x] Poder desmarcar una parada ya agregada desde el mismo botón (hoy se desactiva y no deja quitarla).

## Fotos que fallan al cargar · 2026-11-26
- [x] Reintento y fondo crema en lugar de ícono roto/verde (EditorialMediaFrame)

## Protecciones autorizadas · 2026-11-26
- [x] Verificar y proteger precios y confirmación de efectivo, sin alterar reservas existentes.
- [x] Acreditar propiedad de la sesión al vincular memoria de Alux.
- [x] Restringir rutas facturadas sin bloquear descubrimiento anónimo.
- [x] Neutralizar fórmulas en exportación de pagos de Taxi.
- [x] Pruebas y recorridos autenticados/anónimos, compilación automática e integridad PASS; cinco hallazgos actualizados. Informe: docs/security-hardening-2026-11-26.md.
- [x] Founder publicó el lote el 2026-11-26; revalidación pública y piloto de compra/efectivo siguen sin sustituir pruebas reales con reservas del territorio.

## Continuidad de protección de IA · 2026-11-26
- [x] Voz: entrada y origen validados, cupo atómico antes de IA; micrófono 3/min, 10/h, 40/día; lectura 4/min, 20/h, 60/día, con topes compartidos. El contador anterior de micrófono no registraba consumo y fue sustituido por el existente `mcp_rate_hit`.
- [x] Traducciones: cupo sólo para frases nuevas (8 lotes/min, 120/h, 400/día; máximo 60 textos y 24,000 caracteres por lote); las guardadas no consumen IA ni cupo.
- [x] Conversaciones: ambos accesos comparten `alux.public_message` (4/min, 10/h, 40/día anónimo; 12/min, 30/h, 120/día con cuenta) antes de IA; intención auxiliar se omite con canal apagado, inyección o cupo agotado.
- [x] 65 pruebas PASS; compilación OK; integridad de gobernanza PASS; voz real 200 y origen ajeno 403; Alux móvil respondió con contador 1/40; Copalli en inglés sin errores/overflow. Publicación de este nuevo lote pendiente.
- [x] Fotos bajo dominio propio: bytes en la URL existente, sin redirección ni URL firmada visible; originales y variantes conservan validaciones.
- [x] Traducciones arbitrarias no se publican en caché; fuentes CMS/UI reconocidas sí. Alux insertado exige autorización HMAC de 15 minutos y no recibe permisos de micrófono, GPS o portapapeles.
- [x] Código huérfano: candidatos revisados; ningún activo aprobado o referenciado fue eliminado. Compra real/efectivo y prueba física de terceros quedan para piloto autorizado.

## Taxi Alux · 2026-11-25
- [x] Servicio integral activable sólo por administración, desactivado al inicio y sin conductores precargados.
- [x] Cotización por distancia/tiempo, disponibilidad comprobada, registro obligatorio del viajero y pago únicamente en efectivo al conductor.
- [x] Viajero: solicitud conservada al iniciar sesión, seguimiento e instalación de la app; correo siempre y avisos push cuando los autorice.
- [x] Taxista: enlace privado creado por administración para llenar sus datos personales, idiomas, sindicato y vehículo; revisión, invitación de cuenta y aprobación antes de recibir viajes.
- [x] Taxista: app instalable, disponibilidad, aceptación, ruta y estados del viaje.
- [x] Administración: tarifas, alta/aprobación de taxistas y pantallas de viajes en proceso, realizados y cancelados.
- [x] 8 pruebas de reglas, 290 rutas, tipos y recorrido completo con cuentas temporales: invitación, solicitud, aprobación, cotización $125, aceptación, llegada, viaje, efectivo y consulta por viajero/administración. Servicio y taxista temporal apagados al finalizar.
- [ ] Publicación, piloto con taxistas reales y validación física de instalación, push, correo y GPS en celular. Demo temporal `TAXI-8C9BB957` retenida según Demo Pack Policy; no eliminar sin la frase literal autorizada.

## Restaurante del hotel (botón A, luego herramienta B) · 2026-11-25
- [x] A · Vincular el restaurante/café del hotel a su ficha pública con tarjeta y botón directo a «Reservar mesa», administrable desde el Portal.
- [x] A · Comprobado con Copalli y hoteles piloto: bloque público en 1440/430, ancla «Reservar mesa» y alta/baja del vínculo desde el Portal (prueba temporal ya eliminada). Fix incluido: el aviso de refresco de caché ahora es disparador de la tabla de vínculos, antes fallaba al guardar. Falta sólo publicar.
- [ ] B · Herramienta de recepción para que el hotel aparte mesas en restaurantes del territorio para sus huéspedes (pendiente de diseño).

## Memoria y primeras aperturas · 2026-11-25
- [x] Diagnóstico de heap: SDK de Google Maps retiene contenedores anteriores; reutilización por el cargador existente y limpieza de overlays/picker implementadas sin modificar plantillas.
- [x] Lecturas frías de marca CMS y copia compartida en paralelo, deduplicadas por clave; fechas y límites de caché/fotos intactos. 31 pruebas PASS, compilación automática OK y flujo Copalli/galería/regreso comprobado en preview; 24 revisiones en 1440/834/430/390 sin errores/desbordes. Informe: docs/memory-speed-2026-11-25.md.
- [ ] Publicar y medir heap y primeras aperturas; Google Maps real requiere validación del Founder en origen autorizado. Gobernanza histórica superpuesta sigue bloqueada sin reconciliación explícita. Sin cambios de diseño, datos CMS, permisos, pagos, cron o capacidad contratada; no certificación de 1,000 usuarios ni Safari físico.

## Arranque de la app instalada · 2026-11-25
- [x] Copia guardada de la misma versión al abrir la app; datos renovados si tiene más de 2 min; pantalla de arranque iPhone Air.
- [ ] Confirmar en el iPhone del Founder tras publicar (segunda apertura en adelante).

## Armonización de fotografías · 2026-11-25
- [x] Alcance y plan aprobados: proporciones por función, sin rediseñar plantillas ni cambiar datos CMS.
- [x] Armonizar tarjetas de Inicio y recomendaciones compartidas a 4:3; Pueblos Mágicos 4:3 móvil y 21:9 escritorio para conservar legibilidad. Región y listados comunes ya cumplían. Portadas principales, galerías y miniaturas específicas intactas.
- [x] Comparar 17 páginas públicas válidas en 1440/834/430/390: mismos textos y enlaces, sin desbordes ni errores de JavaScript; abrir Copalli desde búsqueda y regresar. 40 pruebas y paridad Home PASS; lint sin errores y Governance Integrity PASS. Informe: docs/photo-harmony-2026-11-25.md.
- [ ] Cierre pendiente: Product Authorization bloqueado por evidencias históricas y permisos superpuestos (requiere autorización de reconciliación); inventario omite dos maquetas anteriores. Constructor abre con sesión pero su canvas no quedó certificado; galería interactiva no certificada en este lote, productos individuales sin ejemplo público comprobado y Safari físico requieren revisión. No publicar como certificación completa.

## Pueblos Mágicos de Inicio · 2026-11-25
- [x] Recuperar Valladolid, Izamal y Espita publicados sin que el máximo editorial de Destinos recorte esta sección; conservar fuentes CMS, fotografías y diseño.
- [x] 41 pruebas y lint localizado PASS; Inicio completo idéntico fuera de las dos tarjetas recuperadas en 1440/834/430/390; fotografías reales y navegación Izamal/regreso verificadas. Informe: docs/home-pueblos-magicos-2026-11-25.md. Sin escritura CMS ni publicación automática.
- [ ] Controles globales pendientes por autorizaciones históricas y la maqueta anterior ausente del inventario de rutas; Constructor autenticado y Safari físico no certificados. No se alteran evidencias históricas sin autorización del Founder.

## Galería aprobada en tarjetas · 2026-11-24
- [x] Integrar hasta cinco fotos de la misma empresa en las tarjetas oficiales de listados, sin alterar contenido, orden, visibilidad, enlaces ni geometría.
- [x] Cargar fotos adicionales sólo al interactuar; flechas, puntos, gesto táctil real en Chromium móvil, lectura de fotos y entrada/regreso a ficha comprobados.
- [x] Comparar hoteles, restaurantes, casas y experiencias completos en 1440/834/430/390: mismos textos, enlaces y alturas de secciones, sin desbordes; 17 pruebas PASS y compilación automática OK. Informe: docs/card-gallery-2026-11-24.md. Sin publicación.
- [ ] Cierre de controles globales: autorizaciones históricas con huellas desactualizadas; lint global excedió diez minutos; constructor autenticado y Safari físico pendientes. No se modificaron evidencias históricas ni permisos para forzar PASS.

## Velocidad de Inicio y Valladolid · 2026-11-24
- [x] Revisión tras publicación (21:28 UTC): copias HTML guardadas 85–87% menores, tiempos internos medibles; navegación empresa/regreso comprobada, sin 403 ni cambios de plantillas. Demora de alojamiento pendiente de medir tras nueva publicación.
- [x] Reparar foto de ruta en Valladolid: no anunciar variantes de asset borrador; conserva original configurado (200), permisos y contrato. Preview 1440/834/430/390 sin fotos rotas.
- [x] Reutilizar HTML público ya renderizado en la caché existente, limitado a Inicio y Valladolid; excluir sesiones, filtros, borradores y respuestas privadas.
- [x] Conservar invalidación CMS, versiones de publicación, fotos, orden editorial y reglas de visibilidad; 13 pruebas PASS y comparación completa en 1440/834/430/390 sin cambios de contenido ni geometría.
- [x] Medir primera publicación: copia HIT funciona pero Inicio conserva esperas variables; 0 respuestas 403, detectado 404 de foto y reparado en preview. Informe en docs/public-speed-2026-11-24.md.
- [ ] Publicar reparación de 21:28 y medir espera del alojamiento con Server-Timing (espera Founder). 1,000 visitantes simultáneos, Constructor autenticado y reconciliación de evidencia histórica no certificados.

## Alta de Copalli Café · 2026-11-23
- [x] Ficha con datos de Google, horario, contacto y carta de bebidas (74 opciones).
- [x] Logo, portada y 9 fotos de su Facebook subidos desde el CMS.
- [x] Facebook agregado y ficha publicada (Founder autorizó «Publicar ya»).
- [ ] Confirmar con el dueño la hora de cierre (Google 18:00; Facebook menciona 15:00) y si quiere agregar su carta de comida.

## Menú de restaurantes y cafeterías · 2026-11-23
- [x] Guardar la carta por secciones dentro de la ficha de la empresa.
- [x] Cargar foto o PDF de la carta: Alux la lee y el editor revisa antes de guardar.
- [x] Editar la carta desde el CMS y desde el Portal de la empresa.
- [x] Alux encuentra y recomienda por lo que trae la carta (precio solo de referencia).
- [x] Mostrar la carta en la página pública del restaurante (Founder aprobó mostrarla; antes/después enviado).
- [ ] Pendiente: foto por platillo (opcional) y probar la carta desde el Portal con una cuenta de empresa real; aprobación visual del Founder antes de publicar. Carta de ejemplo en «Fogón de Espita» (demo) se conserva hasta la frase de validación.

## CMS fácil de usar: no perder lo escrito al salir a copiar datos · 2026-11-21

- [x] Al volver a la app, el CMS ya no se vacía mientras se confirma la sesión.
- [x] La app no se actualiza sola mientras un editor tiene cambios sin guardar (se aplica al guardar y salir, o con «Actualizar ahora»).
- [x] Respaldo de lo escrito y del punto de la pantalla en empresas, destinos, zonas, regiones, rutas, eventos, productos, categorías y ahora también Lugares y sitios de interés.

## CRM del concierge en dos secciones · 2026-11-21

- [x] Plan del CRM: comparación continua con el Alux de Zazil en cada fase (reglas, mismas preguntas de prueba, informe igual/mejorado/falta), adaptada a varios destinos y empresas; sin implementar.
- [x] Plan del CRM: reglas de conversación heredadas de Zazil (idioma fijo, memoria de nombres y datos, saludo que varía, tono humano) agregadas como sección 1b al plan y a la propuesta 19.48; sin implementar.

- [x] Plan del CRM: fase 5 «WhatsApp de cada empresa» (QR por empresa, Alux con su catálogo y sus propios precios) agregada al plan y a la propuesta 19.48; sin implementar, pendiente de aprobación.

- [x] Documentación oficial: propuesta 19.48 «CRM Alux de Prospectos» registrada como mejora del seguimiento de prospectos con Alux (índice oficial y hoja de ruta), sin implementar.

- [x] Correo de GitHub «Governance Integrity falló»: los documentos del plan del CRM no estaban registrados en el inventario de gobernanza; registrados y revisión PASS.

- [ ] Replantear alcance: Alux como agente de ventas (web + WhatsApp), captura progresiva de datos, regreso al registro y venta directa por WhatsApp (plan en revisión).
- [ ] Replicar y mejorar el CRM Alux de Zazil Tunich (etapas, tablero, pase a asesor, comandos #, avisos, cierre automático por pago) — plan en revisión.
- [x] Revisar el CRM de Zazil Tunich en vivo (reglas, configuración, embudo) y las 9 capturas; plan ajustado.
- [ ] Traspaso prospecto → viajero: enlace de registro prellenado, viaje en borrador y expediente con ficha de traspaso para el mismo concierge (en plan).
- [ ] Alux en WhatsApp contesta sobre todo el territorio y pregunta «¿Lo agrego a tu viaje?» (en plan).
- [ ] Regla de venta: solo experiencias se venden directo con enlace de pago; lo demás pasa al concierge, que busca los mejores precios (en plan).
- [x] Conexión de WhatsApp elegida: QR como Zazil (Evolution en Railway), con líneas administradas desde el panel.
- [ ] Organización: CRM Prospectos (Hoy, Pláticas, Prospectos, Estadísticas) en el panel del concierge; configuración, reglas, entrenamiento y canales de Alux en las pantallas de Alux del CMS que ya existen, con acceso directo (en plan).
- [x] Recibir del Founder la dirección y clave del servidor Evolution de Railway (guardadas 2026-11-21; servidor responde, versión 2.3.7).

- [x] Definir y aprobar el alcance del CRM Prospectos + CRM Arma tu viaje (plan aprobado 2026-11-21).
- [x] Fase 1 · Captura consentida de nombre y WhatsApp en Alux (ventana flotante) y sección «CRM Prospectos» (Hoy, Prospectos, Pláticas, Estadísticas, ficha con etapa, temperatura, responsable, seguimiento y notas); aviso al equipo sin teléfono; bandeja renombrada «CRM Arma tu viaje».
- [ ] Fase 1 · pendiente: tarjeta de contacto también en la página completa /alux (usa otra conexión de Alux) y comparación con las mismas preguntas en Zazil — espera aprobación del Founder.
- [x] Fase 2 · WhatsApp: líneas `vmx-*` por QR desde «Líneas de WhatsApp», bandeja durable de avisos, Alux contesta en el idioma del cliente con el catálogo publicado, pase a concierge con aviso al equipo, comandos #alux/#apagar/#cotizar/#enlace/#nota/#agenda, escribir desde el panel con traducción, «Ver en español», «Tomar plática» / «Devolver a Alux».
- [ ] Fase 2 · pendiente: escanear el QR de la línea «Concierge Valladolid.mx» con el teléfono (espera al Founder) y probar con un mensaje real después de que la vista previa en línea se actualice o tras publicar.
- [ ] Fase 2 · pendiente: comparación con las mismas preguntas en el Alux de Zazil (Zazil sin créditos de IA el 2026-11-21).
- [ ] Fase 2 · pendiente: «¿Te escribo por WhatsApp?» desde la web y el primer mensaje que retoma la plática (no construido).
- [x] Fase 3 · Enlace personal (crear cuenta o pagar una experiencia con venta directa) que pasa al prospecto a Mi Viaje y CRM Arma tu viaje sin duplicar; etapas que avanzan solas con propuestas y pagos; Rescate de propuestas vencidas y Recontactos de 30 días en «Hoy»; comando #enlace.
- [ ] Fase 3 · pendiente: respuestas del Founder sobre pago sin cuenta y si Alux escribe solo el recontacto (se usó «crea cuenta y paga» y «Alux escribe solo»); ningún mensaje real se envía hasta publicar y vincular el QR.
- [x] Preventa (como en Zazil): sección «Preventa» junto a Reservaciones con folio PRE-, personas, total, vigencia de 24 horas por omisión, ampliar, cancelar y reenviar; una sola activa por cliente; solo pago total por el cobro actual de la plataforma.
- [x] Preventa · «de nuevo el enlace» = reenviar la preventa al cliente: ya existe con «Copiar enlace» y «Mandar por WhatsApp» en cada preventa (al reenviar se crea enlace nuevo y el anterior deja de servir).
- [ ] Preventa · pendiente: prueba con un pago real tras publicar y vincular el QR de WhatsApp.
- [x] Fase 4 · Estadísticas por canal (Hoy, 7 días, 30 días, Este mes, Todo; ventas, cobrado, con concierge, enlaces de pago; exportar a Excel).
- [x] Fase 4 · Entrenamiento de Alux: ficha oficial de cada destino con etiquetas clave (aplica al instante en web y WhatsApp) y lista de preguntas que Alux no supo contestar.
- [x] Fase 4 · Canales de Alux: interruptores para Alux en Valladolid.mx y WhatsApp; Instagram y Messenger como «sin conectar».
- [x] Fase 4 · Código para poner la ventana de Alux en otras páginas web (pedido por el Founder 2026-11-22).
- [ ] Fase 4 · pendiente: comparar las mismas preguntas con el Alux de Zazil (sin créditos de IA) y publicar con el visto bueno del Founder; el código para otras páginas funciona solo tras publicar.
- [ ] Fase 3 · pendiente: control de gobernanza con tres archivos generados compartidos por autorizaciones anteriores (types, inventario de rutas, árbol de rutas) — requiere decisión del Founder.
- [x] Fase 5 · WhatsApp de cada empresa: Portal → «WhatsApp con Alux» (conectar por QR, «Cómo se presenta», «Preguntas y respuestas», «Pláticas» con etapa y notas); Alux hereda las reglas de la Consola y contesta solo con la ficha, productos con sus precios, horario, ubicación y preguntas de esa empresa; se presenta como «Alux, el asistente de [Empresa]»; contactos y pláticas de la empresa no se mezclan con CRM Prospectos.
- [ ] Fase 5 · pendiente: escanear el QR con el teléfono real de una empresa y probar mensajes reales (tras publicar); datos de demostración en «DEMO · Experiencias Sac-Be» (línea «DEMO Fase 5 · datos temporales», dos pláticas de Laura y dos preguntas) se conservan hasta la frase de validación del Founder.

## Monitor de visitantes y registro de viajeros · 2026-11-20

- [x] Estadísticas del monitor visibles: la pantalla Inteligencia del visitante fallaba para todos (lectura de un esquema no expuesto) y se topaba en 1,000 registros; ahora lee todo por páginas. Verificado como administrador: 1,084 visitantes y 1,739 visitas en 30 días.
- [x] Entrada «Inteligencia del visitante» en el menú del CMS (sólo administradores).
- [x] Correo «Nuevo viajero registrado» al administrador; probado con un viajero de prueba: enviado a geded@valladolid.com.mx.
- [x] El monitor registra el paso Anónimo → Identificado y cada invitación a registrarse (sólo tipo y motivo, sin datos personales).
- [x] Monitor preciso: desde ahora sólo cuenta visitas del sitio publicado; descarta vista previa, pruebas automáticas y robots declarados (las cifras anteriores al 20 nov siguen incluyéndolos).
- [ ] Opción voluntaria para dejar WhatsApp o correo sin crear cuenta, para que un concierge contacte al visitante (espera aprobación del Founder del diseño).
- [ ] Herramienta de simulación del monitor sigue usando la lectura antigua (sólo pruebas internas, no afecta cifras reales).

## Alux · resumen de reseñas de Google · 2026-11-20

- [x] Alux muestra solo, al abrirse desde una ficha, «Este es un resumen basado en las reseñas de [Nombre]» con el resumen oficial de Google (Gemini) sin modificar, encabezado, divulgación y enlaces exigidos.
- [x] Dos momentos: planeando («Estás explorando…») y en sitio con ubicación («Estás a 150 m de…»).
- [x] Negocios, lugares, experiencias (reseñas del negocio) y eventos (negocio o sede); en recomendaciones del chat se despliega a petición.
- [x] Probado: Casa Tía Micha, Zazil Tunich, Cena Romántica (evento y experiencia) y video mapping «Valladolid en la Historia» (Iglesia de San Gervasio).
- [ ] Landing premium de Zazil Tunich (vista Founder): su panel de Alux aún no está conectado a la ficha; conectarlo cuando la landing sea oficial (espera decisión del Founder).
- [x] Alux respeta «de noche»: ya no ofrece cenotes o lugares sin evidencia nocturna (caso Suytun).
- [x] Al responder, Alux se coloca al inicio de la respuesta, no al final de las tarjetas.
- [x] Probar «¿Qué hacer de noche en Valladolid?»: salen video mappings, cenas y bares nocturnos.
- [x] Eventos en Alux: muestran la próxima función y nunca fechas pasadas.
- [x] Alux: respuestas ya no se cortan a los 9 s (aviso «conversación avanzada no disponible»).
- [ ] Alux conoce bien todo el Oriente Maya: faltan fichas publicadas (Izamal sin lugares; Ek Balam, Las Coloradas y Río Lagartos sin lugares ni negocios; Chichén Itzá, Tizimín, El Cuyo, etc. no son destinos). Espera decisión y contenido del Founder.
- [ ] Destinos (pueblos) no tienen resumen de reseñas en Google; se queda sin resumen.

## Revisión automática de gobernanza al día · 2026-11-20

- [x] Paso 0 · Formato: 217 archivos acomodados solo en espacios/saltos; 7 archivos con versión exacta aprobada o texto fijado por pruebas se dejaron intactos. Mismas pruebas que antes.
- [x] Paso 1 · Avisos de código: 34 grupos resueltos (marcas de deuda conocida en módulos de correo/servidor, 4 correcciones de hooks sin cambio de comportamiento, BusinessSurface fijado por su prueba). Lint gate PASS; 1,046 pruebas con los mismos 7 fallos previos; Qué hacer, Experiencias y Mi Concierge verificados en 390 px.
- [x] Paso 2 · Registros de gobernanza: inventario de artefactos sin registrar y conteo de brechas.
- [x] Paso 3 · Huellas de versiones aprobadas (PCA) y controles I3/I4 desactualizados por meses de trabajo.

## Compactación de fichas existentes · 2026-10-23

- [x] Alcance inmediato: hoteles, restaurantes, casas de vacaciones, lugares/sitios de interés y eventos; sólo espacios y presentación, sin cambiar plantillas, contenido, orden ni funciones.
- [x] Preflight autenticado de las cinco familias: negocios abren bloques individuales demo; eventos abre Kit genérico; lugar no muestra ficha en el lienzo observado. Informe: docs/governance/audit/2026-10-23-COMPACT-FICHES-PREFLIGHT.md. Scope de lectura PASS; Preservation de implementación BLOQUEADO.
- [x] Founder autoriza revisar y corregir la conexión constructor/público sin modificar forma ni estructura, sustituir datos CMS ni publicar.
- [x] Autorización reiterada 2026-10-23 04:47 UTC: ejecutar puntos 1 y 2 (reconciliación y compactación) exclusivamente en las cinco familias indicadas; no publicar.
- [ ] Reconectar únicamente cuando sea posible preservar composición y controles editoriales existentes; comparar la plantilla completa antes de compactar. Revalidación 04:40: Sutuk SÍ carga al esperar el selector; el bloqueo no es transferencia al iframe, sino composición granular distinta. Se descarta preview alternativo que oculte la divergencia o pierda edición.
- [ ] Compactar espacios y armonizar tamaños de textos en celulares para hoteles, restaurantes, casas de vacaciones, lugares/sitios de interés y eventos; referencia de legibilidad Airbnb, conservando fuente de marca, forma, estructura y funciones. Comprobar 1440/834/430/390 y acciones en 360.
- [x] Lugares: restaurado registro del bloque aprobado y selector de entidad real; Calzada de los Frailes carga en el lienzo autenticado sin cambiar composición. Espacios y ritmo del texto compactados sólo en PlacePremiumSurface. Comparativa 1440/834/430/390: mismos textos, enlaces, fotos y secciones; cero overflow; 45 pruebas PASS y build automático OK. Informe: docs/governance/audit/2026-10-23-COMPACT-FICHES-PARTIAL.md. Sin CMS ni publicación.
- [x] Negocios y eventos (hoteles, restaurantes, casas de vacaciones, eventos): márgenes entre secciones compactados sólo en las envolturas de BusinessSurface y EventPremiumSurface (`mt-10`→`mt-8 sm:mt-10`, resumen `mt-8`→`mt-6 sm:mt-8`), sin tocar bloques compartidos con destinos/rutas. Comparativa antes/después de las cinco fichas reales en 1440/834/430/390: textos, enlaces, medios y estructura idénticos; sólo bajan las alturas por el espacio recuperado. 20/20 pruebas de contrato PASS y build automático OK. Informe: docs/governance/audit/2026-10-23-COMPACT-FICHES-NEGOCIO-EVENTO.md. Sin CMS ni publicación.
- [ ] Tipografía de títulos de sección en móvil: ExperienceSection es compartido con destinos y rutas; compactar sus títulos requiere una capacidad nueva del bloque oficial y queda documentado como deuda, no implementado sin autorización específica.
- [ ] Negocios/eventos: bloqueo de preservación pendiente de definición del ownership entre nodos granulares editables y secciones públicas; no se sustituye el árbol ni se compactan superficies divergentes. Controles globales Route Inventory/Governance siguen fallando por deuda previa; aceptación visual humana y prueba 360 pendientes.

## Armonía visual de todas las plantillas públicas · 2026-10-23

- [x] Alcance confirmado: Inicio, región, destinos, listados y fichas; sólo presentación, conservando partes y funciones establecidas.
- [x] Inventario de autoridades y preflight de primera ficha: Sutuk público recorrido en 1440/834/430/390; recomendaciones ya compactas 240px/16:9. Informe: docs/governance/audit/2026-10-23-PUBLIC-TEMPLATE-HARMONY-PREFLIGHT.md.
- [ ] BLOQUEADO: «Hotel Premium» abre **tpl_business** con bloques individuales, sin recomendaciones de la ficha pública. Revalidación: hotel-sutuk SÍ reemplaza los datos demo al esperar la carga; persiste la diferencia de composición. Conexión autorizada sin cambiar estructura; reconciliación debe preservar controles editoriales y datos. Sin cambios visuales, CMS ni publicación.
- [ ] Comparación visual y aceptación de primera muestra antes de extender a otros lotes; depende de resolver la divergencia. Scope Gate de investigación PASS; Preservation Gate de implementación BLOQUEADO.

## Armonía de acciones en tarjetas del destino · 2026-10-23

- [x] Retirado únicamente «Ver ruta» de las tarjetas de Rutas y Sigue explorando en DestinationPremiumSurface; conservados enlace de toda la tarjeta, señal Alux, contenido CMS, fuentes de imágenes, duración y paradas. Comparativa de nueve secciones en 1440/834/430/390: sólo cambia la acción retirada y altura de esas tarjetas, demás contenido y dimensiones intactos; cero errores/desbordes. Navegación real a /rutas/pueblos-coloniales PASS en cuatro tamaños, cuatro contratos PASS, build automático OK. Capturas móvil/tableta inspeccionadas; fotos diferidas no cargaron en esas capturas, disponibilidad no certificada. Sin publicación ni cambios CMS; constructor y aceptación humana pendientes.

## Enlaces compactos del destino en celular · 2026-10-23

- [x] Reducidos sólo texto, separación e iconos de Explorar servicios, Compartir y Agregar a Mi Viaje en DestinationPremiumSurface por debajo de tableta; áreas táctiles de 44px. Valladolid completo comparado en 1440/834/430/390: nueve secciones, contenido/enlaces/fuentes de medios intactos y geometría de las demás secciones idéntica; cero errores de página/desbordes, cuatro contratos PASS y build automático OK. Captura 390 inspeccionada: tres acciones en una fila. Sin CMS ni publicación.
- [ ] Verificación de apertura de Compartir no completada: el clic no mostró la hoja en la automatización; lógica compartida intacta, pendiente comprobar interactividad del entorno antes de certificarla. Constructor autenticado y aceptación humana pendientes.

## Tarjetas compactas inferiores del destino · 2026-10-23

- [x] Compactadas únicamente Rutas, Sigue explorando y Cerca del destino: tarjetas de 240px, imágenes 16:9 (238×134 interiores como hoteles), filas deslizables y títulos locales compactos. Catálogo regional conserva su rama sin cambios. Comparativa pública Valladolid 1440/834/430/390: nueve secciones, textos/enlaces/fuentes de medios intactos, geometría de las demás secciones idéntica, cero errores/desbordes. En 390 desplazamiento rutas/cercanos y enlace /rutas/pueblos-coloniales PASS; capturas móviles inspeccionadas. Cuatro contratos PASS, build automático OK. Algunas fotos no cargaron en las capturas: disponibilidad completa de medios no certificada. Sin publicación ni cambios CMS; constructor autenticado y aceptación humana pendientes.

## Acciones del destino en una sola fila · 2026-10-23

- [x] Corregido sólo el ancho del grupo Explorar servicios / Compartir / Agregar a Mi Viaje en DestinationPremiumSurface: sin límite de 22rem y sin salto desde tableta. Capturas 1024/834 inspeccionadas: tres acciones en una fila. Comparativa 1440/1024/834/430/390: nueve secciones, textos/enlaces/fuentes de imágenes intactos y dimensiones de secciones restantes idénticas; Compartir PASS, cero errores/desbordes, textos largos PASS. Cuatro pruebas de contrato del destino PASS y build automático OK; contrato G5 de presentación falla por marca corta existente, ajena a esta clase CSS. Sin cambios CMS ni publicación; constructor autenticado y aceptación humana siguen pendientes.

## Equilibrio de presentación y descripción del destino · 2026-10-23

- [x] Etiquetas centradas al pie de la galería; título a la izquierda y acciones distribuidas en desktop/tableta, agrupadas a la izquierda en móvil. Sólo DestinationPremiumSurface; navegación y contenido intactos.
- [x] Descubre: foto horizontal sobre el texto hasta 1023 px; desde 1024 px, dos columnas con proporción fija y foto que acompaña el desplazamiento, sin estirar ni truncar descripción.
- [x] Valladolid comparado en 1440/834/430/390: nueve secciones, mismas fuentes de fotos, textos y enlaces; sólo cambia geometría de presentación y Descubre. Compartir abre, cero errores de página y desbordes; descripción cuatro veces más larga comprobada sin escrituras CMS. 59 pruebas PASS, build automático OK, diff-check limpio. Capturas en /tmp/browser/destination-balance. Disponibilidad completa de fotos no certificada por cargas diferidas variables.
- [ ] Aceptación visual del Founder y comprobación autenticada en el constructor pendientes; controles globales conservan deuda previa fuera del alcance. Sin publicación.

## Etiquetas navegables y acciones de viaje · 2026-10-23

- [x] Preferencia sustituida por la corrección del Founder: sólo etiquetas centradas; título y acciones equilibrados según dispositivo (ver sección anterior).
- [x] Plan aprobado e implementado: Arma tu viaje junto a las etiquetas institucionales, sin botón grande duplicado; Agregar a Mi Viaje conserva su función. Enlaces internos de los distintivos reutilizan el renderer compartido y no abren pestañas nuevas.
- [x] Región conserva origen validado contra destinos publicados y muestra Volver al destino; Pueblo Mágico llega al ancla de su sección existente. Arma tu viaje conserva destination/destinationLabel y breadcrumb de regreso también con composición publicada.
- [x] Playwright 1440/834/430/390: los tres enlaces y vuelta a Valladolid PASS, Compartir PASS, cero errores/desbordes. Comparación de toda la ficha: sólo cambia presentación del hero; otras secciones conservan textos, enlaces, medios y dimensiones. 7 pruebas existentes PASS; build automático OK.
- [ ] Pendiente aceptación visual humana y constructor autenticado; controles globales Route Inventory/Governance conservan deuda previa documentada. Sin publicación.

## Franja de presentación del destino · 2026-10-23

- [x] Ajuste autorizado: título y acciones distribuidos en escritorio/tableta, una columna compacta en móvil y menor separación antes de Descubre. Sólo DestinationPremiumSurface; sin nuevos contenidos, cambios CMS, fotos, mapa, Alux, tarjetas, navegación o publicación.
- [x] Valladolid antes/después en 1440/834/430/390: cero errores/desbordes; Compartir abre en los cuatro anchos; contenido, enlaces, imágenes y dimensiones de las secciones ajenas al delta idénticos. Capturas de la franja inspeccionadas. Cinematográfico mantiene su disposición anterior al no habilitar distributed/compactTop. 20 pruebas PASS; build automático OK y diff-check limpio.
- [ ] Cierre global pendiente: Route Inventory reporta rutas previas sin registrar y Governance conserva artefactos ausentes/gap obsoleto (607 avisos). No se alteran registros ni rutas fuera de alcance; constructor autenticado y aceptación visual humana pendientes, sin publicación.

## Portada y Descubre del destino armonizados · 2026-10-23

- [x] Ajuste autorizado en DestinationPremiumSurface: en celular la portada pasa de altura fija 288 px a proporción 4:3 (igual que la foto de "El destino"), el título "Descubre" baja de text-3xl/4xl a text-2xl/3xl (igual que "Galería") y el texto descriptivo pierde el aumento sm:text-lg. Sólo clases de presentación; sin cambios de estructura, contenido, medios, funciones ni CMS.
- [x] Verificación móvil 430/390/360: portada llena el ancho y manda visualmente sobre la foto de descripción, título a 24 px, cero errores de página; build automático OK. El contrato G5 sigue en deuda previa documentada (marca corta), ajena a esta clase CSS. Capturas en /tmp/browser/dest-hero-fix. Aceptación visual humana pendiente; sin publicación.

## Validación de subidas, IA y ampliación · 2026-10-22

- [x] Auditoría de código de subidas CMS/Portal/selector compartido, búsqueda/generación IA y ampliación: derivación tras registro conectada; 15 contratos PASS y codificación WebP en navegador comprobada sin persistencia. No certificación de subida autenticada ni IA real: no se subieron fotos ni consumió generación.
- Hallazgos para corrección autorizada: AluxMediaSourceButtons sólo entrega File y pierde metadatos de autor/fuente/licencia/IA; ampliación IA no valida dimensiones devueltas; galería permite omitir evaluación de tamaño. Derivación en segundo plano no garantiza copias si falla/cierra navegador; <400 px, GIF/SVG y formatos sin soporte pueden conservar original. Fotos personales/documentos no quedan certificados por el flujo de medios CMS. No se declara cobertura universal ni blindaje completo.

## Optimización integral de imágenes · 2026-10-22

- [x] Conectar variantes existentes a consumidores públicos compartidos de listados, destinos, rutas, experiencias, eventos, productos relacionados y logotipos; originales, editor y datos editoriales sin cambios. Zonas conservan la subida compartida; no se inventó una superficie pública inexistente.
- [x] Verificar contratos (65 tests PASS), 36 recorridos públicos en 1440/834/430/390 (0 errores, 0 overflow, 0 peticiones originales detectadas en la muestra) y eventos/experiencias/Sutuk (0 imágenes rotas); documentar alcance y limitaciones en docs/media-optimization-2026-10-22.md. No publicación ni cambios de fichas.

## Auditoría de hoteles y restaurantes · 2026-10-22

- [x] Auditar fichas capturadas, fotos, filtros públicos, Alux/coordenadas, visibilidad y optimización; sólo lectura, sin cambios de datos, diseño ni publicación. Informe entregado: 30 hoteles + 30 restaurantes de Valladolid, 2 restaurantes regionales y 464 activos; pendientes de acreditación fotográfica, horarios/zonas, Alux comercial/cercanía y variantes documentados, sin declarar verificaciones end-to-end no realizadas.
- [x] Reauditar altas de hoteles/restaurantes, destinos, zonas, rutas y experiencias, optimización por subida y entrega pública, e integración con Alux/Arma tu Viaje; informe en Files `auditoria-altas-imagenes-alux-2026-10-22.md`. Sin cambios de fichas, imágenes, diseño ni publicación. Captura disponible; entrega ligera integral y calidad de recomendaciones pendientes de corrección autorizada; subida real y guardado de viaje no certificados en esta auditoría.

## Capacidades de plataforma (IA + infraestructura)

- [x] Streaming del chat de Alux: `generateText` → `streamText` con SSE en `/api/public/alux/chat`; el cliente lee chunks en tiempo real. Typecheck pasó.
- [~] Push notifications: código completo, llaves VAPID ya existen como secretos. Pendiente: usuario actualiza valores en formulario seguro.
- [x] Texto-a-voz (TTS): servidor `/api/public/tts` con Gemini TTS SSE; hook `useTTS` con AudioContext y PCM streaming; botón "Escuchar" en mensajes de Alux. Typecheck pasó.
- [x] Voz-a-texto (STT): servidor `/api/public/stt` con Gemini Transcribe SSE; hook `useSTT` con MediaRecorder; botón micrófono en chat de Alux. Typecheck pasó.
- [x] Generación de imágenes: servidor `/api/generate-image` con Gemini Flash Image SSE; `stream-image.ts` con previews/blur/cancelación/replay; integrado en `AluxPhotoFinderDialog` con modo "Generar con IA". Typecheck pasó.
- [x] Clasificación IA de intenciones: `intent-ai.server.ts` mejora la intención determinista (`parseTravelIntent`) con `generateText` + schema Zod; fusiona intereses/compañía/destinos no captados por regex; fallback automático a la base determinista en error/timeout/créditos. Integrado en `converse.functions.ts`. Typecheck y contratos PASS.
- [ ] Dominio: investigar si `valladolid.com.mx` está disponible y cómo conectarlo al proyecto.

## Estándar Único de Construcción del CMS (Studio Standard v1.0)

- [x] E1 · Contrato del estándar: `composite-sections.ts` declara por sección `cmsSource`, `aluxIntent` y `commercialSlots`; nuevo `studio-standard.ts` (registro de superficies por región, resolvers y verificador `auditStudioStandard`); contrato en `scripts/cms/studio-standard.contract.test.ts`. Sin cambio visual.
- [x] E2 · Puente genérico de edición: el constructor toma etiquetas, slots reordenables y ancla de lienzo de la landing desde el estándar, no de constantes locales. Cualquier familia futura se habilita declarándose.
- [x] E3 · Alux por declaración: `studio-standard.ts` declara la plantilla de cada ruta pública (`templateKeyForPath`) y sus intenciones (`aluxIntentsForTemplate`); el contexto unificado de Alux expone `surface { templateKey, intents }` y el dock lo alimenta con la ruta activa. Aditivo, fail-closed, sin cambio visual.
- [x] E4 · Visibilidad por declaración: `src/lib/visibility/studio-rails.ts` alimenta `commercial-slots.ts` con `commercialRailsForTemplate` (fail-closed, semilla por plantilla+carril, techo compartido por página).
- [ ] E5 · Adopción plantilla por plantilla (Destinos, listados, fichas, landings) con comparación 1440/834/430/390 y validación visual del Founder entre cada una.
  - [x] Listados: marcadores de región (`hero`, `territorio`, `resultados`, `carriles`) en `TerritorialListingReviewSurface` (perfiles descubrimiento y general) y en `TourismListingSurface`. Sólo atributos de datos; maqueta aprobada intacta. Verificado en `/hoteles` y `/que-hacer`, sin desbordes en 1440/834/430/390. Pendiente aceptación visual del Founder.
  - [x] Destino y Ficha: ya contaban con marcadores en sus superficies aprobadas.
  - [ ] Pendiente: aceptación visual del Founder por familia antes de habilitar edición en el constructor.
- [ ] E6 · Regla permanente: ninguna plantilla nueva cierra sin las cinco declaraciones (verificación automática en CI).

## En curso

- [x] Biblioteca multimedia · cabecera profesional y responsive (IMG_0921): total visible, búsqueda amplia, filtros completos de alcance/estado/uso y acciones ordenadas para operar grandes acervos con comodidad en escritorio, iPad y celular; tabla, ficha, permisos y aprobación permanecen intactos. Verificada en 1440/834/430/390 sin desbordamiento de página.
- [x] Biblioteca multimedia · compactación IMG_0924: “Todas las imágenes / Mis imágenes”, estado y uso se presentan en selectores únicos; acciones y búsqueda reducen altura sin quitar opciones ni funciones. Pendiente comprobación visual final en 1440/834/430/390.

- [x] Biblioteca multimedia · revisión compacta y ficha integral: ALT y usos resumidos para explorar grandes acervos; una sola ficha permite editar información, uso, tipo, autor, procedencia, licencia, lugar y fecha, confirmar derechos, enviar a revisión, pedir cambios y aprobar/publicar con controles fail-closed. Verificada con sesión editorial en escritorio, iPad y celular, sin desbordes.

- [x] Menú móvil · Cuenta y acceso (21-sep, IMG_2681): “Arma tu Viaje” y la cuenta permanecen visibles y pulsables; la sesión activa muestra “Mi cuenta” y abre su panel hacia arriba sin recorte. Verificado en 430/390 con sesión iniciada y cerrada; `/auth` abre correctamente y el header aprobado permanece intacto.

- [x] Experience Builder · Timeout de autoguardado (21-sep): el guardado inmediato ya no espera traducción automática; validaciones independientes se ejecutan en paralelo; los cambios rápidos se compactan con estrategia latest-wins y la escritura falla rápido/reintenta si otra petición ocupa el borrador. Se preservan autorización fail-closed, conflicto de borrador y auditoría.

- [ ] Experience Builder · Selección/arrastre móvil (20-sep, IMG_0887–0888): el inspector debe conservar visible la sección exacta seleccionada; el bloque compuesto Home no debe marcar toda la página ni interceptar la selección interna; el asa debe corresponder únicamente a la sección visible que se editará o moverá. Corrección limitada al shell editorial, sin tocar renderer público, CMS ni orden vigente.

- [ ] Experience Builder · Detener parches acumulativos del canvas y recuperar una base estable: comparar/restaurar la última versión visualmente funcional antes de continuar; no gastar más créditos en ajustes del mismo mecanismo sin una prueba Safari/iPad aprobada.

- [ ] Experience Builder · Móvil (20-sep, IMG_0886): el recorrido completo de Home ya funciona. Pendientes de confirmación humana: (a) el control de arrastre debe permanecer visible mientras la sección esté en pantalla, y (b) al seleccionar una sección el lienzo no debe saltar: la parte visual y el panel de edición deben verse a la vez.

- [ ] Experience Builder · Evidencia Safari 20-sep (IMG_0865–0871): la Home pública y el lienzo no conservan la misma distribución tipográfica; Destinos, Categorías, Eventos y Experiencias aparecen partidos o superpuestos, quedan columnas blancas y el desplazamiento se bloquea. Corrección limitada al marco editorial: recreación por preset, zoom sin `transform` sobre el iframe y una sola autoridad de desplazamiento. Pendiente validación humana 1024/1280/1440 y regresión 834/430/390.

- [ ] Experience Builder · Corregir la arquitectura del contenedor editorial: la plantilla sí comparte renderer con la web, pero su envolvente actual puede activar controles públicos, resincronizar estilos y proyectar medidas antiguas. Sustituir esos comportamientos antes de modificar otra sección o extender a más plantillas.

- [ ] Experience Builder · Aclarar y corregir la deuda del objetivo tipo Wix: la implementación anterior sólo ajustó escala/iframe sobre el shell existente; no unificó desplazamiento, medición, selección ni arrastre. La reconstrucción debe sustituir esos mecanismos del shell sin tocar plantillas públicas, y no puede declararse terminada sin aceptación visual humana.

- [ ] Experience Builder · Editable en cualquier zoom: el zoom sólo cambia el tamaño de presentación de la plantilla, nunca su contenido ni sus medidas; seleccionar, mover y editar deben funcionar en todos los niveles de zoom y vistas. Si una operación no puede realizarse en el equipo actual, el lienzo debe decirlo con un aviso claro y accionable, nunca comportarse de forma errática. Objetivo final: que un editor humano trabaje las plantillas sin pedir cambios al agente.

- [ ] Experience Builder · Fidelidad de proporciones y textos en el lienzo: el hero y las demás secciones deben mostrar la misma distribución, tamaño relativo y disposición tipográfica que la vista real de ese ancho. El lienzo no debe re-responsivizar la plantilla al espacio del editor: la vista elegida manda y el zoom sólo la escala completa.

- [ ] Experience Builder · Vistas amplias de Home (1024/1280/1440): reconstrucción del espacio de trabajo en curso. Documento interno a escala lógica real; "Ajustar" usa todo el ancho real disponible sin forzar un mínimo que recorte la plantilla, y cada cambio de preset vuelve al borde inicial; el Studio ocupa temporalmente todo el ancho en tablet; inspector inferior hasta 1279 px y acoplado desde 1280 px; altura medida, controles externos y navegación de secciones sobre el scroll del editor. Pendiente comparación constructor/preview/público en 1440/1280/1024/834/430/390 y aceptación visual humana antes de extender por familias.

- [ ] Experience Builder · Safari móvil: corregido el conflicto entre el documento interno y el desplazamiento exterior, el cálculo de altura que sumaba dos veces el desplazamiento y la barra superior multilínea. Pendiente comprobar físicamente en iPhone/iPad que el recorrido completo sea continuo y que ningún control cubra la plantilla antes de cerrar.

- [ ] Experience Builder · Corregir la paridad de Destinos de Home: la corrección está en preview, pero falta publicación autorizada y verificación final del constructor en el dominio de pruebas antes de cerrarla.

- [x] Experience Builder · Catálogo operativo limitado a familias conectadas; vista inicial sólo publicada, con borradores y archivadas accesibles por filtro. Pruebas históricas desconectadas quedan ocultas de forma reversible y sin borrar datos.

- [ ] Qué hacer · Evolución editorial CMS-first: crear su administración dentro del Experience Builder para ordenar/activar Destinos recomendados, Eventos, Experiencias y Lugares de interés; integrar los contratos desde Administración → Visibilidad como elegibilidad comercial separada y limitada, con indicación `Promovido` discreta fuera de la fotografía, sin duplicar Lugares, planes, pagos ni superficies.

- [x] Reservación de productos · Calendario oficial con días disponibles en verde y cupo visible, selección progresiva día → horario → personas y horario único preseleccionado. Inventario, apartados, checkout ERL, ficha Premium y datos CMS preservados; contratos, typecheck, `git diff --check` y QA 1440/834/430/390 en PASS, sin overflow. El aviso de Google Maps en localhost es externo al flujo.

- [x] Incidencia recurrente móvil/PWA: impedir que una versión anterior deje la portada sin estilos; fallback autónomo, recuperación en línea, actualización segura y caché de archivos versionados para reabrir páginas públicas visitadas sin conexión. QA 1440/834/430/390 y typecheck en PASS; pendiente publicar y confirmar reemplazo del worker anterior en el celular afectado.

- [x] Reconciliación visual Premium de `/que-hacer`: header, filtros, cards/fallback, mapa y temas compactos; QA 1440/834/430/390 sin overflow, un H1 y un solo Alux. Data Readiness: 11 resultados actuales sin portada canónica. La URL territorial `/oriente-maya/valladolid/que-hacer` no existe y queda fuera de alcance para no crear una ruta nueva.
- [x] Estandarización transversal del breadcrumb móvil (primitiva compartida `CompactCrumbs`, unificación `BreadcrumbTerritorial` + `PremiumTerritorialBreadcrumb`, activación en listados/perfiles/previews, eliminación de breadcrumb duplicado en destino).
- [ ] QA responsive 390/430/834/1440 de la estandarización del breadcrumb.
- [x] Lote 1 · Integridad técnica y contratos: auditoría y reparación de los 4 hallazgos rojos de `bun test scripts/` (1 fail + 3 errors) — todos clasificados como contrato obsoleto; suite 756/756, typecheck y build en verde.
- [x] Lote 2 · Auditoría autenticada y Matriz de Capacidades OMXDS (sólo lectura, sin reparación): informe en `docs/governance/audit/2026-09-04-LOTE-2-AUDITORIA-AUTENTICADA-Y-MATRIZ-OMXDS-v1.0.md`. UI autenticada NO VERIFICADA por falta de sesión de prueba (no hay usuarios `business_owner`/`concierge`); evidencia estática + consultas de sólo lectura a Lovable Cloud.
- [x] Lote 2.1 · Addendum de reconciliación read-only: `docs/governance/audit/2026-09-04-LOTE-2.1-ADDENDUM-RECONCILIACION-v1.1.md`. Corrige 4 hechos del Lote 2 (Home SÍ publica desde CMS con 33 revisiones; el copy/medios siguen en código; no existe cobro real — `payments.demo_mode=true`, 0 órdenes/eventos de pago; 0 productos demo publicados, los 8 publicados son eventos). Route Inventory falla con 3 rutas y no está cableado en la suite. Autenticación runtime sigue NO VERIFICADA (runbook incluido).
- [ ] Lote 3 en adelante: pendiente de autorización del Founder. Secuencia recomendada P0: retirar `DESTINOS_MOCK` de superficies públicas → cerrar Route Inventory y cablearlo en la suite → exponer copy/medios de Home en el Constructor → decidir el destino de los 8 eventos DEMO indexables.
- [ ] Revisión de copy en Lote 3: "Oriente Maya" sin marca larga en las vistas previas de experiencia y evento (excepción documentada en el contrato G5).
- [x] Lote 2.2 · Verificación autenticada controlada: `docs/governance/audit/2026-09-04-LOTE-2.2-VERIFICACION-AUTENTICADA-CONTROLADA-v1.2.md`. BLOQUEADO por el entorno — la emisión de sesión para un usuario concreto exige aprobación interactiva no disponible, y las cuentas ficticias creadas por alta pública no pueden iniciar sesión (`email_not_confirmed`) sin activar la autoconfirmación de correo del proyecto (prohibido). Matriz por rol y capacidad íntegramente NO VERIFICADA, sin PASS simulado. Artefactos temporales (2 cuentas de sondeo + perfiles y roles automáticos) eliminados sin residuos: 7 usuarios antes y después. Runbook con 3 opciones para desbloquear.
- [x] Lote 2.2 · Reanudación admin (2026-09-04 16:55 UTC, sección 6 del mismo informe): la sesión iniciada manualmente por el Founder en el preview NO se propagó al entorno del agente (`LOVABLE_BROWSER_AUTH_STATUS = signed_out`, variables de sesión vacías). Detención conforme a la instrucción: sin emitir sesión, sin crear cuentas, sin tocar autenticación. Matriz admin/super_admin íntegramente NO VERIFICADA. HEAD antes y después `afe02c56aade20356eec3da8e1675789053448bd`, árbol limpio, cero artefactos temporales.

- 2026-09-04 · Lote 2.2 · Verificación autenticada admin/super_admin EJECUTADA con sesión del preview: 13 superficies PASS, Marca sin superficie (FAIL), edición+persistencia+reversión PASS sobre producto DEMO. Sección 7 del informe. business_owner/concierge siguen NO VERIFICADOS. Sin avanzar al Lote 3.

- 2026-09-04 · Lote 2.2 · Sección 8: verificación autenticada `business_owner` y `concierge` EJECUTADA con cuentas ficticias temporales (creadas y eliminadas en el mismo turno; 7 usuarios antes y después, 0 residuos). business_owner: Portal, lectura, edición+persistencia+reversión, atributos, medios y ausencia de controles de publicación en UI = PASS; **FAIL P0**: por Data API sí puede publicarse, verificarse, fijar `published_at` y poner `visibility_level='premium'` en un producto de otra empresa (escrituras revertidas). concierge: workspace, bandeja "Sin asignar" con 2 expedientes demo, aislamiento vs empresa/CMS/admin y alcances `lead`/`admin` bloqueados = PASS; **FAIL P1**: el detalle de expediente no asignado renderiza en blanco (`concierge_case_get` → forbidden). Sin avanzar al Lote 3.
- [ ] P0 (Lote 3, pendiente de autorización): endurecer RLS de `businesses` (`status`, `verified`, `published_at`, lectura de borradores ajenos) y de `products.visibility_level` (escritura cruzada entre empresas).
- [x] Lote 3A · Remediación P0 de RLS: `businesses_perm_write`/`products_perm_write`/`promotions_perm_write` restringidas a personal interno + disparadores `enforce_reserved_business_fields`/`enforce_reserved_product_fields` (publicación, verificación, `published_at`, `can_self_publish`, `visibility_level` reservados). 22/22 PASS con cuenta temporal eliminada; typecheck, build y 756/756. Informe: `docs/governance/audit/2026-09-04-LOTE-3A-REMEDIACION-P0-RLS-v1.0.md`. Lote 3B NO iniciado.

## Lote 3C · Cierre definitivo (2026-09-04)

- [x] /arma-tu-viaje: fallback seguro a TripPlannerSurface cuando la composición publicada no tiene bloques.
- [x] Alux: contexto canónico también en /rutas, /rutas/$slug y /casas-de-vacaciones.
- [ ] Pruebas autenticadas de roles business_owner y concierge con cuentas temporales (crear, probar, eliminar).
- [ ] Validación final: typecheck, build, pruebas, RLS, QA responsive 1440/834/430/390 e informe con matriz.

## Lote 3E · Confianza de datos públicos y Experiencias CMS-first (2026-09-05)

- [x] 3E.1 Home/superficies públicas sin `@/mocks/*` (Categorías, Empresas, Reseñas, Rutas, buscador del Hero, registro de vistas previas del Constructor) → lecturas CMS + estados vacíos honestos.
- [x] 3E.2 Experiencias fuente única `products` (`product_type=experiencia`): lector público sin service role, sólo publicados; revisión interna autenticada para `in_review`; `experience-demo-dataset.ts` fuera de toda lectura pública.
- [x] 3E.3 Migración aditiva/reversible: eje `tipo_experiencia` en `tourism_attribute_definitions/_options` (familia `experiencias`); relocalizar `metadata.category_label` de registros DEMO.
- [x] 3E.4 CMS + Portal Empresa: editor de atributos de Experiencia (admin/editor + dueño); RLS de campos reservados intacta.
- [x] 3E.5 Conexión pública: listado, filtros y perfil (`/producto/$slug`) con atributos reales; micrositio primero destino activo.
- [x] 3E.6 Pruebas de contrato anti-regresión + cuentas temporales + gates + QA responsive + informe `docs/governance/audit/2026-09-05-LOTE-3E-CONFIANZA-DATOS-PUBLICOS-Y-EXPERIENCIAS-CMS-FIRST-v1.0.md`.
- Pendientes P1 documentados (no bloquean): atributos/portada de las 4 experiencias publicadas reales; breadcrumb de `/producto/$slug` hereda destino del contexto.
- [x] Lote 3F-Preflight (diagnóstico read-only Google Maps y dominios).
- [x] Lote 3F-B1 (remediación interna de mapas): cargador único, `gm_authFailure` multiinstancia, fallback accesible, montaje condicional. Cerrado sin FAIL ni NO VERIFICADO — informe `docs/governance/audit/2026-09-05-LOTE-3F-B1-REMEDIACION-INTERNA-MAPAS-v1.0.md`.
- [x] Lote 3G (sistema visual compacto: categorías, chips y Alux): `TourismChip`/`TourismChipRow` como primitive único, `CategoryNavGrid` compacto con rail móvil, Alux embebido compacto con CTA textual y anti-superposición del flotante, P1 resueltos (un `main`/`h1` por página, clave React duplicada, táctiles críticos ≥44 px). Cerrado sin FAIL ni NO VERIFICADO — informe `docs/governance/audit/2026-09-05-LOTE-3G-SISTEMA-VISUAL-COMPACTO-CATEGORIAS-CHIPS-ALUX-v1.0.md`.
- [x] Lote 3G.1 (jerarquía visual de Alux): módulo embebido convertido en banda secundaria clara con acento de marca, píldoras `xs` con 44 px táctiles, CTA compacto de contorno, tira desplazable en móvil; altura −27 % en móvil y −33 % en escritorio. Informe `docs/governance/audit/2026-09-05-LOTE-3G1-JERARQUIA-VISUAL-ALUX-v1.0.md`. Pendiente autorizar el aligeramiento del bloque verde de Mi Viaje.
- [x] Lote 3G.2 (jerarquía visual de Mi Viaje): nueva autoridad compartida `TravelPlanBand`; banda clara con acento discreto, acciones compactas de 44 px táctiles; altura −42 % (1440), −44 % (834), −59 % (430), −46 % (390). Informe `docs/governance/audit/2026-09-05-LOTE-3G2-JERARQUIA-VISUAL-MI-VIAJE-v1.0.md`.
- [x] Lote 3M-A · Endurecimiento de autorización de los cron hooks de correo (`trip-journey-emails`, `coupon-review-reminders`, `visibility-notifications`): módulo único `handleCronHook` (sólo `x-cron-secret` vs `CRON_HOOKS_SECRET`, fail closed, 401 uniforme, sin `apikey`/bearer/URL), runners extraídos a `src/lib/cron/jobs/*`, 44 pruebas nuevas (869/869), invocador SQL `cron_hooks_invoke` que lee el secreto de Vault, jobs 84/86/89 reapuntados sin cambiar horarios; primer tic real 200 en 89 y 84. Informe `docs/governance/audit/2026-09-05-LOTE-3M-A-ENDURECIMIENTO-AUTORIZACION-CRON-v1.0.md`.
- [x] Lote 3M-A.2 · Simulación controlada y verificación **exclusivamente en vista previa**: módulo `cron-dry-run.server.ts` (cabecera `x-cron-dry-run` evaluada sólo tras autorizar; guardián de sólo lectura que bloquea escrituras, `enqueue_email` y toda RPC fuera de las 4 funciones `STABLE` de selección; respuesta sólo con contadores y `dry_run:true`), 27 pruebas nuevas (`scripts/cron/cron-dry-run.test.ts`, 71/71 en `scripts/cron/`), prueba manual de los tres ganchos contra vista previa (secreto+dry-run → 200 `dry_run:true` con cero envíos; clave pública / secreto incorrecto / sin credencial → 401) y comparación antes/después sin una sola mutación. Typecheck · suite **896/896** · build · Route Inventory 247 · escaneo de secretos limpio. **Producción sin modificar** (sigue aceptando `apikey`, transición intacta) y **jobs 84/86/89 intactos**, sin ejecución manual. Informe `docs/governance/audit/2026-09-05-LOTE-3M-A2-SIMULACION-CONTROLADA-EN-PREVIEW-v1.0.md`.
- [ ] Lote 3M-A · Parte 3 (tras publicar): quitar la cabecera heredada (`cron_hooks_invoke(..., false)`) y confirmar 200 en los tres jobs.
- [ ] Job 86 (`visibility-notifications-daily`) · **todavía no observado en vivo**: próximo tic 2026-09-06 13:15 UTC; criterio = `job_run_details` `succeeded` + `net._http_response` 200 `{"ok":true,…}` con cero envíos.
- [x] Plantilla Premium de destinos: distribución del hero preservada; `tagline` funciona como descripción corta y `description` completa aparece inmediatamente debajo en el bloque editorial aprobado. Las fotografías secundarias se toman exclusivamente del CMS, sin duplicar portada ni inventar medios; cuando no existen, el bloque colapsa sin huecos. QA Valladolid/Izamal 1440/834/430/390: 200, un H1, overflow 0 y sin errores de página. Data Readiness: ambos destinos carecen actualmente de galería CMS para este bloque.
- [x] Lote 3M-B · Remediación mecánica del lint gate en el alcance autorizado (`src/routes/lovable/*`, `src/routes/rutas*`, `src/routes/restaurantes.tsx`, `src/routes/oriente-maya/$destino.index.tsx`): 76 errores `prettier/prettier` → 0 mediante autofix limitado a 8 archivos exactos; `git diff -w` vacío y comparativa DOM antes/después idéntica en 8 rutas (status, texto, enlaces, `h1`, overflow). Typecheck · suite 896/896 · build · Route Inventory 247 · smoke 1440/834/430/390 · escaneo de secretos limpio. Informe `docs/governance/audit/2026-09-06-LOTE-3M-B-LINT-GATE-REMEDIATION-v1.0.md`.
- [x] Lote 3M-B.2 · Lint Gate completo cerrado en `a8a5beacfd31c40cf183cdf9161ac38b8eb75266`: 51 buckets restantes y 13 pendientes adicionales corregidos con ajustes mecánicos o mínimos equivalentes; `bun run lint` **PASS** sin deuda nueva, typecheck · suite 896/896 · build · Route Inventory 247 **PASS**. La deuda histórica continúa visible y gobernada por el baseline. Informe 3M-B actualizado con addendum de cierre.
- [x] Lote 3N-A · P2 de accesibilidad, semántica, foco, CLS y preview expirado cerrados sobre integración: responsive 13 superficies × 1440/834/430/390 sin overflow ni errores de página; Región CLS máximo 0.0049; preview expirado HTTP 404 con `main` y un `h1`. Sin publicación, PR, merge ni despliegue.
- [ ] Carril B · siguiente candidato: migrar `eb-process-scheduled-publish` (job 54, falla 401 desde antes) al mismo `handleCronHook` + `cron_hooks_invoke`.
- Lote 3H o siguiente: a la espera de autorización del Founder.

## Reconciliación de fichas Premium (2026-09-12)

- [x] Casa de vacaciones: reconciliada con la autoridad Premium aprobada; compartir, mapa/reseñas condicionales y QA 1440/834/430/390 en PASS.
- [x] Hotel: reconciliado con la autoridad Premium aprobada; estado sin reseñas/medios adicionales no inventa contenido y QA 1440/834/430/390 en PASS.
- [x] Restaurante: reconciliado con la autoridad Premium aprobada; compartir, mapa/reseñas condicionales y QA 1440/834/430/390 en PASS.
- [ ] Gates finales: lint dirigido, typecheck, pruebas propias (22/22) y Route Inventory (249/249) en PASS. Bloqueado el cierre global por deuda previa fuera de alcance: lint baseline reporta 5 errores nuevos en 4 archivos ajenos y Governance Integrity reporta artefactos/fingerprints acumulados no registrados; no se amplía alcance.

## Lote 3N · Composición Airbnb de fichas de alojamiento (2026-09-12)

- [ ] Casa de vacaciones (`BusinessSurface`, familia `vacation_rental`): mosaico de galería CMS tipo Airbnb, datos escaneables y mapa full-width en escritorio con ubicación debajo (paridad con hoteles).
- [ ] Sin reserva en línea ni pagos: la acción principal es "Agregar a Mi Viaje"; prohibido mostrar precio de reserva, desglose de cobro o políticas de cancelación de pago mientras no exista el sistema de reservación.
- [x] Decisión del Founder (2026-09-12): la ficha muestra precio orientativo "desde … por noche" al estilo de las fichas de alojamiento de referencia, tomado del catálogo publicado en CMS, con acción principal "Agregar a Mi Viaje" y sin cobro ni reservación en línea. Sin tarifa publicada el bloque no se renderiza.
- [x] Demo Pack (lote `demo-2026-09-12`): Casa Colonial Sisal con 4 fotografías CMS (`business_media` → `media_assets`, bucket privado firmado), tarifa demo publicada ($2,400 MXN/noche) y 3 reseñas demo publicadas con respuesta del anfitrión. Datos temporales: no eliminar hasta autorización literal del Founder.

## Eventos recurrentes · Video Mapping Valladolid en la Historia (2026-09-13)

- [x] Ampliar el alta existente de eventos con recurrencia diaria, semanal, mensual y anual, múltiples funciones y fechas suspendidas.
- [x] Conectar recurrencia a agenda, Home y ficha Premium sin crear superficies nuevas.
- [x] Sembrar “Valladolid en la Historia” en la iglesia de San Gervasio, Centro Histórico, con funciones 20:30 español y 21:00 inglés.
- [x] Generar/cargar portada original, validar CMS y ficha pública en 1440/834/430/390: evento publicado y ligado a portada temporal aprobada; recurrencia diaria, horarios, Mi Viaje, Alux y JSON-LD visibles; un H1, sin overflow ni errores de página. Home, agenda, micrositio, destino y Mi Viaje conservan sus autoridades existentes y consumen el mismo contrato público.
- [x] Adaptar EventPremiumSurface al formato Premium de hoteles/restaurantes/casas (hero → compartir/agregar a Mi Viaje → Alux → descripción y datos → ubicación/cómo llegar/qué hay cerca) sin crear superficie nueva, sin reserva ni pagos. Validado en 1440/834/430/390.
- [x] Conectar la ficha de Lugares y sitios de interés al constructor: plantilla oficial "Plantilla · Lugar" (**tpl_place**) con textos de sección editables; ficha pública lee la composición publicada con respaldo a los textos aprobados. Validado en 1440/834/430/390.

## Menú móvil · Refinamiento Airbnb (2026-09-13)

- [x] Texto del buscador: "¿Donde empezamos?" con subtítulo "Explora el Oriente Maya de Yucatán" visible en móvil.
- [x] Botones CTA del drawer móvil ("Arma tu Viaje", "Iniciar sesión"): estilo Airbnb — sin relleno ocre sólido; usar foreground/outline refinado.
- [x] Retirar “Destinos populares” sólo del menú hamburguesa y conservar el acceso territorial desde el buscador superior.
- [x] Mantener “Arma tu Viaje” e “Iniciar sesión” visibles en móvil y tableta; `/auth` abre correctamente en 430/390, sin desbordamiento en 834/430/390.

- [x] Compactar `/auth` y armonizar tipografía al estilo Airbnb solicitado.
- [x] Afinar exclusivamente `/auth` en móvil sin cambiar su composición: escala tipográfica, ritmo vertical y proporciones compactas; Preservation Gate 1440/834/430/390 en PASS, sin desbordes ni errores.

## Incidencia · Envío de Mi Viaje al Concierge (2026-09-14)

- [x] Diagnosticar por qué el viaje de kafir hadded no creó expediente ni llegó a revisión/cotización del concierge: el estado sin expediente ocultaba el formulario `promotePlanToCase` detrás de una pantalla vacía cuyo CTA regresaba a Resumen.
- [x] Contrastar diagnóstico y corrección con la documentación oficial versionada: `promotePlanToCase` permanece como única puerta y conserva snapshot, vínculo, estado compartido y expediente `new`.
- [x] Corregir únicamente el bloqueo de acceso al formulario y verificar viaje → expediente → panel de seguimiento: caso `941c04fd-b8d2-46dd-a211-65a121805a58` creado con 6 elementos, viaje vinculado como `shared_with_concierge`, UI desktop/móvil sin errores. Sin publicación.
- [x] Corregir la visibilidad inicial en Centro Concierge: los expedientes nuevos nacen sin asignación, por lo que la bandeja abre en “Sin asignar” en vez de “Mis expedientes”.
- [x] Convertir el detalle del expediente a lenguaje operativo claro: estados, prioridad, origen, solicitudes, línea de tiempo y contexto de Alux sin claves internas; resultados de Alux presentados para lectura humana. Sin cambios de datos, permisos o flujo.

## Alux multimarca · configuración desde Marca (2026-09-14)

- [x] Extender `brand.identity` con paleta de interfaz y textos de Alux configurables por marca, con herencia segura de los valores vigentes.
- [x] Conectar la autoridad de Marca a las superficies canónicas de Alux, sin cambiar ilustración, comportamiento ni crear configuraciones paralelas.
- [x] Scope Gate y QA 1440/834/430/390: PASS (un H1, sin desbordamiento ni errores de consola); typecheck y 86 contratos Alux PASS. Preservation Gate específico de Alux PASS; la suite Premium ampliada conserva 6 fallos previos fuera de alcance. No publicado.

- [x] Dar presencia a Alux tras enviar a Concierge: acompañar la espera y avisar desde Mi Viaje cuando exista una propuesta nueva.
- [x] Reparar asignación y cotización del expediente: autoasignación ligada a la sesión desde la bandeja y el detalle, avisos claros, solicitud de cotización por servicio con empresa y refresco inmediato; validado con sesión Concierge y QA en 1440/834/430/390.

## Mejora de expedientes Concierge

- [x] Auditar documentación oficial: contacto, alcance de cotización y autoría de propuesta.
- [x] Comparar contrato documentado con captura e implementación actual.
- [x] Definir delta mínimo con Scope Gate y Preservation Gate antes de modificar.

- [x] Confirmar que contacto interno, privacidad empresarial y autoría de propuestas respetan las adendas oficiales sincronizadas desde GitHub.
- [x] Validar contratos Concierge, typecheck, formato y diff check. El render autenticado completo requiere una sesión de QA; 1440/834/430/390 alcanzaron correctamente el control de sesión sin desbordamiento.

## Propuesta con partidas propias del Concierge (2026-09-14)

- [x] Permitir partidas escritas por el Concierge (título, importe, notas) sin empresa ni cotización, mezclables con cotizaciones recibidas.
- [ ] Dejar claro en el compositor que la empresa sólo se involucra cuando se le solicita cotización desde el servicio.

## Itinerario tras aceptación + pago en efectivo (2026-09-14)

- [x] La reservación creada desde la propuesta queda enlazada al viaje del cliente.
- [x] Pago en efectivo: el viajero confirma y queda pagado; el concierge también puede registrarlo desde el expediente.
- [x] Al pagar, el expediente pasa a cerrado ganado y se abre el itinerario confirmado del viajero.
- [ ] Conectar pago real con proveedor cuando el Founder lo autorice.
- [x] Confirmación de viaje antes de enviar al Concierge (TripBriefForm 3 secciones: datos del viaje, quiénes viajan, transportación con 'aún no lo decido'). Brief en travel_plans.meta.trip_brief, incluido en handoff context, mostrado en CaseFileView. Typecheck + build + Playwright 1440/834/430/390 OK. No publicado.

## Recordatorios de pago de propuesta aceptada (2026-09-14)

- Propuesta `accepted` sin reservación pagada → correo al viajero a 1 h, 24 h y 72 h, y aviso interno al equipo a las 72 h.
- Fuentes reales: `concierge_proposals.status`, `concierge_cases.status`, `concierge_orders.status`. Sin estados nuevos.
- Idempotencia: columnas `pay_reminder_r1/r2/r3/team_sent_at` en `concierge_proposals`.
- Selección: `get_proposals_needing_payment_reminder(_kind)` (SECURITY DEFINER, sólo `service_role`).
- Trabajo `src/lib/cron/jobs/proposal-payment-reminders.server.ts` + gancho `/api/public/hooks/proposal-payment-reminders` (x-cron-secret, dry-run soportado).
- Cron horario `proposal-payment-reminders-hourly` ('20 \* \* \* \*').
- Plantillas `proposal-payment-reminder` y `proposal-payment-stalled-team`.
- 2026-09-14: verificado en producción — r1 enviado 15:20 UTC a Kafir (`email_send_log` = sent); r2 enviado manualmente 17:49 UTC a petición del Founder y marcado `pay_reminder_r2_sent_at`.
- 2026-09-14: cron `eb-process-scheduled-publish` devolvía 401 cada 5 min (enviaba `apikey`, la ruta exigía `EB_CRON_SECRET`). Se migró el job a `cron_hooks_invoke(...)` y la ruta acepta también `CRON_HOOKS_SECRET`. Efectivo en producción al publicar.

## Zona horaria oficial fija: America/Merida (2026-09-14)

- `src/lib/time/merida.ts` es la fuente única: `MERIDA_TIME_ZONE`, `formatInMerida`, `meridaDate/DateTime/LongDate/DayMonth/Clock`, `meridaToday`.
- Aplicado en expedientes Concierge, bandejas, Mi Viaje, itinerario, reservaciones, historial, documentos, cupones, recuerdos, recap en vivo, portal empresarial y todas las plantillas/cron de correo.
- Regla: prohibido formatear fechas visibles con la zona del dispositivo o del servidor.

## Estudio de Propuesta del Concierge (2026-09-14)

- [x] Propuesta con espacio propio (no dentro del expediente), día/hora/duración por partida y paso al itinerario.
- [ ] Velocidad para cientos de propuestas: plantillas reutilizables, alta rápida y atajos de teclado.
- [ ] Alux copiloto del Concierge con contexto real del destino (horarios, clima, distancias, eventos) vía Context Engine.
- [ ] Vista del viajero para propuestas largas: resumen por días, secciones plegables y descarga en PDF.

- [ ] Diseñar carga inteligente obligatoria de imágenes: validación de tamaños, optimización automática y cola segura para cargas masivas.
- [ ] Definir biblioteca Media por empresa: visibilidad, permisos, búsqueda, filtros y usos portada/galería/logo/miniatura.
- [ ] Definir continuidad de imágenes al reclamar empresa: conservar asignación, procedencia y permisos del nuevo dueño sin transferir autoría.

- [ ] Folios diarios de reservación: ERL-YYMMDD-### para venta en línea y AVL-YYMMDD-### para Arma tu Viaje.

- [x] Portada: corregir apariencia del calendario "Buscar por fecha" en escritorio (elegante, alineado con DSL)
- [x] Portada: restablecer miniaturas de eventos (acreditación de medios)

- [x] Identificar y comparar la última versión Premium aprobada de Zazil Tunich.

- [ ] Reconstruir la autoridad documental de Experiencias, venta en línea y Concierge desde GitHub y el repositorio.
- [ ] Definir el delta mínimo para administrar Experiencias desde CMS sin duplicar reservas, pagos ni operación Concierge.

## Experiencias · venta en línea (Carril A)

- [ ] Sección de Experiencias tipo Airbnb con reservación en línea, sobre la plantilla existente de `/experiencias` y con la marca actual (botón propio de Experiencias en el menú).
- [ ] Alta por parte de las empresas autorizadas, eligiendo si su producto se vende en línea, se usa en Arma tu Viaje o ambos.
- [ ] Todo lo vendido (en línea y por propuesta del concierge) llega al Centro Concierge con control, reportes y corte del día.

- [x] Botón/acceso propio de Experiencias: acceso destacado en portada (antes de la rejilla de categorías); ya existía en rejilla de categorías, buscador, menú normal y hamburguesa.

- [x] Afinar visualmente /experiencias sin modificar el acabado oficial de los iconos de categorías; preservar TourismCategoryIcon y sus activos canónicos.
- [ ] Corregir regresión visible en `/experiencias`: buscador principal presente, categorías con escala canónica armonizada y mapa general de todas las experiencias, usando los patrones Premium existentes.
- [ ] Replantear la maqueta de la tienda pública con funcionalidad de exploración inspirada en Airbnb Experiences (búsqueda, filtros, tarjetas y mapa sincronizado), preservando íntegramente la marca Premium Valladolid.mx; requiere comparación y aprobación visual antes de sustituir `/experiencias`.
- [ ] Reutilizar exactamente el buscador turístico ya aprobado del Home, ampliado sólo con fecha y viajeros para Tours; conservar sin cambios los iconos bordados y la imagen/colores oficiales de Alux, y reutilizar el patrón existente de listados con mapa.
- [ ] Filtros de la tienda de Experiencias: barra compacta, profesional e intuitiva (criterios rápidos visibles, panel completo, conteo de resultados y limpieza); Alux queda fuera del alcance de esta iniciativa.
- [x] Unificar la ficha pública de Experiencias con los bloques Premium oficiales de hoteles/restaurantes, preservando sus secciones turísticas propias y la venta fail-closed. QA comparativa hotel/restaurante/experiencia 1440/834/430/390: 200, un H1, sin overflow ni errores de página; sin publicar.
- [x] Añadir ubicación efectiva de Experiencia en CMS con herencia de la ubicación principal del negocio y excepción mediante punto de encuentro específico, sin duplicar coordenadas. Validación de pertenencia activa y función interna sin ejecución pública.
- [ ] Cierre global de Governance Integrity: bloqueado por 69 artefactos/fingerprints acumulados no registrados, incluidos cambios anteriores fuera de este delta; Route Inventory 262/262 y proyecciones PASS. El linter de Lovable Cloud conserva 328 avisos globales históricos; la función nueva de ubicación no es SECURITY DEFINER y sólo puede ejecutarla el servicio interno.

- [x] Logotipos de empresa: logo transparente de Zazil Tunich cargado en CMS y visible en su experiencia (ficha de Lugar pendiente de autorización).

- [x] Perfil Zazil Tunich: retirada la excepción hardcodeada `business.slug === "zazil-tunich"`; el perfil vuelve a la plantilla oficial de empresa con logotipo. Landing de promoción vive en `/l/<slug>` (Experience Builder) y su enlace se muestra en el panel "Landing SEO premium" del editor de empresa. Logotipo acreditado también en el hero de la landing (`LandingBrandLogo`, fail-closed).
- [ ] Publicar la Landing SEO de Zazil Tunich (`landing-business-zazil-tunich`, hoy borrador) — pendiente de autorización Founder.

- [x] Inteligencia del Visitante · profundidad anónima (CV8): sesión anónima T1, exploración profunda T3, intención anónima T4, consentimiento por propósito y k-anonimato k≥25 en lecturas agregadas.
- [x] Inteligencia del Visitante · menús por módulo del blueprint CV8.3 (12 módulos: Embudo, Anónimos, Conversión, Travel Plans, Alux, Concierge, Empresas, Destinos, Revenue, Permanencia, Embajadores, Alertas) dentro de `/cms/visitor-intel`.

- [x] Unificar todas las fichas de empresa en la plantilla Premium aprobada y retirar el formato editorial antiguo, preservando landings SEO independientes. La ruta territorial usa exclusivamente `BusinessSurface`; las composiciones `biz-*` sólo pueden aportar textos compatibles y `/l/<slug>` permanece independiente.
- [x] Refinar la ficha Premium empresarial sin cambiar forma ni colores de marca: logotipo ligeramente dominante junto al nombre y experiencias/productos en carrusel compacto tipo Airbnb; validado en 1440/834/430/390.
- [x] Retirar de la ficha empresarial las tarjetas redundantes Destino/Categoría/Estado; conservar breadcrumb y contexto territorial canónico.
- [x] Unificar tarjetas de experiencias/servicios como acceso de descubrimiento: corazón sobre la foto y un único CTA “Ver experiencia”; reservar y agregar a Mi Viaje viven exclusivamente dentro de la ficha completa.
- [x] Añadir en la ficha de experiencia un regreso visible al perfil territorial de la empresa para explorar sus demás experiencias.
- [x] Armonizar todos los listados territoriales de empresas —hoteles, cenotes, artesanías, transportes y futuras categorías— con la única plantilla Premium ya aprobada para empresas de hoteles; retirar el fallback visual antiguo sin cambiar perfiles, CMS ni datos.
- [x] Crear el listado regional de empresas por categoría en todo el Oriente Maya, con filtro por destino, y hacer que el listado de cada destino filtre por zonas del propio destino.

## Menú de escritorio compacto (2026-09-18)

- [x] Barra principal de escritorio reducida a Oriente Maya, Hoteles, Restaurantes y Experiencias; se retira la opción “Más”.
- [x] Panel de menú (hamburguesa) disponible también en escritorio con Casas de vacaciones, ¿Qué hacer?, Eventos, Promociones, Mapa, Blog, Contacto, “Arma tu Viaje” e inicio de sesión; el idioma permanece exclusivamente en el header para evitar duplicación y fallos.
- [x] Validado en 1440/834/430/390 sin desbordamiento; logotipo, buscador, Mi Viaje, cuenta y rutas preservados. Sin publicar.

## Qué hacer · visibilidad contratada (2026-09-18)

- [ ] Prioridad tipo buscador: la ficha con contrato vigente y elegible ocupa la primera posición de cada bloque de 4; sin contratado elegible, la toma un orgánico.
- [ ] Cupo 1 de cada 4, máximo 2 apariciones por empresa (1 por carril), aplicable también a Hoteles, Restaurantes, Casas de vacaciones, Eventos, Lugares y listados territoriales.
- [ ] Etiqueta discreta "Recomendado" fuera de la fotografía para contenido contratado; carril editorial mantiene "Recomendados por Valladolid.mx".
- [ ] Reparto justo con muchos contratos: turnos por nivel de paquete, rotación determinista diaria, deuda de exposición, techo por empresa y cupo por superficie; sin posición fija garantizada.
- [ ] Alcance: aplicar cupo, prioridad y etiqueta en Home y todos los listados (incluidos territoriales y por categoría); excluir destinos, mapa, fichas, Alux, Mi Viaje y Concierge. Despliegue por etapas: /que-hacer → listados → Home.
- [ ] Destacados programados: ampliar founder_spotlights a producto/experiencia/evento/promoción con superficie, posición, fecha inicio/fin, motivo y tipo (cortesía o contratado); calendario por superficie en Administración → Visibilidad → Destacados.
- [ ] Documentar y ampliar /cms/visibilidad/spotlight como pantalla única de destacados (Founder Spotlight + fijados con fecha por superficie).
- [x] 2026-09-18 Base gobernada del reparto comercial (`src/lib/visibility/commercial-slots.ts` + pruebas): cupo 1 de cada 4, prioridad comercial por bloque, techos por empresa, fijados vigentes, deuda de exposición y rotación diaria determinista. Sin cambios en superficies públicas.

## Medición real de visibilidad (2026-09-18)

- [x] Registro real de impresiones y acciones en perfiles de empresa y fichas de experiencia (`src/lib/visibility/track.ts`, `BusinessEventTrackers.tsx`), fuente única `business_view_events`.
- [x] Nuevos eventos `add_to_trip` y `reserve_intent`; atribución automática al contrato de visibilidad vigente en `admin_visibility_performance`.
- [ ] Conectar impresiones/clics de tarjetas en listados públicos (`/que-hacer`, listados territoriales, Home) junto con el motor de cupo comercial.
- [ ] Pruebas reales del Founder: compra de visibilidad para Zazil Tunich, un hotel y un restaurante; verificar acumulación en Administración → Visibilidad → Rendimiento.

## Constructor · edición por secciones en plantillas compuestas (2026-09-18)

- [ ] Registro general de secciones internas para bloques compuestos (Inicio, micrositio de destino, listados G5), con edición sección por sección, visibilidad y reordenamiento por arrastre.
- [ ] Regla vinculante: toda plantilla compuesta nueva debe declarar sus secciones internas en el registro como parte de su Definition of Done.

- [ ] Corregir la conexión real del editor de Inicio: las 12 secciones existen en Estructura, pero el lienzo aún las trata como un solo bloque y no permite recorrerlas ni manipularlas directamente.
- [x] Contratos en verde: 655 pruebas OMXDS sin fallos.

## Constructor · biblioteca de elementos para arrastrar (2026-09-18)

- [ ] Declarar y documentar el origen de los elementos insertables: mapa oficial con marca, familias de botón, texto con enlace (p. ej. "Agregar a Mi Viaje") y sección de hoteles.
- [ ] Permitir arrastrar esos elementos desde la biblioteca oficial hacia las plantillas, sin crear bloques paralelos ni duplicados.
- [ ] Arrastrar y soltar de secciones en todas las plantillas Premium (Inicio, Destino, Lugar, Listados), con orden por defecto = orden aprobado.
- [ ] Hacer utilizables en el lienzo del constructor los elementos editables internos declarados por cada sección; no limitar el trabajo al panel Estructura.

## Experience Builder · Corrección operativa de secciones (2026-09-19)

- [x] Corregir selección de Destinos: enfocar la sección real del lienzo, mostrar tarjetas/valores/imágenes y evitar que el panel cubra la Home en tablet/móvil.
- [x] Corregir arrastrar y soltar secciones: el gesto táctil resuelve el destino por la posición real del dedo en Safari/iPad; el mismo commit actualiza el lienzo y activa el autoguardado del borrador.
- [x] Validar técnicamente Home completa en 1440/1280/1024/834/430/390 sin modificar ni publicar la versión pública: 11 secciones consecutivas, cero solapamientos, cero overflow interno y anchos lógicos correctos. Contratos OMXDS 5/5 en PASS. La aceptación visual humana permanece pendiente.

- [x] Constructor: galeria unica de plantillas oficiales agrupada por seccion + asignacion automatica de plantilla al crear pagina nueva en una seccion.
- [ ] Regla: toda correccion de plantilla (empezando por Micrositio de Destino v1 oficial) se entrega editable desde la estructura del constructor (textos, imagenes, enlaces, orden).
- [ ] Extender el lienzo reconstruido a las demás familias sólo después de aceptación humana de Home y validación completa 1440/1280/1024/834/430/390.

- [x] Aplicar a la landing Zazil Tunich el mismo modelo probado de selección, edición y reordenamiento de Inicio, sin editor paralelo.

- [x] Avisos · Campana del Centro de Notificaciones (21-sep): campana única en la barra superior de todos los paneles (CMS, Admin, Concierge, Empresa), con contador de no leídos, lista en lenguaje claro, marcado como leído y salto al detalle. Reutiliza los server-fn oficiales del UNC; sin canales, tablas ni estados nuevos. Verificado con sesión de administrador en `/cms/media`.
- [x] Avisos · Celular (push) 21-sep: llaves VAPID configuradas, envío real Web Push (`push-dispatch.server.ts`, WebCrypto compatible con el runtime edge), publicación push añadida a `cms_media_transition` (misma transición, sin cambiar el flujo editorial), botón "Activar avisos en este celular" en la campana y aterrizaje directo en `/cms/media?estado=in_review` al tocar el aviso. Envío inmediato al enviar una foto a aprobación. Sólo opera en el sitio publicado (bloqueado por diseño en dev/preview).
- [x] Avisos · Correo CANCELADO por el Founder (21-sep): se retiró el despachador, la plantilla `unc-notification` y el job `unc-email-dispatch-5min`; no quedó ningún envío programado.

## Imágenes de empresas

- [x] Encuadre manual (mover, zoom, pellizco) para logo, portada y galería; logo completo sin cortar letras.
- [x] Luz y color (luz, sombras, contraste, color, calidez) + "Mejorar con Alux" y comparación con original.
- [x] Galería por lote: cada foto se acomoda en secuencia, con opción de subir el resto sin ajustar.
- [x] Optimización oficial conservada después del encuadre.
- [ ] Prueba visual con sesión editor en 1440/834/430/390 y aceptación del Founder.

## Fotos ligeras (H3·A4)

- [x] Tamaño real guardado en las 624 fotos y en cada subida nueva de empresa.
- [x] Versiones ligeras creadas para 622 de 624 fotos (2 con fallo parcial siguen con su original).
- [x] Ficha de empresa lee versiones ligeras (piloto Hotel Sutuk en vista previa) + comparación 1440/834/430/390.
- [x] Optimización automática al subir en empresas, portal, destinos, zonas, productos, constructor y biblioteca.
- [ ] Encender versiones ligeras para todo el sitio — espera aprobación del Founder tras ver la comparación.
- [ ] Respaldo periódico automático para fotos que no se optimizaron al subir — requiere decidir un servidor externo para el proceso por lotes.

## Correcciones Alux/listados autorizadas · 2026-10-22 (Founder: "Autorizado todo")

- [x] 1. Corregir la búsqueda de cercanía del chat público de Alux (campo inexistente `display_name` → `name` en la consulta de categorías). Verificado end-to-end: Alux respondió con Casa Colonial Sisal a 0.1 km con ubicación de visitante real.
- [x] 2. Conectar el peso de visibilidad en el listado de Experiencias (misma autoridad `business_effective_visibility` que hoteles/restaurantes; peso DESC + alfabético; fail-closed).
- [x] 3. Blindar coordenadas vacías/inválidas: guardia `== null` antes de `Number()` en travel-plan-geo/optimize/schedule (Number(null) era 0 → punto (0,0)).
- [x] 4. Fichas de las 60 esperadas: NO faltaban — error de la auditoría anterior (filtraba mal). Base real: 30 hoteles + 32 restaurantes publicados y aprobados; verificado en navegador (30 tarjetas en /hoteles, 32 en /restaurantes).
- [x] Tests de contrato: scripts/alux/alux-nearby-visibility-geo.contract.test.ts (4 PASS) + suite de experiencias (13 PASS).
- [ ] Pendiente: que el Founder asigne pesos de visibilidad reales a los operadores de experiencias (los 6 pesos actuales son de otros negocios), sin eso el orden de Experiencias sigue alfabético.

## Fotos del destino Valladolid no visibles en público · 2026-10-22 (Founder reporta en vivo)

- [x] Diagnosticado: las 12 fotos subidas hoy estaban publicadas pero sin acreditar (review_state=unreviewed, sin crédito/licencia/huella); la política pública fail-closed G8 las ocultaba por diseño.
- [x] Acreditación aplicada con autorización del Founder (fotos suyas o con permiso): huella sha256 de cada original, crédito/licencia Valladolid.mx, revisión aprobada. Verificado en navegador: hero y galería visibles en /oriente-maya/valladolid, 0 errores de página.
- [x] Mejora autorizada implementada en destinos: declaración compartida de propiedad/permiso y atribución; validación editorial, SHA del archivo almacenado y auditoría al acreditar fotos reales completas sin espera administrativa. Protecciones IA, encuadre y compresión conservadas; 38 pruebas PASS y formulario comprobado con sesión en 1440/834/430/390.
- [ ] Cierre de validación: subir una fotografía real nueva con rol editor y comprobar acreditación, variantes y lectura pública; la prueba actual llegó a confirmación y cancelación sin crear ni alterar fotos del destino. Sin certificación de publicación automática end-to-end todavía.
- [ ] Hallazgo: la tarjeta de la ruta "Uayma y Espita en dos días" muestra imagen rota porque su asset es conceptual IA en borrador (proxy lo bloquea por diseño). Requiere decisión del Founder (foto real o retirar tarjeta); contenido demo protegido por Demo Pack Policy.

## Fotos de destino estilo Airbnb · 2026-10-23

- [x] Portada en mosaico (escritorio/tableta) y deslizable con contador (móvil) en la plantilla única de destinos
- [x] Galería única en "Ver todas las fotos"; Descubre con una sola foto
- [x] Acomodar foto (punto de enfoque) al subir y en fotos ya subidas
- [x] Tarjeta de Valladolid en Inicio con su portada real
- [ ] Probar "Acomodar fotos" guardando como editor real (pendiente de validación del usuario)

## App sin señal · 2026-11-20 (Founder reporta: la app no abre sin señal)

- [x] Causa: sin señal, si una pieza flotante (Alux, Tu viaje, aviso de sesión) no estaba guardada, toda la página se reemplazaba por «Sin conexión». Corregido: la pieza se omite y la página se ve. Pendiente publicar y probar en iPhone real.

## Memoria de la app al seguir rutas · 2026-11-21

- [x] Medido: 9–18 MB por página, ~32 MB guardados en el teléfono; rutas ya abiertas se ven sin señal.
- [x] Itinerario del concierge sin señal («Copia con documentos»): itinerario, expediente, reservas y documentos en el teléfono, solo lectura, sin pagos, borrado al cerrar sesión. Probado en vista previa con la cuenta demo VMX-DEMO01 simulando sin señal y acceso vencido. Pendiente: publicar y probar en iPhone real en modo avión.
- [x] Memoria de rutas: el mapa compartido libera mapa, pines y trazos al salir (autorizado). Vista previa: 20 cambios entre rutas 29.9→32.4 MB (antes 16→40 MB publicado).
- [x] Las lecturas con sesión ya no se guardan en la caché compartida sin señal (solo en la copia por cuenta de Mi Viaje).

## Itinerario con marca · 2026-11-21 (autorizado «Puntos 1 a 5»)

- [x] Portada con logo, días con fecha y hora, cómo llegar y traslado estimado, notas y pie con QR.
- [x] Mismo formato en el enlace compartido, su PDF y Mi Viaje (con folio y reservas del concierge).
- [x] Casilla «hecho» por parada, guardada sólo en el teléfono (también en la línea de tiempo).
- [x] Paradas del concierge muestran su nombre real en vez de «Elemento».
- [ ] WhatsApp del concierge en el itinerario: no hay número oficial configurado (espera dato del Founder).
- [ ] Fotos en paradas guardadas sin foto (solo 16 de 53 la tienen): pendiente decidir si se toman de la ficha oficial.

## Itinerario con marca como vista principal de Mi Viaje · 2026-11-21

- [x] Founder confirmó que el itinerario en texto plano estaba en Mi Viaje («Mi Viaje en la app») y pidió que el PDF descargado también lleve la marca.
- [x] Sección Itinerario de Mi Viaje: nueva pestaña «Días» (por defecto) con el itinerario con marca (logo, folio, días con hora, cómo llegar, casillas «hecho», «Guardar PDF / Imprimir»). Lista, Timeline y Mapa se conservan; se retiró la tarjeta duplicada al pie.
- [x] Verificado con la cuenta demo VMX-DEMO01 a 390 px: las 4 vistas funcionan, sin errores; el PDF es el mismo documento con marca (hoja por día, logo y QR).
- [x] Gobernanza: anexos PCA-2026-059/PCA-2026-105, inventario regenerado, controles PASS. No publicado.

## Agente de WhatsApp con Alux · 2026-11-21 (autorizado «Avisos y preguntas»)

- [x] Clave del agente guardada de forma segura (conector «WhatsApp Agent»); chat del Founder detectado.
- [x] Aviso agrupado cada minuto cuando alguien inicia conversación con Alux (hora, destino, con/sin cuenta; sin datos personales; robots excluidos). Probado: llegó el aviso de una conversación de prueba.
- [x] Preguntas por WhatsApp contestadas con el contenido publicado y cifras de Alux (probado localmente: respuesta en ~7 s).
- [x] Revisión programada cada minuto; pruebas 50 PASS, gobernanza PCA-2026-106 + anexos.
- [ ] Funciona solo tras publicar (la revisión programada llama al sitio publicado).

## Auditoría de carga de contenido en el CMS · 2026-11-22

- [x] Productos y zonas guardan el tamaño de cada foto igual que empresas.
- [ ] Ubicación en el mapa para zonas — espera respuesta del Founder.
- [ ] Fotos para categorías — espera respuesta del Founder.

## Alux lee mejor el CMS · 2026-11-22

- [x] Alux ve todas las empresas y experiencias (sin corte alfabético) y elige según lo que preguntan.
- [x] Visibilidad pagada como Google: primero en su categoría si encaja, marcada «Recomendado».
- [x] Precios: venta en línea solo experiencias; lo demás «Precio de referencia» que cotiza el concierge.
- [x] Ficha completa de experiencias (cupo, anticipación, cancelación, descripción).
- [x] Artesanías: se venden en línea si el administrador autorizó su venta al subirlas.
- [x] El chat sin cuenta (y el insertado en sitios aliados) ya recibe el catálogo publicado; antes no veía empresas ni experiencias.

## Fórmula de visibilidad en listados y tope de Alux · 2026-11-23

- [x] Listados de empresas y experiencias usan la fórmula aprobada (1 de cada 4, rotación diaria, «Recomendado» solo en el espacio contratado).
- [x] Alux: «Recomendado» solo para paquetes con menciones proactivas y hasta su tope diario; Destacado solo se lee primero.
- [x] Explicar al Founder al final cómo funciona la configuración.

## Empresas, Alux concierge y embudo de expedientes · 2026-11-23

- [x] Plan de 7 fases (0, A–F) aprobado; cada fase se aprueba por separado.
- [x] Fase 0: Valladolid listo para unas 200 empresas (sin cortes en destino, listados con «Ver más», relacionadas, fotos firmadas por lote).
- [x] Mapas sin saturar: burbujas con número, filtro por tipo, íconos, lista sincronizada, pin dorado, lugares de interés en el mapa del destino.
- [ ] Ver las burbujas del mapa interactivo en el sitio publicado (el mapa de Google no abre en la vista de pruebas).
- [x] Fase A: medidor «Tu ficha para Alux» en el Portal, Alux premia fichas completas, turno justo entre gratuitas, reporte mensual gratis (correo y WhatsApp).
- [ ] Confirmar día del reporte y a quién llega (preguntas abiertas; se usa «día 1» y «solo las que administran»).
- [ ] Reporte por WhatsApp: necesita la línea de Valladolid.mx conectada con QR real.
- [ ] Fase B (traer a las empresas que faltan) — espera visto bueno del Founder.

## Ventas en línea por empresa · 2026-11-23

- [x] Propuesta reducida a piloto: solo empresas activadas, sin Booking/Airbnb, hoteles con confirmación.
- [x] Dejar en la propuesta cómo crecer después sin rehacer (un solo sistema en las plantillas; calendario de Booking/Airbnb, reserva inmediata y envíos como agregados).
- [x] Aclarar en la propuesta que es un solo sistema con tres formas de disponibilidad (piezas, lugares por salida, noches).
- [x] Aprobación del Founder de la propuesta y de las empresas piloto (Copalli + una tienda de artesanías).
- [x] Fase 1: interruptor «Ventas en línea» por empresa (solo administrador), canales, comisión por tipo (15 %), regla única en la página, Alux y el cobro; lo ya vendido no cambia.
- [x] Fase 2 (2026-11-23): tienda con piezas (Coqui Coqui), pedidos para recoger con toda la carta de Copalli, carga de productos por PDF/foto u hoja, botón «Comprar» en la página del producto de tienda; probado en vista previa (pedidos de prueba cancelados).
- [x] Probada la reserva por fecha de una experiencia (Cena Romántica en Cenote, fecha de prueba cerrada al terminar).
- [x] Fase 4 piloto: Casa Tía Micha con reserva por noches y confirmación del hotel en 12 h (Colonial $1,850, Suite Patio $2,650, Familiar $2,300; 1 de cada una); probado solicitar, confirmar, rechazar y cancelar en vista previa.
- [x] Calendario tipo Airbnb para hoteles (2026-11-23): precio por noche dentro del calendario y bloqueo de días ahí mismo; lo editan el hotel (su panel) y el administrador; el viajero ve el precio de cada noche al elegir fechas.
- [x] Mismo calendario para experiencias y tours que se reservan por fecha (precio por día y bloqueo de días), sin un segundo sistema — autorizado en esta entrega (2026-11-23).
- [x] Habitaciones iguales: el hotel y el administrador fijan en el calendario cuántas hay de cada tipo; cada noche muestra cuántas quedan libres y se cierra al llenarse.
- [ ] Fase 3: el WhatsApp de la empresa usa el canal «WhatsApp de Alux» para cobrar (hoy sigue cobrando solo experiencias) — espera visto bueno.
- [x] Tienda de artesanías piloto: Coqui Coqui.
- [x] Comisión distinta por tipo (tienda, pedidos, hoteles), 15 % inicial, editable por el administrador.
- [x] Pedido de Copalli (2026-11-23): los extras solo se piden con una bebida; al ir a abrir la cuenta o a pagar, siempre se puede volver a la empresa con el pedido intacto.
- [x] Pedido de Copalli: a cada bebida se le pueden elegir extras y escribir una nota (por ejemplo «sin azúcar»), y la empresa la ve en el pedido.
- [x] Tienda (Coqui Coqui y demás artesanías): al comprar se puede escribir una nota («para regalo»…) y la empresa la ve en el pedido.
- [ ] Sincronización con Airbnb / Booking (futura, sin empezar):
  - Opción 1 · Compartir calendarios (iCal): el hotel pega el enlace de Airbnb/Booking en su panel y viceversa; solo pasa «ocupado/libre», no precios ni datos del huésped; actualización cada pocas horas; el hotel sigue confirmando cada reserva.
  - Opción 2 · Gestor de canales (Cloudbeds, SiteMinder): conexión completa con precios, cupos y reservas al instante; requiere que el hotel contrate el servicio; conviene a hoteles con más habitaciones.
  - El calendario actual (noches, stock por habitación, precio por día, bloqueos) ya tiene la estructura que ambas opciones necesitan; se agrega como opción aditiva sin rehacer nada.

## El Cuyo (2026-11-24)
- [x] Dirección web `el-cuyo` y nombre «El Cuyo» corregidos; el destino ya se ve.
- [x] Arreglar todo lo de El Cuyo: frase corta, puntos destacados separados y nombres de dos hoteles.
- [x] Las empresas no se dejaban abrir desde la página del destino (enlace antiguo mandaba a Oriente Maya); ahora abren su ficha en todos los destinos.

- [x] Velocidad al tocar empresas y destinos: enlaces internos sin recargar el sitio, carga adelantada al tocar y una sola lectura reutilizable por ficha.

## Reservar mesa (tipo OpenTable)
- [x] Etapa 1: activar por restaurante, ficha, agenda en Portal, avisos teléfono/WhatsApp, cobro apagado
- [ ] Etapa 1: Alux aparta mesa en la plática
- [ ] Etapa 1: la reservación entra a Mi Viaje
- [ ] Etapa 2: zonas, plano, lista de espera, ficha del comensal, reportes
- [ ] Etapa 3: cobro, depósitos, reseñas de quien asistió
- [x] Itinerario estilo Wanderlog: avance, mapa lateral numerado, traslados, invitación a instalar la app
- [x] Itinerario optimizado para celular
- [x] Itinerario: agregar parada buscando y arrastrar paradas

- [ ] Taxi Alux: varios tipos de autos/taxis con su precio (pendiente, pedido por el usuario)
- [ ] Taxi Alux: asignación automática al taxista libre más cercano
- Taxi: aviso fuera de zona (Mérida → sugerir hospedarse en Valladolid)
- Taxi: administrador marca destinos de salida (recogida); destino de llegada libre en Oriente Maya

## Identidad del acceso y configuración del proyecto · 2026-11-26
- [x] Revisar las opciones de acceso compartidas: sólo Google y correo; acceso publicado y pantalla inicial de Google comprobados sin texto Lovable. No se certificaron reservas, favoritos ni retorno con sesión; detalles en `docs/auth-brand-review-2026-11-26.md`.
- [x] Comprobar la identidad que Google muestra al entrar: `quehacerenvalladolid.com`; no requiere un cambio de código y no implica ocultamiento técnico del alojamiento.
- [ ] Aclarar qué elegir en «tipo de proyecto»: espera captura o lista de las opciones que ve el Founder; sitio publicado ya confirmado público, privacidad del proyecto independiente.
- [x] Galería de empresas: primera foto ancha se recorta sin deformarse en iPhone (forma conservada); pendiente confirmar en iPhone real.
- [ ] Probar reclamo de Copalli como empresario (espera al usuario)
