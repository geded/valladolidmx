# G8-R1-F1L · Runbook de promoción P0–P4

Estado: aprobado visualmente por el Founder (P1 Home, P2 Destinos, P3 Hotel/Restaurante, P4 Experiencia/Tour).
Evento: **excluido expresamente del piloto** por ausencia de contenido real acreditado. Prohibido crear datos demo.

Invariantes durante todo el runbook:
- `omxds_visual_v1_contracts_enabled` = **OFF** (no se toca).
- Piloto en `noindex, nofollow`; fuera de sitemap; cuarentena `owner_submitted` intacta.
- Sin indexación, sin publicidad, sin altas de contenido.

## Paso 1 · Despliegue del código P0–P4 (sin cambio de contenido)
- Publish del HEAD con P0 (familia ≠ medios), P1–P4 (superficies premium + `EditorialMediaFrame`).
- La Home pública sigue resolviendo la **revisión 30** (legacy): el despliegue de código no altera la composición publicada.
- Gates previos: typecheck, build, suite (731), lint, governance-integrity, route-inventory-coverage, security scan.

## Paso 2 · Smoke con Home rev.30
- `/` responde 200 y renderiza rev.30 sin regresión (0 bloques en error, 0 overflow móvil 360/390/768).
- Las 22 rutas del piloto sirven `noindex,nofollow` y familia Editorial con marcador neutral cuando no hay portada G8-M1.
- Evidencia responsive capturada. **Si falla → rollback de código, detener.**

## Paso 3 · Publicación de Home premium como nueva revisión
- Publicar el borrador consolidado `vmx.home.premium-g4` como **nueva revisión** (no reutilizar la 31 fallida; queda preservada como histórico).
- Registrar `previous_revision_id = 30` para rollback atómico de un solo comando.

## Paso 4 · Activación de plantillas canónicas
- Asignar los presets premium aprobados a las familias del piloto vía el resolutor canónico (destino, hotel, restaurante, experiencia, tour). Evento no se asigna.
- Sin tocar el flag global: la activación es por familia/preset, no por flag.

## Paso 5 · Smoke completo
- Home premium: 12 bloques con datos reales del CMS, 0 "No se pudieron cargar los datos".
- 7 destinos + 5 empresas (2 hotel, 3 restaurante) + 4 productos (experiencia/tour): familia correcta, modo Editorial o Cinematográfico según portada acreditada, 0 medios demo/IA (validado por `public-media-policy`).
- Alux y Mi Viaje: URLs canónicas, cuarentena excluida del catálogo.
- `noindex,nofollow` verificado en las 22 rutas; sitemap sin piloto.

## Paso 6 · Rollback probado
- Ensayo real: revertir Home a la revisión 30, verificar `/` en rev.30, y volver a publicar la revisión premium.
- Rollback de plantillas: `forceStandardSurface` por familia (degradación controlada a superficie estándar).
- Rollback de código: republicar el commit anterior al Paso 1.
- Documentar tiempos y comandos exactos en el registro de despliegue.

## Condición de parada
Cerrar en el Paso 6. No retirar `noindex`, no cambiar el flag, no indexar el piloto sin nueva autorización Founder.
