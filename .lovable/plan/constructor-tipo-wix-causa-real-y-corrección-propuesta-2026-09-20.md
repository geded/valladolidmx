# Constructor tipo Wix · Causa real y corrección propuesta

Sí tengo claro cómo funciona Wix: el lienzo muestra la página real, el contenido se
puede desplazar y previsualizar, los clics no navegan sino que seleccionan, y la
cantidad de elementos de cada sección se controla desde el panel, no desde el código.
Hoy fallan tres cosas concretas, y ninguna es "escala".

## Causa 1 · En móvil la plantilla parece una imagen fija

En el lienzo, todo el contenido de la plantilla se envuelve con
`pointer-events-none select-none` para que los clics seleccionen la sección en vez de
navegar. Ese bloqueo también cancela el gesto de desplazamiento lateral de los
carruseles (destinos, experiencias, hoteles, eventos son `overflow-x-auto`).
Por eso se ve que hay más tarjetas a la derecha pero no se pueden recorrer.

Corrección: dejar el contenido interactivo y neutralizar sólo la navegación
(intercepción de clic/submit en fase de captura). Los carruseles vuelven a
desplazarse con el dedo y el clic sigue seleccionando la sección para editarla.
En Vista previa, el contenido queda 100% interactivo como en el sitio publicado.

## Causa 2 · En 1024, 1280 y 1440 quedan huecos en destinos, experiencias y hoteles

La plantilla aprobada usa rejillas de plazas fijas en escritorio:
destinos es `1 destacado + exactamente 3 secundarios` con alto fijo de 30rem;
experiencias y hoteles siguen el mismo patrón. Si la sección recibe menos elementos
que las plazas, quedan filas vacías y la sección se ve rota. Eventos no falla porque
es una lista apilada que tolera cualquier cantidad.

Esto ocurre igual en el sitio publicado si el contenido baja de 4; no es un problema
del lienzo. Corregirlo cambia el aspecto de una plantilla aprobada, así que lo dejo
como propuesta explícita:

- Las rejillas de escritorio se adaptan a la cantidad real (3, 4, 5, 6…), sin plazas
  vacías y sin alto fijo, conservando tipografía, colores, radios, sombras y el patrón
  destacado + secundarios.
- Sin autorización tuya no toco la plantilla pública.

## Causa 3 · "Mostrar más o menos opciones" no está conectado

El contrato ya expone `destinos_max_items`, `experiencias_max_items`, etc., y el panel
los muestra, pero el render de Home nunca lee ese valor. Por eso cambiarlo no hace nada.

Corrección: aplicar el máximo declarado al proyectar cada carril, con mínimo y máximo
razonables por sección, de modo que un editor pueda decidir cuántas tarjetas se ven en
destinos, experiencias, hoteles, eventos y rutas desde el panel.

## Qué se preserva

`HomePremiumSurface` como autoridad de render, CMS como autoridad de contenido,
marca y OMXDS, breadcrumb, header/footer, mapas, Alux, Mi Viaje, tracking, rutas
públicas, pagos y RLS. Sin superficies paralelas, sin fixtures, sin publicar.

## Orden propuesto

1. Causa 1 y Causa 3 (lienzo y conexión del máximo): sin cambio visual de la plantilla.
2. Causa 2 (rejillas adaptativas) sólo si lo autorizas, con comparación antes/después
   en 1440, 1280, 1024, 834, 430 y 390 y aceptación visual tuya.
