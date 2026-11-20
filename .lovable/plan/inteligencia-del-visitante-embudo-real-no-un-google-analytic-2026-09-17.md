# Inteligencia del Visitante — embudo real, no un Google Analytics

## Documentación revisada (la correcta)

- Blueprint rector `16.CV8 · Visitor Intelligence Platform v1.0`: recorrido oficial de 10 etapas y 9 transiciones (T1..T9), privacidad, consentimiento y k-anonimato k≥25.
- `16.CV8.1` ingesta de eventos, `16.CV8.2` proyección de etapa, `16.CV8.3` Centro de Inteligencia con sus **12 módulos**, `CV8.4`–`CV8.9` segmentos, oportunidades, validación y cola de decisiones, `CV8.S` simulación.
- `16.AC1 · Anonymous Travel Continuity` (el viaje anónimo vive en el dispositivo) y el blueprint de gobernanza de medición.

## Tus dos preguntas

**¿La sección tendrá menús de embudo y todo eso?** Sí. El blueprint aprobado define 12 módulos: Embudo del viaje, Visitantes anónimos, Conversión, Travel Plans, Alux, Concierge, Empresas, Destinos, Ingresos, Permanencia, Embajadores y Alertas de conversión. Hoy existen sólo algunos; el resto se va activando.

**¿Lo que guarda el visitante en su equipo hace lento el monitoreo con 1000 personas navegando?** No, porque son dos cosas distintas:

- En el equipo del visitante sólo vive **su viaje anónimo** (favoritos y borrador de Mi Viaje), para que no tenga que registrarse. Eso nunca se consulta para los reportes.
- La medición viaja al servidor como **hitos**, no como cada clic: inicio de sesión, exploración profunda, primera intención, plan, caso, reserva. Con límite de frecuencia, sin repetir el mismo hito y sin escribir nada por cada movimiento.
- Los reportes se calculan **en el servidor** sobre el registro histórico, con resúmenes por periodo. Mil personas navegando generan unos pocos hitos cada una, no miles de escrituras.

## Reconocimiento honesto

Lo que entregué antes mide **páginas**. La documentación exige medir **personas y su avance de etapa**. Faltan cinco piezas y los menús del embudo.

## Qué haré (deltas mínimos, sin sistemas nuevos)

- **A1 · Sesión anónima.** Registrar inicio y cierre de sesión con identificador seudónimo y canal de origen, y la transición Extraño → Anónimo una vez por sesión.
- **A2 · Exploración profunda.** Acumular permanencia y superficies distintas en el equipo; al superar el umbral, publicar un solo hito y la transición a Explorador.
- **A3 · Intención anónima.** Publicar señal de intención cuando guarda o agrega algo a su viaje sin cuenta, leyendo el borrador local existente.
- **A4 · Consentimiento por propósito** declarado en cada señal y descarte en el servidor de lo que quede fuera.
- **A5 · k-anonimato k≥25** en lecturas por empresa, landing y portal: "muestra insuficiente" en lugar de la cifra.
- **A6 · Menús del Centro.** Organizar `/cms/visitor-intel` con los módulos del blueprint, empezando por Embudo del viaje, Visitantes anónimos y Conversión; los módulos sin datos muestran "Se activará cuando…", nunca cifras inventadas.
- **A7 · Rendimiento.** Resumen por periodo calculado en el servidor y caché corta de lectura, reemplazable siempre por recálculo.

Una etapa por entrega, con tu validación visual entre cada una.

## Detalle técnico

- Todo viaja por el canal de escritura existente (`ingestAnonymousVisitorEvent` / `ingestVisitorEvent`) y el contrato congelado v1.0.0: `journey.transition`, `intent.signal`, `decision.offered`, `outcome.observed`. Sin ampliar el esquema ni crear tablas.
- Sesión y profundidad se acumulan con la memoria de Alux y el almacenamiento local ya existentes; sólo se publican hitos, con el límite de frecuencia e idempotencia vigentes.
- Agregación admin-only recomputable desde `visitor_intel.events`; k-anonimato aplicado en la capa de lectura del servidor.
- Sin fingerprinting, sin identificadores nuevos del visitante, sin cuenta anónima, sin proveedores externos.

## Preservation Gate

Sin cambios en plantillas Premium, fichas, landings, marca, iconos bordados, Alux, Mi Viaje, Reservaciones, Concierge, folios ERL/AVL, Experience Builder ni el resto de Administración. El delta es sólo emisión de señales, menús del monitor y reglas de lectura.
