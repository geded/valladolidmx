# Centro Concierge: bandejas de seguimiento tipo correo

## Objetivo
Que el equipo pueda operar 100 expedientes al día sin perder ninguno: ver en qué etapa real está cada uno, quién lo atiende, qué falta y qué ya se envió, aceptó o perdió. Todo sobre el ciclo oficial ya documentado, sin crear otro modelo de expediente.

## Etapas oficiales que se van a reflejar (documentación 14.60.x / 15.10.4)
- Expediente: `new → triaged → in_progress ⇄ awaiting_traveler ⇄ awaiting_business → closed_won | closed_lost | archived`.
- Cotización de empresa: `requested → submitted → accepted | rejected | withdrawn | expired`.
- Propuesta del Concierge: `draft → sent → viewed → accepted | rejected | withdrawn | superseded | expired`.

## Scope Gate

**Autorizado**
- Reorganizar la pantalla `/concierge` en bandejas de seguimiento.
- Añadir una lectura agregada (sólo lectura) que devuelva, por expediente ya visible, el conteo de cotizaciones por estado, el estado de la última propuesta y el nombre del concierge asignado.
- Mostrar en cada tarjeta: número de expediente legible, etapa en lenguaje claro, responsable, SLA, prioridad y "qué falta ahora".
- Permitir asignar a otro concierge (y reasignar/liberar para Lead/Admin) usando las operaciones oficiales existentes.
- Buscar por número de expediente o resumen y filtrar por responsable.

**No autorizado**
- No crear tablas, estados, folios ni un segundo modelo de expediente o de propuesta.
- No cambiar el detalle del expediente, Mi Viaje, Alux, el Portal Empresarial, pagos, roles ni RLS.
- No exponer identidad ni contacto del viajero a empresas.
- No publicar ni desplegar.

## Bandejas propuestas
Derivadas del estado real, no de campos nuevos:

| Bandeja | Qué contiene |
|---|---|
| Sin asignar | Expedientes sin responsable activo (entrada) |
| Mis expedientes | Asignados a quien mira, sin cerrar |
| Esperando cotización | Con cotizaciones solicitadas y aún sin respuesta de empresa |
| Listos para proponer | Con al menos una cotización respondida y sin propuesta enviada |
| Propuestas enviadas | Última propuesta en enviada o vista |
| Requieren ajuste | Propuesta rechazada, retirada, reemplazada o vencida |
| Aceptadas | Propuesta aceptada o expediente ganado |
| Cerrados | Perdidos y archivados |
| Todo el equipo (Lead) | Vista completa con responsable y etapa |

Cada bandeja muestra su contador. El encabezado conserva la carga de trabajo actual (activos, vencidos, por vencer).

## Implementación
1. **Lectura agregada**: nueva función de servidor de sólo lectura sobre `concierge_proposals`, `concierge_quotes`, `concierge_assignments` y el perfil del concierge, para los expedientes que el rol ya puede ver. Se apoya en `concierge_case_list_for_role` como fuente de la lista; no duplica la fuente de verdad.
2. **Derivación de etapa**: una sola función en cliente convierte estado del caso + cotizaciones + última propuesta en una etapa legible y en la acción siguiente sugerida ("Falta solicitar cotización", "Esperando a 2 empresas", "Listo para armar propuesta", "Enviada hace 2 días, sin abrir", "Rechazada: requiere ajuste").
3. **Pantalla `/concierge`**: bandejas con contadores, orden por SLA, filtros existentes (prioridad, SLA, orden) preservados, búsqueda y filtro por responsable.
4. **Tarjeta de expediente**: `Expediente CCD06712`, etapa, responsable con nombre (no identificador), SLA, prioridad, última actividad y acciones de asignación según rol.
5. **Asignación**: "Asignarme" se mantiene; se añade selector de concierge para Lead/Admin usando `assignConciergeCase` / `reassignConciergeCase` / `releaseConciergeCase`.
6. **Evidencia**: contrato de pruebas para etapas derivadas y bandejas, typecheck, `git diff --check` y revisión visual en 1440, 834, 430 y 390 px.

## Preservation Gate
Se preservan el detalle del expediente, el compositor de propuesta, el Portal Empresarial sin datos del viajero, Mi Viaje, Alux, pagos, permisos, header, footer, navegación pública y plantillas Premium. Cualquier diferencia fuera de la pantalla de bandeja detiene la entrega.

## Nota
La documentación tiene una discrepancia entre `closed_won` (15.10.4) y `won` (16.CV4.0). Se usará lo que la base de datos acepta hoy (`closed_won`) y se reportará la divergencia sin modificar datos.
