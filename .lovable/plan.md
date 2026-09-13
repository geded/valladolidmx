# Eventos que se repiten (recurrencia) + siembra del Video Mapping

## Qué falta hoy

Un evento en el CMS sólo tiene fecha de inicio y fecha de fin. No hay forma de decir "esto pasa todos los días", ni de indicar dos funciones en el mismo día, ni de marcar días suspendidos. Por eso hoy el Video Mapping tendría que darse de alta como un evento por día, lo cual es inviable.

Además, la agenda pública sólo muestra eventos cuya fecha de inicio es futura: un evento permanente que empezó hace meses desaparecería del listado.

## Propuesta (sin crear plantillas ni superficies nuevas)

### 1. Repetición configurable en la misma alta de evento

Se amplía el formulario de evento existente (no se crea otro editor) con un bloque "Repetición", al lado del bloque de atributos que ya existe:

- **Se repite:** No se repite · Todos los días · Cada semana · Cada mes · Cada año
- **Cada:** número de intervalo (cada 1 día, cada 2 semanas…)
- **Días de la semana** (sólo si es semanal): L M M J V S D
- **Desde / Hasta:** la fecha de fin puede quedar vacía = permanente
- **Horarios del día:** lista de horas con etiqueta opcional (ej. 20:30 "Español", 21:00 "English"). Un evento puede tener varias funciones el mismo día.
- **Días sin función:** lista de fechas concretas que se suspenden (con nota opcional: lluvia, mantenimiento, festivo).

Todo opcional: si no se marca nada, el evento sigue comportándose exactamente como hoy.

### 2. Cómo se ve en público (mismas plantillas)

- Tarjeta de agenda: en lugar de una fecha suelta, "Todos los días · 8:30 pm y 9:00 pm".
- Ficha del evento: la línea de fecha muestra la próxima función real (saltando los días suspendidos) y debajo los horarios con su idioma; si hay suspensiones próximas, se anuncian.
- El listado deja de ocultar eventos permanentes: se consideran vigentes mientras la repetición siga activa.

### 3. Siembra del Video Mapping "Valladolid en la Historia"

- Sede: iglesia de San Gervasio, Centro Histórico de Valladolid.
- Repetición: todos los días, sin fecha de fin.
- Horarios: 20:30 (español) y 21:00 (inglés).
- Entrada libre, descripción editorial propia.
- **Portada:** no tomo fotos de internet (derechos de autor y la política de medios del proyecto exige originales propios). Genero una imagen conceptual de portada de la iglesia iluminada con proyección nocturna y la subo a la Biblioteca de medios marcada como IA y temporal. Si prefieres una foto real, envíamela y la cargo tal cual.
- Datos marcados como siembra demo, para poder retirarlos cuando lo indiques.

## Detalles técnicos

- Se amplía la tabla `events` con campos opcionales de recurrencia (frecuencia, intervalo, días de semana, fecha límite, horarios con etiqueta, fechas excluidas, zona horaria `America/Merida`). No se crea tabla ni modelo paralelo: una sola fuente de verdad por evento.
- Nuevo módulo puro `src/lib/events/recurrence.ts` que calcula las próximas funciones a partir de esos campos, reutilizado por listados, ficha, Home, micrositio y Mi Viaje.
- `public-reads.functions.ts`: el filtro "próximos" pasa a considerar la vigencia de la repetición, no sólo `starts_at`.
- El editor usa el patrón ya existente `renderExtras` de `EventEditor` (igual que `EventAttributesPanel`), con su server function de lectura/escritura.
- Se preservan: plantilla Premium del evento, breadcrumb, filtros, Alux, Mi Viaje, SEO/JSON-LD (se añade la repetición al marcado de Schema.org).
- Validación en 1440 / 834 / 430 / 390 y typecheck antes de entregar.

## Fuera de alcance

Sin venta de boletos, sin cupos, sin pagos, sin rediseño de la agenda ni de la ficha.
