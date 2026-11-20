# Alux configurable por marca

## Objetivo

Extender la configuración existente de **Marca** para que cada marca controle los colores y toda la voz visible de Alux. Los valores actuales de Valladolid.mx y Oriente Maya quedarán como respaldo compatible; la ilustración oficial, el comportamiento y los datos permanecerán intactos.

## Alcance autorizado

- Añadir dentro de **CMS Studio → Marca** una sección **Paleta de Alux**.
- Configurar roles semánticos propios para acciones, texto, superficies, bordes, foco e insignias de Alux.
- Aplicar esa paleta al botón flotante, paneles, chat, sugerencias, contexto, planificador y copiloto de Workspace.
- Mantener herencia segura: una marca sin configuración específica de Alux conservará exactamente los colores actuales mediante valores derivados de su paleta global.
- Mostrar una vista previa de Alux y validar contraste antes de guardar.
- Añadir dentro de la misma autoridad de **Marca** una sección **Voz de Alux** para editar todos los títulos, descriptores, ayudas, estados, llamadas a la acción, mensajes base y textos territoriales visibles de Alux.
- Permitir que el nombre, territorio y voz cambien por marca —por ejemplo Caribe Mexicano o Yucatán— sin referencias residuales a Valladolid u Oriente Maya.
- Mantener los seis idiomas existentes mediante un diccionario por idioma con español como contenido base y respaldo seguro cuando una traducción no esté completa.
- Conservar en la consola Alux la configuración operativa del modelo, temperatura, capacidades y guardrails; Marca será la autoridad de identidad y voz, no de operación técnica.

## Fuera de alcance e invariantes

- No cambiar la ilustración ni los archivos visuales oficiales de Alux.
- No cambiar posición, navegación, comportamiento, lógica de contexto ni datos dinámicos del catálogo o del viajero.
- No convertir datos dinámicos, mensajes legales, errores técnicos ni contenido generado por IA en textos estáticos de marca.
- No crear una sección, contrato, renderer o configuración paralela.
- No modificar plantillas Premium, contenido CMS, Alux funcional, Mi Viaje, mapas, header ni footer.
- No publicar ni desplegar.

## Implementación

1. **Extender la autoridad de marca existente**
   - Incorporar `aluxPalette` y `aluxCopy` al mismo contrato persistido `brand.identity`.
   - Normalizar configuraciones antiguas sin esos campos mediante herencia de la paleta global y los textos aprobados vigentes.
   - Mantener compatibilidad hacia atrás y rechazo seguro de colores inválidos.

2. **Crear tokens semánticos de Alux**
   - Exponer variables para color principal, texto sobre principal, superficie, texto de superficie, borde, foco, insignia y texto de insignia.
   - Resolverlas desde el proveedor de marca existente; no crear providers ni motores nuevos.

3. **Ampliar Marca**
   - Añadir controles de color agrupados bajo “Paleta de Alux”.
   - Incorporar comprobaciones de contraste y una vista previa representativa.
   - Añadir “Voz de Alux” organizada por propósito e idioma, sin exponer detalles técnicos.
   - Guardar colores y textos junto con la configuración de marca actual.

4. **Conectar las superficies oficiales**
   - Sustituir únicamente los usos visuales de color de Alux por los nuevos tokens en sus componentes canónicos.
   - Conservar tokens globales para estados neutrales y estados de sistema como error, éxito o advertencia.
   - Sustituir textos visibles codificados por el resolutor de voz de la marca, manteniendo variables dinámicas como destino, negocio, producto, fecha o nombre del viajero.
   - Mantener el sistema de traducciones vigente y evitar textos nuevos fuera de la autoridad compartida.

## Archivos previstos

- `src/config/brand.ts`
- `src/lib/brand/brand-theme.ts`
- `src/lib/brand/brand-settings.functions.ts`
- `src/lib/brand/brand-context.tsx`
- Módulo compartido de contrato y resolución de voz de Alux dentro de `src/lib/brand/`.
- `src/routes/_authenticated/cms/marca.tsx`
- `src/styles.css`
- Componentes canónicos existentes bajo `src/components/alux/`, `src/components/layout/AluxFloatingTrigger.tsx`, `src/components/workspace/AluxCopilotPanel.tsx` y `src/components/experience-builder/blocks/alux-planner/AluxPlannerBlock.tsx`, sólo donde hoy consumen color visual de Alux.
- Textos base de Alux hoy repartidos entre i18n, módulos de copy y configuración operativa, sólo para conectarlos a la autoridad de Marca sin alterar sus reglas.
- Pruebas de contrato o regresión estrictamente necesarias.

## Controles

### Scope Gate

PASS si sólo se modifica la identidad visual y verbal de Alux dentro de la autoridad de Marca y sus consumidores oficiales.

### Preservation Gate

- Comparar antes/después con la configuración actual: sin guardar colores o textos nuevos, la apariencia y el contenido deben permanecer iguales.
- Verificar Marca, Home, ficha Premium con flotantes, `/alux`, planificador y Workspace.
- Revisar 1440, 834, 430 y 390 px, sin solapamientos ni cambios de estructura.
- Verificar español, inglés, francés, alemán, italiano y portugués; ninguna marca debe mostrar referencias territoriales de otra marca.
- Ejecutar pruebas de contrato, typecheck y comprobaciones de construcción disponibles.
- Confirmar que ilustración, posición, funcionamiento, contexto dinámico y reglas operativas de Alux no cambiaron.
