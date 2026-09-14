# Confirmación de viaje antes de enviar al Concierge

Hoy el viajero pulsa "Enviar al Concierge" y sólo escribe un resumen libre + sus datos de contacto. El concierge recibe el expediente sin saber cuántas personas viajan realmente, si hay menores, ni cómo piensa moverse. Eso obliga a llamar al cliente antes de poder cotizar.

La propuesta es convertir ese envío en una **confirmación guiada de 3 pasos**, que muestre lo que el viajero ya armó y le pida sólo lo que falta para poder cotizar y armar el itinerario.

## Paso 1 · Confirma tu viaje (revisión, casi todo prellenado)

Se muestra lo que ya existe, editable en línea:

- Destinos y lugares guardados (la lista actual de su viaje, con opción de quitar algo antes de enviar).
- Fechas de llegada y salida → calcula y muestra "7 días / 6 noches".
- Ciudad o país de origen (de dónde llega).
- Cómo llega al destino: avión (con aeropuerto: Mérida, Cancún, Tulum o Chichén Itzá), autobús, auto propio, ya estoy en la zona.

## Paso 2 · Quiénes viajan

- Adultos (número).
- Menores: sí / no. Si sí, edades de cada menor (chips 0-17) — determina sillas de bebé, precios de niño y actividades aptas.
- Adultos mayores o alguien con movilidad reducida: sí / no + nota breve.
- Tipo de grupo: pareja, familia, amigos, solo, empresa.
- Idioma preferido para la atención y los tours.
- Restricciones alimenticias o de salud (texto corto, opcional).

## Paso 3 · Transportación (lo que hoy falta por completo)

Selección principal, una sola opción:

1. **Viajo en mi auto** → pregunta si necesita estacionamiento y rutas sugeridas.
2. **Quiero rentar auto** → fechas de renta, tipo (compacto, SUV, van), si requiere silla infantil, si necesita conductor adicional.
3. **Quiero tours con transportación incluida** → punto de recogida (hotel / dirección) y si prefiere privado o compartido.
4. **Me muevo por mi cuenta (taxi / colectivo)** → el concierge propone rutas y tarifas aproximadas entre los lugares guardados.
5. **Aún no lo decido** → el concierge propone la mejor combinación.

Complementos siempre visibles:

- Traslado aeropuerto ⇄ hospedaje: sí / no / no sé (y desde qué aeropuerto).
- Licencia de conducir vigente (sólo si eligió rentar auto).
- Notas de movilidad (equipaje voluminoso, sillas de ruedas, mascota).

## Cierre · Resumen y contacto

Antes del botón final, una tarjeta de resumen legible: *"2 adultos y 1 menor (6 años) · 27 sep – 3 oct · 7 días / 6 noches · Llegan por avión a Cancún · Quieren rentar auto compacto con silla infantil · 6 lugares guardados"*, más los datos de contacto obligatorios que ya existen (nombre, email, móvil y casilla de WhatsApp) y el resumen libre actual como campo opcional "Algo más que deba saber tu concierge".

Botón final: **Enviar al Concierge**, deshabilitado hasta que fechas, personas y transportación estén respondidas.

## Cómo lo usa el Concierge

Ese bloque llega al expediente como sección **"Brief del viaje"**, arriba de las cotizaciones, en texto humano: composición del grupo, menores y edades, llegada, transportación elegida y pendientes. Con eso puede pedir cotizaciones y armar la propuesta sin llamar primero. Alux también lo usa como contexto para el itinerario posterior.

## Detalle técnico

- Sin tablas nuevas: el brief se guarda en `travel_plans.meta.trip_brief` (jsonb ya existente), validado con Zod y escrito por la server fn de actualización de plan; adultos/menores alimentan `party_size`.
- `promotePlanToCase` incluye el brief en el snapshot del expediente, junto al contacto ya obligatorio.
- UI nueva sólo dentro de `ConciergeSection` en `src/routes/_authenticated/cuenta/mi-viaje.tsx`, reutilizando componentes existentes; el expediente añade la sección de lectura en `CaseFileView.tsx`.
- Sin tocar plantillas Premium, header, footer, mapas, pagos ni el resto de Mi Viaje. Validación visual en 1440 / 834 / 430 / 390. Sin publicar.

## Preguntas abiertas

1. ¿Los tres pasos en una sola pantalla con secciones (más rápido en móvil) o un asistente paso a paso con barra de avance?
2. ¿Hacemos obligatorio el dato de menores y transportación, o permitimos "aún no lo decido" en todo para no frenar el envío?
