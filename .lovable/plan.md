# Propuesta: Ventas en línea por empresa (tienda, Alux y reservas de hotel)

## Qué cambia en la regla
Hoy solo las experiencias, y las artesanías que autoriza el administrador, se venden en línea. Todo lo demás muestra un precio de referencia y lo cotiza el concierge.

Con esta propuesta, **el administrador activa la venta en línea empresa por empresa**. Si no la activa, todo sigue igual que hoy: el precio se queda como «solo mostrar» y lo cotiza el concierge. La regla guardada se actualizará solo cuando apruebes esta propuesta.

## Cómo empezamos: piloto pequeño
- **Solo funciona donde tú lo actives.** Las demás empresas no ven ningún cambio: ni botones nuevos ni precios distintos.
- **Se prueba con una o dos empresas**, por ejemplo Copalli y una tienda de artesanías. Ajustamos los detalles con lo que veamos y después se abre a más empresas.
- **Se apaga en cualquier momento.** Al desactivar la venta, la empresa vuelve a cotizar con el concierge y lo ya vendido se conserva.
- **Sin conexión con Booking ni Airbnb.** Queda fuera de esta propuesta.

## 1. El interruptor del administrador (por empresa)
En la ficha de cada empresa, dentro del CMS, habrá una sección **«Ventas en línea»** que solo ve el administrador:

- **Activar / desactivar** la venta para esa empresa.
- **Qué vende**, según su giro:
  - **Tienda**: artesanías, ropa, café en grano, recuerdos. Productos con existencias.
  - **Pedidos para recoger**: cafeterías y restaurantes como Copalli. Se paga en línea y se recoge en el local.
  - **Reservas por fecha**: hoteles y casas de vacaciones.
  - **Experiencias**: ya existe; no cambia.
- **Por dónde se vende** (cada canal se activa por separado):
  - Botón «Comprar» o «Reservar» en su página.
  - El botón de Alux en su página.
  - El WhatsApp de Alux de esa empresa.
- **Comisión** de Valladolid.mx para esa empresa.
- **Cómo se entrega**: recoger en el local (primera fase); envío a domicilio más adelante.

La empresa ve en su Portal si tiene la venta activada, pero no puede activarla ella sola. Ya funciona así para las experiencias.

## 2. Cómo meten sus productos (tienda de artesanías, Copalli)
Se reutiliza lo que ya funciona con el menú de Copalli. Hay tres formas, y siempre con una persona revisando antes de guardar:

1. **Fotos de los productos**: la empresa o el editor sube varias fotos. Alux propone un producto por foto (nombre, descripción corta, categoría) y la persona escribe o corrige el precio y la cantidad disponible.
2. **Hoja en PDF o foto de su lista de precios**, como el menú de Copalli: Alux lee la lista y propone los productos con sus precios. Después se les agrega la foto.
3. **Hoja de cálculo**: una plantilla sencilla (nombre, precio, cantidad, tamaño o color) para quien ya tiene su inventario en Excel.

Cada producto tiene foto, precio, existencias y, si aplica, variantes (talla, color, tamaño). Cuando se agota, deja de venderse solo. En Copalli, la carta sigue como referencia y solo se venden los productos que el administrador marque.

## 3. Cómo vende Alux
Las tres puertas (botón de la página, Alux en la página y WhatsApp de Alux) arman **el mismo pedido y el mismo enlace de pago**:

- Alux solo ofrece a la venta lo que tiene la venta activada, con su precio real; nunca inventa precios.
- Si el producto no está activado, da el precio como referencia y pasa al concierge, igual que hoy.
- En el WhatsApp de la empresa, Alux manda el enlace de pago de ese producto. Hoy eso ya funciona para las experiencias y se amplía a la tienda.
- El pedido pagado llega al Portal de la empresa (con aviso por correo y WhatsApp) y a la sección de ventas del administrador.
- El estado de cuenta que ya existe calcula lo vendido, la comisión y lo que se le paga a la empresa.

## 4. Hoteles y casas: reservas por fecha
Un hotel no vende piezas: vende **noches disponibles**. Por eso lleva su propio flujo:

- **Tipos de habitación**: «Doble estándar», «Suite con alberca», con fotos, cuántas personas caben y cuántas habitaciones de ese tipo hay.
- **Precio por noche**, con temporada alta o baja y fin de semana distinto si el hotel lo quiere.
- **Calendario**: el hotel cierra fechas y marca mínimo de noches.
- **El huésped elige** llegada, salida y personas, y ve solo lo disponible con el total.

Sin conexión con Booking ni Airbnb, solo usamos **reserva con confirmación**. Así no vendemos una noche que el hotel ya vendió por otro lado:

- El huésped solicita sus fechas.
- El hotel revisa si tiene lugar y confirma en un plazo (por ejemplo, 12 horas) desde su Portal o por WhatsApp.
- Al confirmar, se manda el enlace de pago. Si no confirma a tiempo, la solicitud pasa al concierge.

La reserva inmediata, la que se paga al momento, se deja para el futuro y solo si algún día hace falta.

Mientras el hotel no tenga la venta activada, sigue como hoy: el concierge cotiza.

## Fases (cada una se aprueba por separado y nada se publica sin tu autorización)
1. **Interruptor por empresa + regla nueva**: sección «Ventas en línea» del administrador, canales y comisión. Lo ya vendido no cambia.
2. **Piloto de tienda + recoger en el local**: carga por fotos, PDF u hoja; existencias; pago; pedidos en el Portal. Solo en las empresas piloto.
3. **Alux vende en el piloto**: botón de Alux en la página y WhatsApp de la empresa con enlace de pago para productos activados.
4. **Hoteles · reserva con confirmación**: tipos de habitación, precio por noche, calendario y solicitud. Primero con un solo hotel piloto.

Después de cada fase revisamos juntos el piloto y afinamos antes de pasar a la siguiente o de abrirlo a más empresas. Los envíos a domicilio quedan para después del piloto.

## Decisiones que necesito de ti
- **Empresas piloto**: ¿con cuáles probamos primero? Por ejemplo Copalli y una tienda de artesanías.
- **Comisión**: ¿una comisión general con ajuste por empresa, o una distinta por cada tipo (tienda, pedidos, hotel)?

## Detalles técnicos
- Reutiliza lo que ya existe:
  - `products.direct_sale_*` y `product_direct_sale_requests`: autorización y comisión.
  - `commerce_departures` y `commerce_reservation_holds`: retención de cupo mientras se paga.
  - `concierge_orders` y `concierge_order_items`: pedidos y comisión por partida.
  - Estados de cuenta existentes.
  - El proveedor de pagos actual (Stripe vía `src/lib/payments`).
  - El lector de menú (`src/lib/menu`) para la carga por foto o PDF.
- Lo nuevo:
  - Un ajuste de venta por empresa (modo, canales, comisión, entrega).
  - Existencias y variantes en los productos de tienda.
  - Tipos de habitación, tarifas por noche y bloqueos por fecha, con retención de noches igual que el cupo de experiencias.
- El interruptor por empresa nace apagado en todas; los canales y modos solo se habilitan en las empresas marcadas.
- `canSellDirect` (CRM y WhatsApp) y la vista del administrador se alinean para usar una sola regla: venta activada en la empresa y en el producto.
- Hoy la base de datos no limita qué tipos de producto se pueden activar. La fase 1 lo limita a los modos activados en la empresa.
- Se respetan la plantilla aprobada de la ficha, el bloque oficial del menú, Mi Viaje y la separación de perfiles de staff, empresa y concierge.
