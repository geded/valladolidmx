# Monitor de usuarios y estadísticas de landing pages

## Qué ya existe (verificado en el sistema)

- **Administración → Inteligencia del Visitante** (`/cms/visitor-intel`), con sus pantallas de **Decisiones** y **Simulación**. Es la superficie oficial del monitor; no se crea otra.
- **Motor de señales** ya instalado y cerrado por seguridad: registro append-only de eventos con etapa de viaje, superficie, ruta, destino, idioma y nivel de confianza, más los agregados de KPIs, segmentos, oportunidades y recomendaciones.
- **Documentación vinculante**: Blueprint de Medición del Recorrido del Visitante (dos dimensiones: madurez de relación y momento del viaje; consentimiento por propósito; explicabilidad; decisiones, no vanidad).
- **Reservaciones** ya entregado: listados, detalle, filtros, totales por método de pago, reembolsos y avisos.

## El hueco real

Hoy casi ninguna página pública emite señales: sólo Alux lo hace. Por eso **no hay estadísticas por página ni por landing**. Las landings `/l/<slug>` no registran visitas, origen de tráfico ni conversión.

## Cómo será la sección

El monitor **no será un Google Analytics paralelo**. Será la misma Inteligencia del Visitante, alimentada por fin con señales de página y con dos lecturas nuevas:

1. **Rendimiento de páginas** (dentro de `/cms/visitor-intel`): visitas, visitantes distintos, origen (buscador, campaña, referido, directo), idioma, dispositivo, permanencia y siguiente paso. Filtrable por tipo de página: Home, destinos, categorías, perfiles de empresa, fichas de producto y **landings SEO**.
2. **Estadísticas de esta landing**: tarjeta dentro del panel "Landing SEO premium" del perfil de empresa, junto al enlace `/l/<slug>`. Muestra visitas, origen, clics a la ficha, agregados a Mi Viaje y reservas atribuidas, con el periodo seleccionable.

Cada lectura cierra con el embudo turístico: **visita → exploración → Mi Viaje → propuesta/Concierge → reserva pagada**, cruzado con el módulo de Reservaciones ya existente.

## Etapas propuestas

- **M1 · Emisión de señales de página.** Emitir vista, profundidad de lectura y clics de CTA desde la envolvente pública, respetando consentimiento y sin datos personales nuevos.
- **M2 · Panel Rendimiento de páginas** en Inteligencia del Visitante, con comparativa de periodos.
- **M3 · Tarjeta de estadísticas de landing** en el perfil de empresa de Administración y en la sección Landing SEO.
- **M4 · Atribución al embudo** (Mi Viaje, propuestas, reservas ERL/AVL) con nivel de confianza declarado.
- **M5 · Vista para el empresario** en el Portal: sólo sus páginas y sus resultados.

Una etapa por entrega, con validación visual del Founder antes de la siguiente.

## Detalle técnico

- Reutiliza `visitor_intel.events` y los agregados CV8.3 existentes; no se crean tablas de métricas paralelas ni proveedores externos.
- La emisión va por función de servidor de ingesta, con limitación de frecuencia ya implementada; el cliente nunca escribe directo.
- La landing se identifica por su ruta canónica `/l/<slug>`; no se añade ningún identificador nuevo al visitante.
- Sin fingerprinting, sin PII adicional, con cubos de retención existentes.

## Preservation Gate

Se preservan sin cambios: plantillas Premium, perfiles de empresa, landings y su diseño, marca, iconos bordados, Alux, Mi Viaje, Reservaciones, Concierge, folios ERL/AVL y el resto de Administración. El delta es sólo emisión de señales y lecturas nuevas.
