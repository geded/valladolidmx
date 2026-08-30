# G8-Q2A · Catálogo estructural sembrado

Semilla estructural exclusivamente. No es contenido turístico real y no clasifica ningún registro existente.

## `place_types` (15)

`zona-arqueologica`, `cenote`, `museo`, `templo-convento`, `monumento-historico`,
`calle-emblematica`, `plaza-parque`, `mercado-artesanal`, `centro-cultural`, `hacienda`,
`gruta`, `area-natural`, `mirador`, `cuerpo-de-agua`, `otro`.

Catálogo extensible por fila (no `enum`): admite nuevos tipos sin migración de tipo.

## `place_categories` (9)

`cultura`, `patrimonio`, `naturaleza`, `arqueologia`, `aventura`, `artesanias`,
`gastronomia`, `familia`, `fotografia`.

Autoridad independiente de `business_categories`. Tipo principal y categorías de
descubrimiento permanecen separados.

## `place_authority_kinds` (6)

`autoridad-federal`, `autoridad-estatal`, `autoridad-municipal`, `operador`, `custodio`, `propietario`.

Permite relación múltiple lugar ↔ autoridades sin duplicar la entidad del lugar
(sin `is_public`, sin `claim_state`, sin `canonical_slug`). La reclamación verificada
no forma parte de G8-Q2A.

## Conteo verificado tras la migración

`place_types = 15` · `place_categories = 9` · `place_authority_kinds = 6` ·
`place_media = 0` · `place_hours = 0` · `place_authorities = 0` · `place_category_links = 0`.
