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

## 4. Rapidez para cientos de propuestas

- **Plantillas de propuesta**: el Concierge guarda combinaciones que repite (por ejemplo "Ek Balam + cenote, día completo") y las aplica a un expediente en un clic; luego ajusta fechas, personas y precios.
- **Alta rápida**: una línea de captura donde escribe concepto, precio y hora y presiona Enter para crear la partida; `Ctrl/⌘ + Enter` guarda el borrador; `Ctrl/⌘ + D` duplica una partida a otro día.
- **Duplicar propuesta anterior** como nueva versión sin volver a capturar.
- Autoguardado del borrador mientras trabaja, para no perder capturas.

## 5. Alux como copiloto del Concierge

Alux no sólo lista lo que el viajero guardó: propone el armado.

- Botón **"Que Alux arme un primer borrador"**: distribuye lo guardado y lo sugerido por días según fechas, horarios de apertura reales, distancias entre puntos, clima y llegada/salida; deja huecos para comidas y traslados.
- Cada sugerencia explica **por qué** y **de dónde salió el dato**; el Concierge acepta, ajusta o descarta. Alux nunca envía nada al viajero.
- El contexto del destino (horarios, clima, tráfico y, más adelante, eventos y cierres) se lee del motor de contexto ya aprobado, no de proveedores sueltos.
- Alux avisa de choques de horario, cierres ese día del semana y trayectos imposibles antes de enviar.

## 6. Cómo la ve el viajero y PDF

Una propuesta larga ya no puede ser una lista corrida:

- La propuesta del viajero se presenta **por días**, con resumen arriba (fechas, personas, total, vigencia) y cada día plegable; las recomendaciones sin costo se muestran aparte, marcadas como sugerencia.
- Botones "Aceptar" y "Pedir cambios" quedan siempre visibles, también en móvil.
- Botón **"Descargar PDF"**: abre una versión para impresión con la marca configurada en el CMS (logo, colores, contacto), itinerario por días, incluye/no incluye, condiciones y total. El Concierge tiene el mismo botón desde el expediente para enviarla por fuera.

## 7. Qué se preserva

Header, footer, breadcrumbs, Workspace, plantillas públicas, Mi Viaje, pagos, correos, estados del expediente y el ciclo cotización → propuesta → aceptación → reservación → pago quedan intactos. El único cambio de comportamiento es dónde se arma la propuesta y qué datos lleva cada partida.

## Detalle técnico

- Migración aditiva sobre `concierge_proposal_items`: `day_index int`, `starts_at_local time`, `duration_minutes int` (1..1440), `is_suggestion boolean default false`, `source text` (`quote | manual | alux`). Nueva tabla `concierge_proposal_templates` (propietario + items JSON) con GRANTs y RLS para personal interno. Sin borrado de datos.
- `concierge_proposal_create` acepta los campos nuevos por partida; las sugerencias sin costo no suman a `total_amount_cents`.
- Ruta nueva `src/routes/_authenticated/concierge/expedientes.$caseId.propuesta.tsx` (noindex); `ProposalComposer` se extrae de `CaseFileView.tsx` a `src/components/concierge/proposal/` y se amplía. Borrador local con autoguardado por expediente.
- Sugerencias: `getConciergeCaseHandoffContext` (plan, fichas abiertas, memoria territorial) + `resolveTravelerDestinationContext` (clima/horarios/tráfico, Context Engine) + `src/lib/traveler/day-schedule.ts` para el armado por días. Todo con `rationale` y `sources`; nada inventado.
- PDF: vista de impresión `.../propuesta/$proposalId/imprimir` con CSS `@media print` y tokens de marca del CMS; sin dependencias nuevas ni librerías incompatibles con el runtime del servidor.
- Al aceptar, la función que hoy crea la reservación escribe también `travel_plan_items` con `starts_at_local`, `duration_minutes` y `schedule_source = "concierge"`.
- Formato de moneda/fecha/hora vía `Intl` y `src/lib/time/merida.ts`; ningún componente de diseño fuera de OMXDS.
- Verificación: typecheck, build, pruebas de contrato de concierge y revisión visual en 1440 / 834 / 430 / 390, incluida la vista de impresión. Sin publicar.

## Orden de entrega

1. Estudio de Propuesta con día/hora/duración, moneda formateada y paso al itinerario.
2. Panel de sugerencias de Alux con contexto del destino y borrador automático.
3. Vista por días para el viajero + PDF.
4. Plantillas, atajos y duplicado para volumen alto.

