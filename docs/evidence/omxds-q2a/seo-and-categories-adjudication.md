# G8-Q2A · Adjudicación de autoridad única (SEO y categorías)

## 1. SEO · `seo_metadata` gobierna Lugares de forma canónica

Verificación previa a cualquier creación de columna:

- `seo_metadata` es una tabla genérica por entidad: `(entity_kind, entity_id, locale)` con
  restricción única, e índice `idx_seo_entity`.
- El tipo `entity_kind` **ya incluye `point_of_interest`**, junto con `country`, `state`,
  `tourism_region`, `destination`, `destination_zone`, `business`, `product`, etc.
- Cubre `meta_title`, `meta_description`, `canonical_url`, `og_*`, `twitter_card`,
  `noindex` y `json_ld`, con lectura pública y escritura de editores/administradores.

**Adjudicación:** `seo_metadata` soporta canónicamente la familia `place` sin modificar
ninguna tabla fuera del manifiesto. Por tanto **no** se crean `seo_title`, `seo_description`
ni `seo_keywords` en `points_of_interest`. No hay bloqueo y no hay autoridad duplicada.

## 2. Categorías · `business_categories` NO puede gobernar Lugares

Contenido real verificado de `business_categories` (15 filas): Artesanías, Casas de
Vacaciones, Cenotes, Cultura, Eventos (×2), Experiencias, Experiencias y tours,
Gastronomía, Hoteles, Naturaleza, Restaurantes, Servicios turísticos, Tours, Transporte.

| Categoría requerida | ¿Existe en `business_categories`?                 |
| ------------------- | ------------------------------------------------- |
| museo               | **No**                                            |
| cenote              | Sí (`cenotes`, con semántica comercial de oferta) |
| zona arqueológica   | **No**                                            |
| cultura             | Sí                                                |
| naturaleza          | Sí                                                |
| patrimonio          | **No**                                            |
| mercado / artesanal | Parcial (`artesanias`, orientada a comercio)      |

La tabla es una taxonomía **comercial** de oferta empresarial (Hoteles, Restaurantes,
Transporte, Casas de Vacaciones, Servicios turísticos) y no cubre patrimonio, museos ni
zonas arqueológicas.

**Adjudicación:** no se fuerza Lugares dentro de la clasificación empresarial. Se crea
`place_categories` como catálogo propio y `place_category_links` como relación, ambos
dentro del manifiesto autorizado. **No se crea ninguna relación con `business_categories`.**
El tipo principal (`place_types`) y las categorías de descubrimiento (`place_categories`)
permanecen como autoridades separadas.
