# G8-Q2C-A · Evidence Manifest · Safe Territorial Reclassification

**Instrumento:** `docs/governance/product-authorizations/PCA-2026-045.json`
**Blueprint:** `docs/blueprint/19.41-G8-Q2C-A-SAFE-TERRITORIAL-RECLASSIFICATION-v1.0.md`
**Fecha:** 2026-08-28
**Actor:** Founder `065f93e4-4a39-4193-96b7-3f3a4012b841`
**Flag:** `omxds_visual_v1_contracts_enabled=false`

## 1. Estado previo (snapshot registrado en `content_audit_log`)

| Destino histórico | ID                                     | Estado      | Medios | Zonas | POI | SEO | Empresas | Eventos |
| ----------------- | -------------------------------------- | ----------- | ------ | ----- | --- | --- | -------- | ------- |
| Chichén Itzá      | `ec9eb324-1952-4849-a1d4-00506d7cabb5` | `draft`     | 0      | 0     | 0   | 0   | 0        | 0       |
| Ek Balam          | `11111111-aaaa-4aaa-8aaa-000000000002` | `published` | 0      | 0     | 0   | 0   | 0        | 0       |

Acción de auditoría: `q2c_a.snapshot.before` (2 filas).

## 2. Destinos territoriales creados (FASE 2)

| Nombre  | Slug      | ID                                     | Estado  | Región       |
| ------- | --------- | -------------------------------------- | ------- | ------------ |
| Tinum   | `tinum`   | `bdeb0bdd-178b-4b04-b36f-6982e7d1ae17` | `draft` | Oriente Maya |
| Temozón | `temozon` | `a7111b9a-a1de-49c0-b251-9818645a9a43` | `draft` | Oriente Maya |

Sin descripción, medios, coordenadas, SEO, categorías ni zonas. Auditoría:
`q2c_a.destination.create` (2 filas).

## 3. Lugares y atractivos creados (FASE 3)

| Nombre       | Slug           | ID                                     | Tipo                | Destino | `source_destination_id`                | Estado  |
| ------------ | -------------- | -------------------------------------- | ------------------- | ------- | -------------------------------------- | ------- |
| Chichén Itzá | `chichen-itza` | `3842b6cb-80e9-4d50-abde-57560a563e21` | `zona-arqueologica` | Tinum   | `ec9eb324-1952-4849-a1d4-00506d7cabb5` | `draft` |
| Ek' Balam    | `ek-balam`     | `6c22aa5f-62f9-4faa-ba39-c66e884d7904` | `zona-arqueologica` | Temozón | `11111111-aaaa-4aaa-8aaa-000000000002` | `draft` |

Campos copiados (acreditados): `name`, `description`, `latitude`, `longitude`
(`20.6843 / -88.5678` y `20.8917 / -88.1367`).
Campos pendientes: `short_description`, `highlights`, duración, mejor temporada,
tarifas, accesibilidad, amenidades, contacto, dirección, medios, SEO,
categorías, autoridades y horarios.

Trazabilidad campo a campo en `points_of_interest.metadata->'q2c_a'`
(`source_destination_id`, `source_destination_slug`, `copied_fields`,
`pending_fields`, `governance`). Cero relaciones de medios creadas; ningún
activo, checksum, crédito, licencia, ALT ni estado de revisión fue tocado.

## 4. Preservación histórica

- Chichén Itzá histórico: `draft` antes y después (sin mutación).
- Ek Balam histórico: `published` antes y después; `/oriente-maya/ek-balam`
  sirve exactamente la misma URL y contenido.
- Comparación JSON `before == after`: `true` para ambos registros
  (`q2c_a.snapshot.after`).
- Redirects nuevos: 0 · cero redirects · cero publicación.
- Composiciones, revisiones, sitemap, menús, Alux, travel plans y medios: sin
  cambios (0 dependencias vinculadas a los IDs históricos).

## 5. Idempotencia

Segunda ejecución de las altas: 0 filas insertadas. Totales verificados tras la
repetición: destinos `tinum`/`temozon` = 2, lugares `chichen-itza`/`ek-balam` =
2, `points_of_interest` total = 7 (5 históricos intactos), `destinations` total
= 10, `destination_media` total = 3 (sin cambio). La idempotencia se garantiza
por slug único más `NOT EXISTS`.

## 6. Auditoría

| Acción                     | Filas |
| -------------------------- | ----- |
| `q2c_a.snapshot.before`    | 2     |
| `q2c_a.destination.create` | 2     |
| `q2c_a.place.create`       | 2     |
| `q2c_a.snapshot.after`     | 2     |

## 7. Rollback

Eliminar exclusivamente las cuatro altas nuevas:

```sql
DELETE FROM public.points_of_interest WHERE metadata ? 'q2c_a';
DELETE FROM public.destinations WHERE metadata->>'q2c_a_governance' = 'PCA-2026-045';
DELETE FROM public.content_audit_log WHERE action LIKE 'q2c_a%';
```

No existe mutación sobre registros históricos que requiera restauración; el
rollback fue verificado lógicamente contra el snapshot previo.
