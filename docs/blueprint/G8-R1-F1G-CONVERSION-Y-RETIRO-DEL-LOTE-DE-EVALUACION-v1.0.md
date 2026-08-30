# G8-R1-F1G · Conversión del corpus demo en contenido real removible — v1.0

Estado: Ejecutado · Flag `omxds_visual_v1_contracts_enabled` = **OFF**
Autoridad: Autorización Founder G8-R1-F1G (2026-08-30), sección 7 de
`docs/governance/audit/2026-08-30-G8-R1-F1G-EVALUATION-CONTENT-MATRIX-v1.0.md`
Manifiestos: `PCA-2026-029-ADDENDUM-AD`, `PCA-2026-029-ADDENDUM-AD2`

## 1. Decisión aplicada

No se creó Showroom ni renderer paralelo. Las 53 fichas demo se marcaron como un único
lote interno auditable, `G8-R1-F1G-EVALUATION-CONTENT`, y se resolvieron una por una
según la matriz A/B/C/D/E aprobada.

## 2. Resultado por familia (estado en base de datos)

| Familia  | Real acreditado (publicado) | Demo publicado (Clase B pendiente) | Retirado a borrador | Archivado | Total |
| -------- | --------------------------- | ---------------------------------- | ------------------- | --------- | ----- |
| Destinos | 6                           | 0                                  | 0                   | 0         | 6     |
| Lugares  | 5                           | 0                                  | 0                   | 0         | 5     |
| Empresas | 7                           | 8                                  | 8                   | 0         | 23    |
| Productos| 4                           | 1                                  | 4                   | 0         | 9     |
| Eventos  | 0                           | 0                                  | 0                   | 10        | 10    |
| **Total**| **22**                      | **9**                              | **12**              | **10**    | 53    |

Notas de acreditación:

- Las 7 empresas convertidas tienen `record_origin = 'public_source'` con URL oficial y
  `source_review_state = 'approved'`. Taberna de los Frailes quedó fuera de la conversión
  (no verificable documentalmente; posible cierre) y permanece en el lote.
- Los 4 productos convertidos (Zazil Tunich) se publicaron sin precio ni disponibilidad
  acreditados y en modo `informacion`. Cero datos inventados.
- Cenote Ik Kil se reasignó territorialmente de Valladolid a Tinum / Pisté.
- Los retiros son reversibles: `status = 'draft'`, sin borrado físico, con snapshot previo.
- Se protegió del retiro toda ficha con actividad comercial, dueño activo o reclamación.

## 3. Aislamiento del lote

Mientras una entidad conserve `demo_seed_batch = 'G8-R1-F1G-EVALUATION-CONTENT'`:

1. Queda excluida del `sitemap.xml`.
2. Queda excluida del catálogo canónico de Alux (no se recomienda ni se cita).
3. Sus rutas públicas emiten `noindex, nofollow`.

El aislamiento aplica también a las fichas ya convertidas a real, porque la autorización
Founder detiene el proceso antes de indexar.

## 4. Herramienta de administración

`/cms/contenido-evaluacion` (interna, autenticada, `noindex`) permite al equipo revisar el
inventario del lote, retirar y restaurar fichas de forma reversible, y ver el motivo cuando
una ficha está protegida contra retiro.

## 5. Invariantes verificados

- Flag visual global permanece en OFF.
- Cero publicación de sustituciones Clase B.
- Cero borrado físico.
- Cero datos inventados.
- `bun run typecheck` y `bun run governance:check` en PASS.

## 6. Siguiente paso (requiere autorización Founder)

Publicación de las sustituciones Clase B y, por separado, retirar del lote las fichas ya
acreditadas para permitir su indexación.
