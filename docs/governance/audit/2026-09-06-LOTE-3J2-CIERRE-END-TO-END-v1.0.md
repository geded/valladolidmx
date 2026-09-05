# Lote 3J.2 · Cierre end-to-end (Planear con Alux + Mi Viaje)

Rama: `integration/lovable-valladolidmx`. Sin publicación, sin despliegue, sin PR.
Fecha: 2026-09-06. Todos los datos usados son registros demo ya existentes.

## 0. Corrección de trazabilidad del informe 3J.1

El informe 3J.1 declaró cobertura donde sólo hubo cableado y typecheck. En este
documento se distingue explícitamente:

- **PASS** = comportamiento observado en navegador o en base de datos.
- **FAIL** = comportamiento observado y defectuoso.
- **NO VERIFICADO** = la prueba no pudo ejecutarse; se documenta el bloqueo exacto.

Se retira la lectura de PASS de 3J.1 para: prueba autenticada, cobertura de
familias, territorio y recomendación CMS-first.

## 1. Matriz requisito por requisito

| # | Requisito | Estado | Evidencia |
|---|---|---|---|
| 1 | Prueba autenticada real (login, importación de borrador, persistencia, recarga, borrado, limpieza) | **NO VERIFICADO** | El entorno de pruebas reporta `LOVABLE_BROWSER_AUTH_STATUS = signed_out` y no hay sesión inyectada; la emisión de sesión de prueba exige elegir uno de varios usuarios de autenticación reales y no existe autorización para usarlos. No se simuló ni se declaró PASS. |
| 2 | CTA y contexto Alux en Zazil Tunich, Chichén Itzá y Cenote Suytun | **PASS** | Panel `section[aria-label="Alux…"]` con CTA; el dock abre y muestra `TU SELECCIÓN`, título y destino. |
| 2b | CTA Alux desde ficha de Lugar | **PASS** | Ex Convento de San Bernardino: dock con entidad, destino `Valladolid` y familia `lugares`. |
| 2c | CTA Alux desde fichas de empresa (hotel / restaurante / experiencia) | **CORREGIDO → PASS** | Antes: 0 CTA y 0 acciones de viaje (FAIL observado). Ahora hotel, restaurante y experiencia muestran el panel y el dock recibe entidad, destino y familia. |
| 3 | Cobertura de familias | **PASS parcial** | hotel, restaurante, experiencia, lugar, evento y ruta: agregar a Mi Viaje, estado "Ya está en Mi Viaje", persistencia tras recarga y dock con contexto. **Producto: NO VERIFICADO** — los únicos productos publicados pertenecen a un negocio sin vínculo de categoría, por lo que no existe URL canónica resoluble de producto en los datos demo. |
| 4 | Territorio | **PASS parcial** | Home regional 200 con listado de destinos; Valladolid, Izamal y Espita 200 con selector de destino presente. Las menciones a otros destinos dentro de Valladolid provienen del selector territorial y de bloques rotulados de cercanía, no de resultados mezclados. No se verificó un destino publicado que no sea Pueblo Mágico con contenido suficiente. |
| 5 | Recomendación CMS-first | **PASS parcial** | Fuente única `src/lib/alux/contextual-suggest.functions.ts`, con catálogo canónico servidor (`canonical-catalog.server.ts`) y campos de racionalidad (`rationaleSource`, `reason`, `aiStatus`). Verificado en ficha de Lugar y en fichas de empresa: sugerencias de entidades publicadas con explicación. **No verificado** el uso efectivo de intereses, compañía, fechas, duración y accesibilidad porque requieren sesión autenticada (bloqueo del punto 1). |
| 6 | Esquema y seguridad (`place`) | **PASS documental** | Políticas de `travel_plans` y `travel_plan_items` exigen `auth.uid() = user_id` y pertenencia del plan (`EXISTS(...)`), más roles admin y lector de conserjería. No se ejecutó una prueba de acceso cruzado en vivo (depende del punto 1). Enum `travel_item_kind` incluye `place`. **Riesgo declarado:** añadir un valor a un enum de PostgreSQL no tiene rollback destructivo simple; revertirlo exige recrear el tipo y migrar columnas. |
| 7 | Cierre técnico | **PASS** | `tsgo --noEmit` limpio; ESLint limpio en archivos tocados; `bun test` 777/777 (5297 aserciones); `bun run build` correcto; Route Inventory 247 rutas; QA 1440/834/430/390 en las tres fichas tocadas: desbordamiento 0, un solo `h1`, 0 imágenes rotas. |

## 2. Cambios de este lote

- `src/components/surfaces/BusinessSurface.tsx`
  - Las acciones de cabecera (Compartir / Guardar) se perdían cuando la ficha no
    tiene galería, porque esa variante de hero descarta `headerActionsSlot`.
    Ahora se renderizan en una fila propia bajo el hero, junto con
    `AddToTravelPlanButton` (`kind="business"`).
  - Se incorpora `TourismAluxPanel` con `selection` (`business:<id>`, título,
    destino, familia), mismo patrón ya aprobado en la ficha de Lugar.
- `src/components/surfaces/business-blocks.tsx`
  - `BusinessHeaderBadgesBlock` incorpora el mismo `TourismAluxPanel` para las
    fichas que se renderizan por bloques (caso experiencia).

Sin cambios de diseño Premium, sin datos nuevos, sin flags, sin claves.

## 3. Pendientes y riesgos

1. Prueba autenticada end-to-end: bloqueada por falta de sesión de prueba
   autorizada. Requiere una cuenta demo explícitamente autorizada por el Founder.
2. Familia producto: no hay producto demo con ruta canónica resoluble.
3. Recomendación personalizada (intereses, compañía, fechas, duración,
   accesibilidad): contrato listo, verificación pendiente de sesión.
4. Enum `place`: sin rollback destructivo simple.
5. Riesgo menor observado: una sugerencia puede repetir la entidad en la que ya
   está el visitante; conviene excluirla en la consulta de sugerencias.
