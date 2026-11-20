# Alux copiloto real del Concierge y de los editores

Objetivo: que Alux deje de ser sólo un explicador del panel y sea copiloto real del equipo interno —concierge, editores y administradores— pudiendo (1) responder sobre una reservación, pago o expediente concreto y (2) acompañar campo por campo mientras se llena una ficha.

Se construye como delta mínimo sobre lo que ya existe: la conversación `AluxWorkspaceChat`, el asistente `aluxWorkspaceAssist` y las consultas de reservaciones y expedientes ya implementadas. Sin tablas nuevas, sin motores nuevos, sin pantallas paralelas, sin publicar.

## Parte 1 · Alux responde sobre una reservación, pago o expediente

Cuando el concierge escriba un folio (ERL-260915-001, AVL-…, VMX-…) o pregunte por un expediente abierto en pantalla, Alux consulta el dato real y responde con:

- Tipo de venta (experiencia en línea o Arma tu Viaje) y fecha del folio.
- Estado de la reservación y forma de pago: efectivo, tarjeta en línea o pendiente.
- Importe total y fecha de pago si ya se cobró.
- Etapa comercial y fase de viaje del expediente asociado, con las fechas del viaje.
- Qué conviene hacer a continuación según esa fase.

Reglas de cuidado:

- Sólo personal interno: concierge, editores y administradores (super_admin, admin, editor, concierge, concierge_lead). Misma verificación de acceso que ya usa el asistente. Empresarios del Portal quedan fuera.
- Alux sólo lee; nunca marca pagos, cancela, ni cambia estados. Las acciones siguen siendo del panel.
- No expone datos de contacto del viajero salvo el nombre que el panel ya muestra.
- Si el folio no existe o no corresponde, lo dice claramente en lugar de suponer.

## Parte 2 · Alux acompaña a los editores en cada campo

Dentro de los editores del CMS (empresas, productos, eventos, lugares, destinos, zonas, regiones), editores y administradores podrán preguntar a Alux "¿qué escribo aquí?" para el campo o la sección en la que se está trabajando:

- Para qué sirve el campo y dónde se ve publicado.
- Qué conviene escribir, con qué extensión y en qué tono editorial de la marca.
- Qué evita problemas: duplicados, texto genérico, datos inventados, faltantes que impiden publicar (por ejemplo, la ubicación obligatoria).
- Qué falta para pasar de borrador a publicado.

Se añade un acceso discreto "¿Qué escribo aquí?" en la cabecera del editor, que abre la misma conversación de Alux ya conocida, con el contexto de la ficha activa. No se agregan ventanas ni editores nuevos.

## Qué se preserva

Plantillas Premium, diseño, marca, navegación territorial, breadcrumbs, header y footer, permisos, flujo editorial, folios, pagos y el resto del Centro Concierge quedan intactos. El único cambio visible es el botón de ayuda en el editor y respuestas más útiles dentro de la conversación de Alux que ya existe.

## Detalle técnico

1. `src/lib/workspace/workspace-assist.functions.ts`
   - Detección de folio (`ERL|AVL|VMX`) en la pregunta y parámetro opcional `caseId`/`orderId` enviado por la pantalla activa.
   - Lectura server-side con el cliente autenticado del propio usuario (RLS vigente) sobre `concierge_orders`, sus líneas, `concierge_cases` y `travel_plans`; se reutilizan las formas de `ConciergeReservationRow` y `deriveCaseStage`/`CONCIERGE_INBOXES` en lugar de duplicar lógica.
   - El resultado se inyecta como bloque de contexto compacto (sin PII extra) antes de llamar al modelo; el prompt prohíbe inferir datos ausentes.
   - Nuevo glosario editorial para `workspaceId === "cms"`: propósito de cada campo por tipo de entidad, criterios de calidad y requisitos de publicación, derivados de los contratos existentes.
2. `src/components/workspace/AluxWorkspaceChat.tsx`
   - Acepta `seed` opcional (pregunta inicial) y `subject` opcional (`{ kind: "order"|"case"|"entity", id, label, fields? }`) que se envía al asistente.
   - Arrancadores contextuales: en Concierge sobre reservaciones y pagos; en CMS sobre campos de la ficha.
3. `src/components/cms/EntityEditor.tsx`
   - Botón secundario "¿Qué escribo aquí?" que abre `AluxWorkspaceChat` con el tipo de ficha, su estado de publicación y las etiquetas de los campos visibles.
4. Validación: `bunx tsgo --noEmit`, pruebas contractuales existentes, `git diff --check`, recorrido Playwright con sesión administrativa en 1440 / 834 / 430 / 390 px sobre Centro Concierge, una reservación real y un editor del CMS. Sin publicar.
