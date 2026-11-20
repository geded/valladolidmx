# Menú móvil: más corto, honesto y escalable

## De dónde sale el "23 destinos"

De ningún dato real. En el menú está escrito a mano un mínimo de 23: si hay menos destinos publicados, igual dice 23. Hoy hay **7 destinos publicados** (10 en total, 3 aún sin publicar). Es un número inventado y hay que quitarlo.

## Problemas detectados

1. El menú lista destinos y subcategorías completas, así que crece sin control conforme se publiquen más destinos.
2. Cada categoría repite la lista "Por destino", duplicando los mismos nombres seis o siete veces.
3. Textos redundantes: "Ver todos los hoteles" dentro de "Hoteles", "Todas las casas" dentro de "Casas de vacaciones".
4. En celular todo eso queda como un acordeón muy largo, lejos del estilo limpio de Airbnb.

## Propuesta

**Menú corto y plano, sin acordeones anidados en celular:**

- Arriba: buscador/atajo "¿A dónde vas?" que abre la exploración de destinos.
- Lista principal, un toque cada una, sin submenú: Oriente Maya · Hoteles · Restaurantes · Casas de vacaciones · Experiencias · ¿Qué hacer? · Eventos.
- Bloque "Destinos populares": máximo 6 destinos reales publicados + "Ver todos los destinos" (sin número inventado; si se quiere número, el real y calculado).
- Bloque secundario discreto: Promociones, Mapa, Blog, Contacto.
- Abajo fijo: "Arma tu Viaje" e "Iniciar sesión" (ya funciona así).

**Se elimina del menú:** las listas "Por destino" repetidas en cada categoría y los enlaces "Ver todos…" redundantes. El filtro por destino ya vive dentro de cada listado, que es donde se usa.

**Escalabilidad:** el menú nunca crece aunque se publiquen 50 destinos; la lista completa vive en la página de destinos, con búsqueda y filtros.

## Alcance técnico

- Único archivo tocado: `src/components/layout/PrimaryMegaMenu.tsx` (variante `mobile`).
- Se quita el `Math.max(destinos.length, 23)` y el conteo pasa a ser real.
- La variante escritorio se conserva intacta salvo el mismo ajuste del número inventado.
- Sin datos nuevos, sin backend, sin componentes paralelos.
- Validación en 1440 / 834 / 430 / 390.
