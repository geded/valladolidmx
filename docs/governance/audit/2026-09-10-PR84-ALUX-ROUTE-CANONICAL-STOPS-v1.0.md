# PR #84 · Paradas canónicas de rutas en Alux

Estado: **PASS** · 2026-09-10

La acción **Personalizar con Alux** del Home conserva la ruta publicada como
autoridad CMS. Las referencias de editorial_route_stops se cargan por ID con
los mismos filtros públicos fail-closed del catálogo canónico: publicación,
ausencia de borrado, empresa contenedora acreditada, vigencia de eventos y URL
producida por el binding oficial.

Las entidades repetidas se deduplican antes de reservar espacio y el prompt
mantiene el límite global de 24 candidatos. Los previews compartidos usan IDs y
URLs de rutas CMS canónicas; no introducen una vía fixture hacia el servidor.

Invariantes: sin rediseño, sin tablas paralelas, sin publicación y sin
despliegue.
