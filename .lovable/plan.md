# Paleta de Alux configurable por marca

## Objetivo

Extender la configuración existente de **Marca** para que cada marca controle los colores de la interfaz de Alux. La ilustración oficial, su nombre, su comportamiento y sus datos permanecerán intactos.

## Alcance autorizado

- Añadir dentro de **CMS Studio → Marca** una sección **Paleta de Alux**.
- Configurar roles semánticos propios para acciones, texto, superficies, bordes, foco e insignias de Alux.
- Aplicar esa paleta al botón flotante, paneles, chat, sugerencias, contexto, planificador y copiloto de Workspace.
- Mantener herencia segura: una marca sin configuración específica de Alux conservará exactamente los colores actuales mediante valores derivados de su paleta global.
- Mostrar una vista previa de Alux y validar contraste antes de guardar.

## Fuera de alcance e invariantes

- No cambiar la ilustración ni los archivos visuales oficiales de Alux.
- No cambiar textos, posición, navegación, comportamiento, IA, prompts ni lógica de contexto.
- No crear una sección, contrato, renderer o configuración paralela.
- No modificar plantillas Premium, contenido CMS, Alux funcional, Mi Viaje, mapas, header ni footer.
- No publicar ni desplegar.

## Implementación

1. **Extender la autoridad de marca existente**
   - Incorporar `aluxPalette` al mismo contrato persistido `brand.identity`.
   - Normalizar configuraciones antiguas sin ese campo mediante herencia de la paleta global.
   - Mantener compatibilidad hacia atrás y rechazo seguro de colores inválidos.

2. **Crear tokens semánticos de Alux**
   - Exponer variables para color principal, texto sobre principal, superficie, texto de superficie, borde, foco, insignia y texto de insignia.
   - Resolverlas desde el proveedor de marca existente; no crear providers ni motores nuevos.

3. **Ampliar Marca**
   - Añadir controles de color agrupados bajo “Paleta de Alux”.
   - Incorporar comprobaciones de contraste y una vista previa representativa.
   - Guardar junto con la configuración de marca actual.

4. **Conectar las superficies oficiales**
   - Sustituir únicamente los usos visuales de color de Alux por los nuevos tokens en sus componentes canónicos.
   - Conservar tokens globales para estados neutrales y estados de sistema como error, éxito o advertencia.

## Archivos previstos

- `src/config/brand.ts`
- `src/lib/brand/brand-theme.ts`
- `src/lib/brand/brand-settings.functions.ts`
- `src/lib/brand/brand-context.tsx`
- `src/routes/_authenticated/cms/marca.tsx`
- `src/styles.css`
- Componentes canónicos existentes bajo `src/components/alux/`, `src/components/layout/AluxFloatingTrigger.tsx`, `src/components/workspace/AluxCopilotPanel.tsx` y `src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx`, sólo donde hoy consumen color visual de Alux.
- Pruebas de contrato o regresión estrictamente necesarias.

## Controles

### Scope Gate

PASS si sólo se modifica la configuración visual de la interfaz de Alux dentro de la autoridad de Marca y sus consumidores oficiales.

### Preservation Gate

- Comparar antes/después con la configuración actual: sin guardar colores nuevos, la apariencia debe permanecer igual.
- Verificar Marca, Home, ficha Premium con flotantes, `/alux`, planificador y Workspace.
- Revisar 1440, 834, 430 y 390 px, sin solapamientos ni cambios de estructura.
- Ejecutar pruebas de contrato, typecheck y comprobaciones de construcción disponibles.
- Confirmar que la ilustración, contenido, posición y funcionamiento de Alux no cambiaron.
