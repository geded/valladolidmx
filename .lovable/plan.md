# Plan · Qué hacer: inspiración y visibilidad empresarial

## Decisión de producto

`/que-hacer` será una portada editorial para descubrir el Oriente Maya y una superficie comercial gobernada para empresas, no otro catálogo de Lugares.

La selección combinará tres carriles claramente separados:

1. **Recomendados por Valladolid.mx**: selección editorial manual por calidad, interés turístico, vigencia y diversidad territorial.
2. **Descubrimiento orgánico**: rotación diaria entre fichas publicadas y completas, respetando destino, categoría y preferencias explícitas del visitante.
3. **Visibilidad contratada**: contenidos de empresas con paquete vigente, relevantes para la sección y con cupo máximo. La transparencia comercial se comunica de forma discreta en la información de la tarjeta, nunca sobre la fotografía.

## Autoridad revisada

- La estrategia 14.40.B propone separación entre catálogo editorial y monetización, etiquetado obligatorio, auditoría y máximo orientativo de 25 % de espacios patrocinados. El índice maestro la clasifica como `Draft`; por tanto sirve como base para esta aprobación, no como autorización previa de implementación.
- Los paquetes, solicitudes, activación y vigencia ya existen en Portal Empresa y Administración mediante `visibility_plans` y `business_visibility_grants`.
- El ranking público actual ya consume `business_effective_visibility` y `active_founder_spotlights` para empresas, pero hoy suma sus impulsos y ordena por ellos antes del criterio orgánico. Esa conducta no se extenderá a `/que-hacer` sin acotarla mediante espacios explícitos.
- `Founder Spotlight` es una sobreexposición administrativa temporal y distinta de un paquete contratado.
- La propuesta 14.40.B no autoriza por sí sola nuevas tablas o un motor nuevo; este plan reutiliza exclusivamente la infraestructura vigente y requiere autorización específica antes de implementar el enlace con `/que-hacer`.

## Criterios de elegibilidad

Todo contenido, sea orgánico o contratado, debe estar publicado, visible, vigente, territorialmente coherente y con portada acreditada y ficha mínima completa.

- **Destinos recomendados:** exclusivamente editoriales; no se venden como espacios comerciales.
- **Eventos:** prioridad orgánica por fecha próxima; los vencidos nunca participan.
- **Experiencias:** deben tener ficha completa; la visibilidad contratada no activa venta, precio, cupo ni reservación.
- **Lugares de interés:** `/lugares` conserva la autoridad de entidad; sólo se presentan accesos a sus fichas existentes.
- **Contenido contratado:** requiere grant activo de la empresa y aprobación editorial del elemento mostrado.
- **Founder Spotlight:** puede ocupar un espacio destacado temporal, separado del editorial y del contratado, con motivo y vigencia auditables.

## Reglas de orden y rotación

- El editor puede fijar y ordenar contenidos editoriales desde el Experience Builder.
- Los espacios orgánicos restantes rotan una vez al día, de forma determinista y estable durante el día.
- **Prioridad de posición (modelo buscador):** dentro de cada bloque de 4 tarjetas, el espacio comercial es el primero. El contenido con contrato vigente y elegible ocupa esa posición delante de los orgánicos; si no hay contratado elegible, la posición la toma el siguiente orgánico y el bloque queda completo sin huecos.
- Máximo **1 contenido contratado por cada 4 tarjetas visibles**; nunca se ocultan empresas sin plan.
- Máximo **2 apariciones por empresa en toda la página y 1 por carril**, aplicable también al contenido contratado.
- Este mismo cupo, la prioridad de posición y la indicación discreta se aplican además a los listados de Hoteles, Restaurantes, Casas de vacaciones, Eventos, Lugares y listados territoriales, para acotar el impulso comercial que hoy actúa sin límite.
- La fotografía permanece limpia: sin badges, cintillos ni etiquetas comerciales superpuestas. La indicación breve `Recomendado` aparece como texto secundario junto a los datos de la ficha y no ocupa un espacio editorial adicional.
- Para evitar confusión con la curaduría editorial, el carril editorial se titula `Recomendados por Valladolid.mx` y la ficha contratada usa únicamente la palabra `Recomendado` en su información. Sólo son elegibles fichas que el equipo editorial aprobó, de modo que la palabra siga siendo verdadera para el viajero; la trazabilidad comercial queda auditada en Administración.
- Los filtros y la intención explícita del viajero siempre prevalecen sobre cualquier impulso comercial.
- Un pago nunca hace elegible una ficha incompleta ni desplaza un resultado claramente más relevante fuera de su espacio comercial asignado.
- Desempate orgánico: calidad de ficha, actualidad, cercanía temática y variedad entre destinos.
- Si faltan candidatos válidos, se muestran menos tarjetas o se oculta el carril; nunca se rellenan con fixtures.

## Scope Gate

- Evolucionar únicamente la composición publicada de `/que-hacer` sobre su autoridad Premium actual.
- Incorporar carriles compactos con encabezados: Destinos recomendados, Próximos eventos, Experiencias para vivir y Lugares de interés.
- Reutilizar las tarjetas, rutas, medios y lecturas CMS-first oficiales de cada familia.
- Añadir a la composición controles de título, visibilidad, límite, selección manual, orden y relleno orgánico.
- Declarar en la composición qué carriles admiten visibilidad contratada y su cupo, sin crear otro sistema de planes ni ranking.

## Operación en CMS y Portal Empresa

### Experience Builder

- El equipo editorial configura encabezados, orden de carriles, selección manual y límite de elementos.
- Puede aprobar o excluir una ficha de los espacios contratados sin alterar su publicación normal.
- Constructor, preview y ruta pública consumen la misma composición.

### Administración · Visibilidad

- Conserva el catálogo de paquetes, solicitudes, vigencia y cancelación actuales.
- Añade `/que-hacer` como superficie disponible sólo mediante una palanca configurable del paquete vigente.
- Muestra cupo disponible, vigencia, empresa, modalidad de promoción e impresiones/clics agregados de la superficie.
- `Founder Spotlight` permanece separado, temporal y auditado.

### Portal Empresa

- La empresa solicita o consulta su paquete como hoy.
- El grant vigente hace elegibles sus fichas publicadas y completas; no permite elegir ni autoimpulsar contenido incompleto.
- La contratación no publica ni posiciona automáticamente: la elegibilidad final pasa por las reglas editoriales fail-closed.
- El Portal explica alcance, vigencia y resultados sin prometer una posición fija permanente.

## Preservation Gate

- Conservar header, footer, breadcrumb, búsqueda, idioma, Alux global, Mi Viaje, marca y responsive vigentes.
- No modificar plantillas ni datos fuente de Destinos, Eventos, Experiencias o Lugares.
- No mezclar señales comerciales dentro del razonamiento de Alux.
- No cambiar la estrategia de conversión ni habilitar reservación por contratar visibilidad.
- No crear tablas, planes, cards, rankings, landings ni superficies paralelas.
- No publicar, cobrar ni activar paquetes nuevos sin autorización expresa.

## Implementación por etapas

1. **Contrato y maqueta:** definir composición, proporción 3 orgánicos + 1 contratado y estados visuales; aprobación Founder antes de código público.
2. **Curaduría editorial:** conectar selección, orden, límites y rotación diaria usando el contrato oficial de colecciones.
3. **Visibilidad contratada:** leer grants vigentes y palancas existentes; asignar únicamente los espacios comerciales declarados, con elegibilidad editorial y una indicación `Recomendado` discreta fuera de la fotografía.
4. **Flujo empresa–administración:** reutilizar solicitud, revisión, activación, vencimiento y cancelación del paquete; la curaduría del contenido permanece en el Experience Builder.
5. **Medición:** registrar impresión, clic y entrada a ficha diferenciando editorial, orgánico, contratado y Spotlight.

## Validación

- Comparativa antes/después en 1440, 834, 430 y 390 px.
- Un H1, cero overflow, controles táctiles accesibles y navegación por teclado.
- Verificar cupo comercial, indicación discreta fuera de la fotografía, vigencia, filtros, rotación estable y estados sin candidatos.
- Confirmar que contenido sin plan sigue apareciendo orgánicamente y que un grant vencido pierde el impulso.
- Confirmar paridad Experience Builder, preview y `/que-hacer` pública.
- Ejecutar typecheck, pruebas focalizadas, Route Inventory y controles de gobernanza disponibles.
- No publicar ni desplegar.