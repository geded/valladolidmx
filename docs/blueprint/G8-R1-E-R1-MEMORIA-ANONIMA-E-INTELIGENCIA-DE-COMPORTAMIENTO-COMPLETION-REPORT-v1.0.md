# G8-R1-E-R1 · Memoria anónima e inteligencia de comportamiento de Alux

**Completion Report v1.0 · Carril A (Producto)**
Incluye el Addendum G8-R1-E-R2 (cierre de defectos de personalización y proximidad).
Estado: implementación entregada · `omxds_visual_v1_contracts_enabled=false` · cero publicación · cero migraciones.

---

## 1. Mapa de almacenamiento

| Dato | Autoridad | Ubicación | TTL |
| --- | --- | --- | --- |
| Viaje, favoritos, composición del grupo (anónimo) | `AnonymousTravelDraft` v1.0.0 (existente) | IndexedDB + fallback localStorage | 30 días |
| Id seudónimo del navegador, estado de personalización, señales | `AluxMemoryRecord` v1.0.0 (**nuevo**, `src/lib/alux/memory-store.ts`) | localStorage `vmx.alux.memory.v1` | 30 días (`ALUX_SIGNAL_TTL_MS`) |
| Eventos seudónimos | `visitor_intel.events` (existente, append-only) | Lovable Cloud, escritura server-side | Bucket de retención existente |
| Perfil registrado, Travel Plan | `traveler_profiles`, `travel_plans` (existentes) | Lovable Cloud | Contrato vigente |

No se creó otra identidad anónima, otro perfil, otro historial ni otro motor de personalización. Cero fingerprinting, cero identificación por IP.

## 2. Contrato de eventos

`src/lib/alux/signal-events.ts` traduce **de forma pura** una señal ya validada por la lista cerrada de `behavior-signals.ts` al contrato congelado `VisitorEventSchema` v1.0.0:

- `entity_viewed`, `territory_viewed`, `category_explored`, `saved`, `plan_added`, `plan_removed` → `intent.signal`.
- `suggestion_accepted`, `suggestion_rejected` → `decision.offered`.

Campos permitidos: id seudónimo, evento, entidad canónica y tipo, destino, ruta/superficie, timestamp, etapa del viaje, origen de la recomendación y versión del algoritmo. Prohibido y verificado por gate: PII, tokens, roles, texto del chat, teclas, movimientos, ubicación precisa.

## 3. Emisión y persistencia

`src/lib/alux/signal-emitter.ts` es el **punto único** de emisión:

1. valida la señal (lista cerrada);
2. la registra en la memoria local;
3. publica el evento por la autoridad de escritura existente (`ingestVisitorEvent` / `ingestAnonymousVisitorEvent`), siempre server-side, idempotente por `event_id`.

Guardas: dedupe de 60 s por `(kind|key)`, rate limit de 30 eventos/min, no-op con personalización pausada, fallo de red silencioso.

## 4. Defectos cerrados (Addendum R2)

- **DEF-R1E-001 / 004 · Señales conectadas.** El dock emite señales reales de territorio, categoría y ficha canónica, y de aceptación de recomendación al abrir una sugerencia. `rankAluxCandidates` recibe ahora `signals: behaviorSummary`; ya no cae siempre en `EMPTY_SIGNAL_SUMMARY`.
- **DEF-R1E-002 · Proximidad.** `src/lib/alux/proximity.ts` (capa pura) + coordenadas acreditadas en el catálogo canónico (`points_of_interest.latitude/longitude` para Lugar; ubicación canónica publicada de la empresa operadora para Producto/Experiencia/Tour, declarando origen `product_operator`). Sin consentimiento, sin origen válido o sin coordenadas acreditadas **no existe distancia**, y esos candidatos quedan fuera del orden "Cerca de mí".
- **DEF-R1E-005 · Personalización y memoria.** Superficie única `/personalizacion` (`noindex`) con pausar, reactivar y borrar. Sin modal repetitivo.
- **DEF-R1E-006 · Composición del viaje.** El dock propaga `profilePartySize` (plan declarado) y `anonymousTravelerCount` (continuidad anónima) a `buildAluxUnifiedContext`, respetando el orden de autoridad y sin inferir pareja o familia sólo por número de personas.
- **DEF-R1E-003 · Consumo por plantillas.** Se mantiene un único consumidor global (el dock). No se montó un segundo motor en ninguna familia.

## 5. Flujo anónimo → registrado

Sin cambios de autoridad: `AnonymousDraftImportRunner` sigue importando el viaje con `importAnonymousDraft` de forma idempotente y borrando el borrador tras confirmar. Las preferencias registradas prevalecen siempre sobre las señales inferidas (jerarquía de `ALUX_WEIGHTS` intacta).

## 6. Controles de privacidad

- Pausar personalización: se dejan de registrar y de usar señales; Mi Viaje y favoritos se conservan; Alux sigue recomendando de forma general.
- Borrar memoria: se elimina el registro local completo, incluido el id seudónimo. No se copia el contenido eliminado.
- Ubicación: sólo mediante el permiso del navegador y nunca persistida en señales ni eventos.
- Lectura de eventos individuales: imposible desde el cliente y desde roles de empresa (esquema `visitor_intel` sin acceso por Data API; comprobado: `permission denied for schema visitor_intel`).

## 7. Migraciones

**Cero migraciones.** Toda la persistencia reutiliza `visitor_intel.events` y el almacenamiento local ya acreditado. Rollback: eliminar los módulos nuevos y revertir las tres conexiones del dock; no hay estado remoto propio que deshacer.

## 8. Gates

| Gate | Resultado |
| --- | --- |
| `bun run test:r1:e:r1` (23 escenarios nuevos) | PASS |
| `bun run test:r1:e` (33 escenarios) | PASS |
| Typecheck (`tsgo --noEmit`) | PASS |
| Lint sobre archivos nuevos/modificados | PASS (deuda previa de `contextual-suggest.functions.ts` y `feedback.functions.ts` sin tocar) |
| `route-inventory-coverage` | PASS · 211 rutas |

## 9. Archivos

Nuevos: `src/lib/alux/memory-store.ts`, `signal-events.ts`, `signal-emitter.ts`, `proximity.ts`, `use-alux-memory.ts`; `src/components/alux/AluxMemoryPanel.tsx`; `src/routes/personalizacion.tsx`; `scripts/omxds/r1-e-r1/alux-memory-proximity.contract.test.ts`; este reporte.

Modificados: `src/components/layout/AluxFloatingTrigger.tsx`, `src/lib/alux/canonical-catalog.server.ts` (v1.2.0), `src/lib/experience-builder/route-inventory.ts`, `package.json`.

## 10. Subveredictos

- **Perfil explícito:** PASS — composición del viaje propagada con orden de autoridad declarado.
- **Aprendizaje por comportamiento:** PASS a nivel de persistencia local + evento seudónimo server-side; la personalización sobrevive navegación, recarga y nueva sesión en el mismo navegador, y caduca a 30 días.
- **Recomendaciones por proximidad:** PASS para Lugar y Producto/Experiencia/Tour (herencia declarada del operador). Evento y Destino quedan sin coordenada acreditada en el modelo actual y, por contrato, no reciben etiqueta de distancia.

## 11. STOP CONDITION

Flag en `false`, cero publicación, cero cambios de contenido turístico, redirects o sitemap. R1-F no iniciado.
