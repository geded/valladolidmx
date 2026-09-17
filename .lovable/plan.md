# Monitor de visitantes anónimos — alinear con la documentación aprobada

## Qué documentación revisé ahora (la correcta y completa)

- Blueprint rector `16.CV8 · Visitor Intelligence Platform v1.0` (recorrido oficial de 10 etapas, 9 transiciones T1..T9, privacidad, k-anonimato, consentimiento).
- Sub-olas `CV8.0` contratos congelados, `CV8.1` ingesta, `CV8.2` proyección de estado, `CV8.3` Centro de Inteligencia, `CV8.4`–`CV8.9` segmentos, oportunidades, validación y cola de decisiones, `CV8.S` simulación.
- `16.AC1 · Anonymous Travel Continuity` y la política de continuidad anónima (local-first, sin cuenta anónima, sin fingerprinting).
- Blueprint de gobernanza `10-OMXDS-VISITOR-JOURNEY-INTELLIGENCE-MEASUREMENT`.

## Reconocimiento honesto

Lo que entregué (M1–M3) mide **páginas**: visitas, lectura profunda, origen, dispositivo, idioma. La documentación aprobada exige medir **personas anónimas y su avance de etapa**. Mi entrega cubre sólo la capa más superficial y no contradice el contrato, pero se queda corta en cinco puntos concretos.

## Huecos reales frente a la documentación

1. **Inicio y fin de sesión anónima** (`T1 Extraño → Anónimo`): no se registra el arranque de sesión ni su cierre, así que no se puede leer "cuántos visitantes nuevos llegaron y por qué canal".
2. **Exploración profunda** (`T3 → Explorador`): falta la señal de profundidad real (varias superficies, permanencia, regreso) que define a un Explorador. Hoy sólo hay medio scroll en una página.
3. **Primera intención** (`T4 → Interesado`): favoritos y "agregar a Mi Viaje" anónimos viven en el dispositivo y no producen señal, así que el paso de Explorador a Interesado no se ve.
4. **Consentimiento por propósito**: el contrato exige declararlo en cada señal; hoy sólo se respeta la pausa de personalización.
5. **k-anonimato k≥25**: las lecturas agregadas por empresa y por landing deben ocultar cortes pequeños para no reidentificar a nadie. Falta ese control.

## Qué haré (deltas mínimos, sin sistemas nuevos)

- **A1 · Sesión anónima.** Emitir inicio y cierre de sesión con identificador de sesión seudónimo (rotativo, sin datos personales) y canal de origen, y registrar la transición Extraño → Anónimo una sola vez por sesión.
- **A2 · Profundidad.** Consolidar permanencia y número de superficies distintas de la sesión; al superar el umbral aprobado, registrar exploración profunda y la transición a Explorador.
- **A3 · Intención anónima.** Emitir señal de intención cuando el visitante guarda o agrega algo a su viaje sin cuenta, leyendo el borrador local existente; sin crear fila de visitante ni escribir por cada clic.
- **A4 · Consentimiento.** Declarar el propósito en cada señal y descartar en el servidor lo que quede fuera de propósito.
- **A5 · k-anonimato.** Ocultar cifras agregadas con menos de 25 sujetos en las lecturas de empresa, landing y portal, mostrando "muestra insuficiente" en lugar del número.
- **A6 · Lectura por etapa.** En Inteligencia del Visitante, presentar el bloque de páginas junto al avance por etapa (nuevos, exploradores, interesados, plan, concierge, reserva) con las cifras que ya proyecta el sistema.

Una etapa por entrega, con tu validación visual entre cada una.

## Detalle técnico

- Todo viaja por el canal de escritura existente (`ingestAnonymousVisitorEvent` / `ingestVisitorEvent`) y el contrato congelado v1.0.0: `journey.transition`, `intent.signal`, `decision.offered`, `outcome.observed`. Sin ampliar el esquema ni crear tablas.
- Sesión y profundidad se acumulan en el dispositivo (memoria de Alux + almacenamiento local ya existente) y sólo se publica el hito, respetando el límite de frecuencia actual.
- Sin fingerprinting, sin identificadores nuevos del visitante, sin proveedores externos, sin cuenta anónima.
- k-anonimato se aplica en la capa de lectura del servidor, no en el cliente.

## Preservation Gate

Sin cambios en plantillas Premium, fichas, landings, marca, iconos bordados, Alux, Mi Viaje, Reservaciones, Concierge, folios ERL/AVL, Experience Builder ni el resto de Administración. El delta es sólo emisión de señales y reglas de lectura.
