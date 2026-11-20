# Expediente Concierge en lenguaje claro

## Objetivo
Convertir la vista actual del expediente en una lectura operativa comprensible para el Concierge, sin cambiar datos, permisos, estados ni flujo de asignación/cotización.

## Scope Gate
**Autorizado:** presentación del expediente existente y de la interpretación consultiva de Alux.

**Archivos previstos:**
- `src/components/concierge/CaseFileView.tsx`
- Un módulo pequeño de etiquetas compartidas sólo si evita duplicar traducciones dentro de la misma familia Concierge.
- Pruebas dirigidas del expediente y actualización del seguimiento de la incidencia.

**Fuera de alcance:** base de datos, expedientes existentes, lógica de Alux, prompts, asignaciones, SLA, cotizaciones, propuestas, permisos, navegación, plantillas públicas, publicación y despliegue.

## Cambios
1. Traducir estados y claves internas a etiquetas humanas: estado del expediente, prioridad, origen, tipo de solicitud, estado de solicitud/cotización/propuesta, SLA y eventos de la línea de tiempo.
2. Sustituir textos técnicos como `travel_plan`, `normal`, `new`, `system`, `read-only`, “M2”, “handoff” e “ítems” por explicaciones claras en español.
3. Presentar el contexto capturado por Alux como bloques legibles:
   - preferencias del viajero con valores interpretados;
   - experiencias guardadas con su tipo en lenguaje humano;
   - cupones y memoria territorial resumidos por campos reconocidos;
   - estados vacíos que expliquen qué información falta sin nombrar mecanismos internos.
4. Mostrar los resultados de Alux como recomendaciones fáciles de escanear, conservando el texto original pero evitando que modelo, latencia o estructuras técnicas dominen la lectura.
5. Mantener identificadores y datos técnicos sólo donde sean necesarios para trazabilidad interna, con jerarquía visual secundaria.

## Preservation Gate
- Conservar exactamente el expediente, sus datos y permisos por rol.
- Conservar botones, asignación, prioridad, SLA, solicitudes, cotizaciones, propuestas y línea de tiempo.
- No ocultar información operativa ni alterar acciones.
- No modificar Centro Concierge, Mi Viaje, Alux público, mapas, header, footer o plantillas Premium.

## Validación
- Caso real recibido desde Mi Viaje: confirmar que muestra sus seis elementos con nombres comprensibles.
- Verificar la vista interna y la vista del viajero para evitar fuga de información interna.
- Validar estados vacíos y resultados de Alux.
- Revisar 1440, 834, 430 y 390 px: sin desbordamiento, solapamientos ni pérdida de acciones.
- Ejecutar typecheck y pruebas dirigidas del expediente.
- No publicar ni desplegar.
