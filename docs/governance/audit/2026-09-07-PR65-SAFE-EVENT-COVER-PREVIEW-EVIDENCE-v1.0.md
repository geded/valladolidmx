# PR #65 · Evidencia de preview seguro de portadas temporales

**Fecha:** 2026-09-07  
**Estado:** Approved  
**Autoridad:** Founder  
**Blueprint:** `docs/blueprint/19.34-G8-M1-SAFE-MEDIA-REPLACEMENT-MVP-v1.0.md`

## Alcance verificado

El PR #65 añade exclusivamente una vista autenticada y `noindex` para revisar una portada IA conceptual temporal de un evento publicado. La portada se superpone sólo en memoria y no se persiste como asociación del evento.

## Evidencia de implementación

- `src/lib/experience-builder/studio-media.functions.ts`: exige autenticación y rol editorial; acepta únicamente activos `draft`, no aprobados, `ai_generated`, temporales, `preview_only` y no aptos para producción.
- `src/routes/_authenticated/cms/eventos.$eventId.portada-preview.tsx`: ruta bajo `/cms`, protegida por el layout autenticado y marcada `noindex,nofollow,noarchive`.
- `scripts/omxds/g8/safe-event-cover-preview.contract.test.ts`: acredita autenticación, restricciones del activo, aislamiento de la ruta pública y ausencia de persistencia.
- `src/components/surfaces/EventPremiumSurface.tsx`: ofrece modo de preview de sólo lectura; oculta “Agregar a Mi Viaje” para impedir que la portada temporal alcance datos persistentes.
- `src/routes/api/cms/studio-media-preview.$mediaId.ts`: entrega bytes únicamente con JWT válido y rol editorial, revalida el estado `preview_only` y responde sin caché ni URL firmada expuesta.

## Invariantes preservadas

- `events.cover_media_id` no cambia.
- Ninguna imagen se asocia ni se publica.
- La portada temporal no puede persistirse indirectamente en el snapshot de “Mi Viaje”.
- Un usuario anónimo no puede descargar el activo temporal desde el endpoint del preview.
- Los activos permanecen `draft`, conceptuales, temporales y exclusivos de preview.
- La ruta pública de eventos, el Home público y los demás datos del CMS permanecen intactos.
- No hay migraciones, cambios de esquema, pagos, reservaciones, mapas, cron, secretos ni RLS.

## Controles requeridos

- Prueba específica del contrato.
- Typecheck, build y lint baseline.
- Route Inventory.
- Proyecciones 06/07/08 sincronizadas.
- Governance Integrity y Product Authorization.

La fusión mediante squash y el despliegue exclusivo del preview autenticado del CMS quedan condicionados a que todos los controles terminen en PASS.
