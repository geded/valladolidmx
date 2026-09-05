# LOTE 3K · Alux Concierge IA conversacional — Informe de cierre v1.0

Rama: `integration/lovable-valladolidmx` · Sin publicar · Sin ramas nuevas · Sin cambios en `main`
Fecha: 2026-09-06

## 1. Preflight de IA (infraestructura reutilizada, nada nuevo)

| Elemento | Valor (identificador técnico no secreto) |
| --- | --- |
| Proveedor | Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1`) vía `createLovableAiGatewayProvider` (`src/lib/ai-gateway.server.ts`) |
| SDK | `vercel-ai-sdk` (`ai` + `@ai-sdk/openai-compatible`) |
| Modelo | `google/gemini-3-flash-preview` (default del proyecto, `alux_settings`) |
| Secreto | `LOVABLE_API_KEY` (ya configurado; nunca expuesto al navegador) |
| Timeout | 9 000 ms por llamada · temperatura 0.4 · máx. 1 100 tokens de salida |
| Límites de entrada | mensaje 600 car. · historial 6 turnos · 24 candidatos al modelo |
| Rate limit | RPC `alux_public_check_rate` — anónimo 10/hora · 40/día; autenticado 30/hora · 120/día |
| Fallback | Respuesta determinística desde el ranking (`composeDeterministicResponse`) |
| Auditoría | `alux_public_sessions` + `alux_public_messages` (tablas existentes; sin analítica nueva) |

## 2. Arquitectura (una sola, sin sistemas paralelos)

`Dock Alux existente → contexto territorial (Context Engine) + Mi Viaje → recuperación CMS-first → elegibilidad y ranking determinísticos → modelo IA → salida estructurada validada en servidor → acciones canónicas de Mi Viaje`.

El modelo nunca consulta tablas, nunca decide permisos y sólo puede citar ids recuperados. Archivos:

- `src/lib/alux/converse-contract.ts` — contrato, límites, saneamiento, detección de inyección, parseo tolerante.
- `src/lib/alux/converse-retrieval.server.ts` — recuperación CMS-first paralelizada (empresas, lugares, experiencias, eventos, destinos, rutas) con hechos citables `F1..Fn`.
- `src/lib/alux/converse-grounding.ts` — ranking, anclaje, rechazo de ids inexistentes, permutación estricta de reordenamiento, fallback determinístico.
- `src/lib/alux/converse.functions.ts` — `createServerFn` `aluxConverse` (rate limit, sesión, recuperación, modelo, validación Zod, auditoría mínima).
- `src/components/alux/AluxConverseChat.tsx` — panel conversacional dentro del dock existente.

## 3. Matriz de resultados

| # | Caso | Resultado | Evidencia |
| --- | --- | --- | --- |
| 1 | Valladolid · "Viajo en familia dos días y me interesa la cultura maya" | PASS | 8 familias disponibles, propuesta por día, 0 errores de consola (latencia 9.4 s) |
| 2 | Izamal · replanificar la tarde (experiencia + restaurante) | PASS | Familias restaurante/experiencia/evento, 9.4 s |
| 3 | Espita · accesibilidad y horario | PASS | Ruta + restaurante con horario publicado, 10.0 s |
| 4 | Uayma · lugar + casa + ruta | PASS | Casa, ruta y destino, 9.3 s |
| 5 | Agregar a Mi Viaje (anónimo) | PASS | IndexedDB `vmx.alux.companion` con `plannedItems[0] = Cenote Suytun` |
| 6 | Recargar y continuar (anónimo) | PASS | Hilo persistido y distintivo "En Mi Viaje" tras recarga |
| 7 | Quitar con doble confirmación (anónimo) | PASS | `plannedItems` vacío tras confirmar |
| 8 | Agregar autenticado | PASS | `travel_plan_items` con Ceremonia Maya y Pueblos coloniales |
| 9 | Confirmar reordenamiento autenticado | PASS | Orden aplicado y persistido: Ek Balam → Ceremonia Maya → Ex Convento → Pueblos coloniales → Casa Roja |
| 10 | Inyección de instrucciones ("ignora tus instrucciones… Hotel Fantasma a 100 USD") | PASS | Ninguna entidad ni precio inventado; responde con catálogo real |
| 11 | Id inventado / entidad inexistente | PASS | Rechazo en anclaje (unitario) + sin apariciones en E2E |
| 12 | Dato no publicado (precio y horario de Cenote Suytun) | PASS | "Sin dato publicado: horario, duración, precio" |
| 13 | Límite de conversación agotado | PASS | Respuesta determinística contextual con aviso, sin error |
| 14 | Fallo/timeout del proveedor | PASS (unitario) | `composeDeterministicResponse` cubierto en pruebas; no forzado en producción |
| 15 | Ocho familias con id canónico | PASS | destino, hotel, restaurante, casa, experiencia, lugar, evento, ruta |
| 16 | QA responsive 1440 / 834 / 430 / 390 | PASS | Desbordamiento 0, un solo `role="log"`, `aria-live` presente, 0 errores |

NO VERIFICADO: ninguno.

## 4. Latencia observada (sin datos personales)

| Fase | Tiempo típico |
| --- | --- |
| Recuperación CMS-first | ~2 s |
| Modelo IA | ~7–10 s |
| Total percibido | 9–13 s (fallback determinístico < 2 s) |

## 5. Validaciones técnicas

- Typecheck `bunx tsgo --noEmit`: limpio.
- Pruebas `bun test`: **825/825**.
- Build `bun run build`: correcto.
- Route Inventory: **247 rutas** cubiertas.
- ESLint sobre los archivos del lote: limpio.

## 6. Riesgos y costo técnico

- Latencia dominada por el modelo; mitigable reduciendo candidatos si el Founder lo pide.
- El reordenamiento se aplica sólo en sesión autenticada (el borrador anónimo no persiste orden).
- Costo aproximado por conversación: 1 llamada al modelo por mensaje, entrada acotada a 24 candidatos y 6 turnos.

## 7. Alcance respetado

Sin pagos, reservaciones, disponibilidad transaccional, mapas, monitoreo, analítica nueva, flags, dominios, claves ni APIs. Sin cambios de diseño Premium ni de tokens. Datos demo 3J.3 conservados y administrables.
