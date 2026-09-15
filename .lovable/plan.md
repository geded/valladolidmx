# Lenguaje claro para editores y concierge

## Objetivo
Hacer comprensibles los estados, acciones e historiales del CMS para usuarios no técnicos, conservando intactos los datos internos, permisos, validaciones, trazabilidad y flujo editorial oficial.

## Clasificación y alcance
- **Clase:** mejora localizada de texto y presentación.
- **Superficies autorizadas:** componentes compartidos que muestran estados, acciones e historial editorial en CMS; moderación de reseñas; flujo editorial de Lugares; resumen del CMS.
- **No se modifica:** base de datos, valores internos (`draft`, `in_review`, etc.), permisos, roles, transiciones permitidas, funciones de guardado/publicación, plantillas Premium públicas, Experience Builder, Concierge operativo, navegación, marca ni datos reales.

## Implementación
1. Crear una única capa compartida de lenguaje claro para traducir, sólo al mostrar:
   - `draft` → **Borrador**
   - `in_review` → **En revisión**
   - `approved` → **Aprobado**
   - `published` → **Publicado**
   - `archived` → **Archivado**
   - `created` → **Contenido creado**
   - `updated` → **Contenido actualizado**
   - `transition` → **Estado cambiado**
2. Sustituir “Workflow editorial” por **Estado de publicación** y explicar cada acción en lenguaje directo.
3. Convertir cada registro del historial en una frase legible, por ejemplo: **Estado cambiado de En revisión a Aprobado**, con fecha y responsable cuando ese dato exista.
4. Ocultar identificadores técnicos como `content_audit_log` y `metadata.moderation_history` de la vista principal; conservarlos, sin alterar su contenido, dentro de un control plegable **Detalle técnico**.
5. Aplicar la misma capa compartida a listados, editores genéricos, Lugares y moderación para evitar traducciones distintas entre categorías, zonas, destinos, rutas, empresas, productos, eventos y reseñas.
6. Mantener botones y acciones actuales, pero mejorar mensajes ambiguos como “Sin transiciones disponibles” por instrucciones comprensibles según el estado.

## Archivos previstos
- Utilidad compartida de lenguaje editorial dentro de la biblioteca CMS existente.
- `src/components/cms/EntityListView.tsx`
- `src/components/cms/EntityEditor.tsx`
- `src/components/cms/ReviewModerator.tsx`
- `src/components/cms/places/PlaceEditor.tsx`
- `src/routes/_authenticated/cms/index.tsx`
- Sólo otros consumidores directos donde la auditoría confirme que aún se expone el mismo lenguaje técnico.

## Controles obligatorios
- **Scope Gate:** revisar que el diff contenga únicamente traducción y presentación de estos conceptos.
- **Preservation Gate:** comprobar que valores enviados al backend, permisos, transiciones y registros de auditoría sean idénticos antes y después.
- Validar CMS completo en **1440, 834, 430 y 390 px**, especialmente listados, edición, estado de publicación, historial, moderación y Lugares.
- Ejecutar comprobaciones de tipos, pruebas relevantes, compilación, Route Inventory y Governance Integrity disponibles.
- Comparar visualmente antes/después; cualquier cambio colateral fuera del lenguaje autorizado bloquea el cierre.
- No publicar ni desplegar.

## Resultado esperado
Editores y concierge verán instrucciones, estados e historial en español claro, mientras el sistema conserva exactamente la misma operación y trazabilidad interna.
