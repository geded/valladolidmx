# Centro Concierge: propuesta, itinerario y ajustes a la vista

## Problema

Hoy el concierge sólo tiene dos entradas en el menú: Bandeja y Reservaciones. Para ver qué propuesta se le envió al viajero o qué itinerario se armó hay que abrir el expediente y recorrer toda la pantalla hacia abajo. Y cuando el viajero pide cambiar un itinerario ya aprobado, no hay un camino claro: ni para rehacerlo, ni para cobrar la diferencia.

## Qué se construye

### 1. Menú lateral con más accesos (grupo "Trabajo")

| Entrada | Para qué sirve |
|---|---|
| Bandeja | Se conserva igual |
| Propuestas | Todas las propuestas: borrador, enviada, vista, aceptada, rechazada, vencida, reemplazada |
| Itinerarios | Viajes con itinerario armado: día a día, fechas, viajeros y qué sigue |
| Reservaciones | Se conserva igual (pagos y cobros) |
| Preguntas | Mensajes del viajero sin responder |

Cada entrada lleva su contador y respeta el rol de quien entra. No se crean pantallas paralelas: reutilizan el mismo patrón de lista, filtros y paginación del Centro de Operaciones.

### 2. El expediente deja de ser una sola tira larga

El expediente se organiza en pestañas, con el mismo contenido que ya existe, sin perder nada:

`Resumen · Propuesta · Itinerario · Pagos · Mensajes`

- **Propuesta**: la versión vigente arriba (partidas, importes, día y hora, vigencia, estado) y el historial de versiones anteriores debajo.
- **Itinerario**: el viaje día por día tal como lo ve el viajero, con horarios en hora de Mérida.
- **Pagos**: la reservación, forma de pago y bitácora, ya existentes.

### 3. Ajustar un itinerario ya aprobado

Flujo nuevo, apoyado en lo que ya existe (`concierge_proposal_supersede` + reaplicar horarios al viaje):

```text
Viajero pide un cambio
        ↓
Concierge abre "Ajustar itinerario" sobre la propuesta aceptada
        ↓
Edita partidas (agrega, quita, cambia día/hora/importe)
        ↓
El sistema calcula la diferencia contra lo ya cobrado
        ↓
Envía la versión 2 al viajero para su aprobación
        ↓
Viajero acepta → el itinerario del viaje se actualiza
```

**Cómo se cobra la diferencia**
- Si el ajuste **cuesta más**: se genera un cobro complementario ligado al mismo expediente, con folio del mismo día (`AVL-AAMMDD-###`), cobrable en efectivo o en línea igual que hoy. El pago original no se toca.
- Si el ajuste **cuesta menos**: queda registrado un saldo a favor visible en Pagos, con nota en la bitácora. No se devuelve dinero de forma automática: la devolución sigue siendo una decisión humana.
- Si **cuesta lo mismo**: sólo se actualiza el itinerario, sin movimiento de dinero.

En todos los casos queda rastro en la línea de tiempo del expediente: quién pidió el cambio, qué cambió y cuánto costó.

## Alcance técnico

**Autorizado**
- `src/lib/workspace/definitions/index.ts`: nuevas entradas de navegación del workspace concierge (Propuestas, Itinerarios, Preguntas) y sus comandos.
- Nuevas rutas de sólo lectura: `/concierge/propuestas`, `/concierge/itinerarios`, `/concierge/preguntas`, más su registro en `route-inventory.ts`.
- Nuevas lecturas agregadas en `src/lib/concierge/concierge.functions.ts` (listado de propuestas con filtros y paginación) y en `proposal-studio.functions.ts` (itinerarios por expediente), respetando RLS y rol.
- `expedientes.$caseId.index.tsx` y `CaseFileView.tsx`: reorganización en pestañas, sin eliminar secciones ni acciones existentes.
- Ajuste de itinerario: reutiliza `supersedeConciergeProposal` y `applyProposalScheduleToPlan`; cobro complementario sobre `createOrderFromProposal` con el mismo generador de folio.
- Pruebas de contrato ampliadas (bandejas, fases y diferencia de importe).

**No autorizado**
- Tablas, estados, folios o motores nuevos; segundo modelo de propuesta u orden.
- Cambios en plantillas públicas, Mi Viaje del viajero, Portal Empresarial, Alux, header, footer, roles ni RLS más allá de lo descrito.
- Devoluciones automáticas de dinero.
- Publicar o desplegar.

## Preservation Gate

Quedan intactos el Estudio de Propuesta, la Bandeja, Reservaciones, el Portal Empresarial, Mi Viaje, Alux, pagos, permisos y todas las superficies públicas. Validación visual en 1440, 834, 430 y 390 px; `tsgo`, pruebas de contrato y `git diff --check` limpios.
