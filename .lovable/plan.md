# G8 · Cierre del circuito funcional de EVENTOS

Trabajo exclusivo sobre la rama conectada, sin ramas/PR/merge ni datos reales nuevos. Se reutilizan las autoridades visuales aprobadas (superficie territorial compartida, PublicShell, Alux contextual, Mi Viaje).

## 1. Migración aditiva e idempotente (solo PREVIEW)
- `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS filter_attributes jsonb NOT NULL DEFAULT '{}'`.
- Alta de la familia `eventos` en `tourism_attribute_definitions` + `tourism_attribute_options` (ON CONFLICT DO NOTHING): `event_type`, `audience`, `admission_type`, `time_of_day`, `venue_type`, `accessibility`, `reservation_required`, con etiquetas en español.
- Registros actuales intactos; atributos faltantes quedan `{}` y se omiten en UI.

## 2. Lectura pública (contrato tipado)
- `PublicEventCard` proyecta `filter_attributes` (normalizados), coordenadas del destino y fechas ISO; se mantienen `status=published`, `deleted_at IS NULL` y próximos.
- `eventToTourismCard` traslada atributos, fechas y coordenadas al VM oficial (campos opcionales aditivos `startsAtIso`/`endsAtIso`).
- El DTO (`getPublicListing`) sigue siendo la única vía; cero fixtures en rutas públicas.

## 3. Listado /eventos (regional y contextual)
- `ListingPremiumSurfaceFromDTO` enruta la familia `eventos` a la superficie territorial compartida aprobada.
- Filtros profesionales para eventos: Destino, Fecha/rango (Hoy, Este fin de semana, Próximos 7 días, Este mes), Tipo de evento y botón "Más filtros" (Ideal para, Entrada libre/pago, Horario, Sede o modalidad, Accesibilidad, Reservación — cada uno sólo si existen valores). Nunca se usan zonas de hoteles como fechas.
- "Limpiar filtros" sólo visible con filtros activos; tarjetas y mapa (pins reales por coordenadas de destino) sincronizados con los resultados.
- `/eventos?destino=valladolid`: destino aplicado automáticamente, contexto bloqueado visible, conteo sólo local y sección separada "Eventos cerca" de descubrimiento.
- Hoteles, restaurantes y casas conservan su comportamiento actual sin cambios visuales.

## 4. Perfil de evento
- `EventSurface` adopta el hero editorial Premium compartido aprobado (texto y datos a la izquierda; galería a la derecha), breadcrumb territorial, Alux contextual, Mi Viaje y footer comunes. Sin hero verde ni selector Editorial/Cinematográfica. Sólo medios reales (portada gobernada).

## 5. CMS Studio
- Nuevas rutas `/cms/eventos` (listado), `/cms/eventos/nuevo` y `/cms/eventos/$eventId/editar` con `EntityEditor` + workflow y auditoría existentes (RLS `events_editor_all`, sin service role).
- `writes.functions.ts`: `events` como tabla editable (columnas: título, slug, resumen, cuerpo, destino, empresa, inicio, fin, sede, gratuito, URL, portada). Tipos de campo aditivos `datetime` y `boolean` en `EntityEditor`.
- Panel de atributos estructurados (patrón `BusinessAttributesPanel`) con server fns validadas contra el catálogo.
- Entrada "Eventos" en la navegación del workspace CMS.

## 6. Previews
- `/lovable/g4-event-listing-premium-preview`: funcional con DTO real y conmutador Regional | Valladolid (noindex).
- `/lovable/g4-event-premium-preview`: funcional con el primer evento publicado real (fallback editorial sin datos).

## 7. Verificación y entrega
- Typecheck, build, suite de contratos (`listing-public-contract` incluida), verificación 200 de rutas, filtros que cambian resultados y enlaces de tarjeta al perfil (Playwright).
- Informe final: commit exacto, archivos modificados, pruebas y URLs completas.
