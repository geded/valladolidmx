# Estudio de Propuesta del Concierge

Hoy la propuesta se arma al final del expediente, en la misma pantalla, y se vuelve un "chorizo" largo. Además las partidas sólo llevan concepto y precio, así que nada de lo que arma el Concierge llega al itinerario del viajero.

Este plan crea un **espacio propio para armar la propuesta**, con día, hora y duración por partida, y con sugerencias de Alux basadas en lo que el viajero guardó y en lo que navegó.

## 1. La propuesta deja de vivir dentro del expediente

- En el expediente queda un bloque corto: propuestas existentes (versión, estado, monto, fecha) y un botón **"Armar propuesta"** / **"Nueva versión"**.
- Ese botón abre una pantalla propia del expediente: **Estudio de Propuesta**, con encabezado (viajero, expediente, fechas, personas), y botón para volver.
- Se elimina el compositor extenso de la vista del expediente; no se duplica: es el mismo compositor, movido y ampliado.

## 2. Qué se ve al entrar al Estudio

Tres columnas en escritorio, una sola columna apilada en tablet y móvil:

**Izquierda · Lo que quiere el viajero**
- Brief del viaje (fechas, personas, menores, transporte, idioma) ya capturado.
- Lugares y experiencias que guardó en Arma tu Viaje.
- Fichas que abrió y categorías que buscó al navegar el territorio.
- **Sugerencias de Alux**: propuestas de actividades que el viajero no guardó pero que encajan con su navegación, sus fechas y su ubicación. Cada sugerencia dice por qué se sugiere.
- Cada elemento (guardado o sugerido) tiene un botón **"Agregar a la propuesta"**.

**Centro · Partidas de la propuesta**
Cada partida tiene:
- Concepto y descripción para el viajero.
- **Día del viaje y hora de inicio** (formato del destino, hora de Mérida) y **duración**.
- **Precio con formato de moneda** (MXN, separadores de miles, dos decimales al escribir, se guarda en centavos).
- Marcarla como **sugerencia sin costo**: aparece en la propuesta del viajero y en su itinerario como recomendación, sin sumar al total.
- Origen visible: cotización de empresa, precio propio del Concierge, o sugerencia de Alux.
- Botón **"Solicitar cotización a la empresa"** cuando la partida viene de una ficha con empresa: crea la solicitud sin salir del Estudio, y al llegar la respuesta se puede enlazar el precio a esa partida.
- Reordenar partidas dentro de cada día.

**Derecha · Resumen y envío**
- Vista por días del itinerario resultante, con avisos si dos partidas se enciman o caen fuera del horario de apertura conocido.
- Total, moneda, vigencia, mensaje al viajero y condiciones.
- Guardar borrador / Enviar al viajero (sin cambiar el flujo de envío actual).

## 3. Que la propuesta llegue al itinerario

Al aceptar la propuesta, cada partida con día/hora se copia al viaje del viajero como actividad con horario **definido por tu concierge**, respetando el motor de horarios ya construido. Las partidas sin hora quedan en el día, y Alux puede sugerirles horario como hoy. Las sugerencias sin costo también entran al itinerario, marcadas como recomendación.

## 4. Qué se preserva

Header, footer, breadcrumbs, Workspace, plantillas públicas, Mi Viaje, pagos, correos, estados del expediente y el ciclo cotización → propuesta → aceptación → reservación → pago quedan intactos. El único cambio de comportamiento es dónde se arma la propuesta y qué datos lleva cada partida.

## Detalle técnico

- Migración sobre `concierge_proposal_items`: `day_index int`, `starts_at_local time`, `duration_minutes int` (1..1440), `is_suggestion boolean default false`, `source text` (`quote | manual | alux`), `title`/`notes` ya existen. Sin borrado de datos.
- `concierge_proposal_create` acepta los campos nuevos por partida; las sugerencias sin costo no suman a `total_amount_cents`.
- Ruta nueva `src/routes/_authenticated/concierge/expedientes.$caseId.propuesta.tsx` con `noindex`; `ProposalComposer` se extrae de `CaseFileView.tsx` a `src/components/concierge/proposal/` y se amplía.
- Panel de sugerencias: reutiliza `getConciergeCaseHandoffContext` (plan snapshot, fichas abiertas, memoria territorial) y el motor `src/lib/traveler/day-schedule.ts` para horarios, horarios de apertura y traslados; nada inventado, todo con `rationale` y fuentes.
- Al aceptar, la función que hoy crea la reservación escribe también `travel_plan_items` con `starts_at_local`, `duration_minutes` y `schedule_source = "concierge"`.
- Formato de moneda/fecha/hora vía `Intl` y `src/lib/time/merida.ts`; ningún componente nuevo de diseño fuera de OMXDS.
- Verificación: typecheck, build, pruebas de contrato de concierge y revisión visual en 1440 / 834 / 430 / 390. Sin publicar.
