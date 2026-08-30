# G8-R1-F1B-0 · Manifiesto Editorial del Piloto — READ-ONLY

Fecha: 2026-08-29 · Modo: sólo lectura (cero cambios en código, datos, medios, estados, flags, sitemap, redirects o composiciones).
Fuente: consultas directas a la base productiva. Ningún dato inferido, completado con mocks ni obtenido de fuentes externas.

---

## 0 · Hallazgo estructural que condiciona todo el piloto

| Hecho verificado | Valor | Consecuencia |
|---|---|---|
| Tablas de medios por entidad | `place_media` = 0, `product_media` = 0, `business_media` = 9, `destination_media` = 3 | Ningún Lugar ni Producto tiene fotografía asociada |
| `media_assets` total | 32 (19 demo_seed) | Banco fotográfico real prácticamente inexistente |
| `place_authorities` | 0 filas | El modelo Lugar↔Operador no tiene ni un vínculo |
| `place_products` | 0 filas | El modelo Lugar↔Producto no tiene ni un vínculo |
| `destination_zones` | 0 filas | No hay zonas en ningún destino |
| `seo_metadata` | 4 filas totales (1 destino + 3 empresas) | 0 filas para Lugares, Productos, Eventos |
| Empresas demo_seed publicadas | 23 | Coincide exactamente con los "23 demos publicados" del encargo |

**Lectura:** hoy no existe ninguna entidad que califique como Lista A (publicable sin cambios). El piloto es, en su estado actual, un piloto de **carga editorial**, no de publicación.

---

## 1 · Destinos y territorio

| Destino | ID | Estado | demo | Desc | Portada | Galería | Coords | Zonas | SEO | JSON-LD | Empresas | Lugares |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Valladolid | `11111111-aaaa-4aaa-8aaa-000000000001` | published | no | 605 car. | sí (`hero_media_id`) | 3 | 20.6896 / -88.2020 | 0 | 1 fila | vía plantilla | 18 | 5 |
| Tinum | `bdeb0bdd-178b-4b04-b36f-6982e7d1ae17` | **draft** | no | **vacía** | **no** | 0 | **nulas** | 0 | 0 | no | 0 | 1 (Chichén Itzá) |
| Temozón | `a7111b9a-a1de-49c0-b251-9818645a9a43` | **draft** | no | **vacía** | **no** | 0 | **nulas** | 0 | 0 | no | 0 | 1 (Ek' Balam) |
| Izamal | `11111111-aaaa-4aaa-8aaa-000000000005` | published | **sí (demo)** | 566 car. | sí | 0 | 20.9297 / -89.0175 | 0 | 0 | no | 7 (7 demo) | 0 |

Procedencia: Valladolid, Tinum y Temozón son registros reales. **Izamal está marcado `is_demo_seed = true`** y sus 7 empresas son demo.

**Veredicto territorial:** Izamal **no cumple** los mínimos reales — no debe entrar al piloto y no sustituye a Tinum ni a Temozón. Tinum y Temozón existen pero están vacíos: sólo aportan como contenedor territorial de Chichén Itzá y Ek' Balam, que esta fase **no publica**.

Campos faltantes Tinum/Temozón: nombre oficial ampliado, descripción editorial, tagline, highlights, coordenadas del centro, portada, galería, categorías, SEO y JSON-LD.

---

## 2 · Lugares y atractivos (casos obligatorios)

Ruta canónica del modelo: `/oriente-maya/:destino/lugares/:slug`.

| Lugar | ID | Tipo | Destino | Zona | Estado | Coords | Horarios | Entrada | Medios | SEO | Operador | Productos | Eventos |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Chichén Itzá | `3842b6cb-80e9-4d50-abde-57560a563e21` | zona-arqueologica | tinum | — | draft | 20.6843 / -88.5678 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Ek' Balam | `6c22aa5f-62f9-4faa-ba39-c66e884d7904` | zona-arqueologica | temozon | — | draft | 20.8917 / -88.1367 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Cenote Zací | `7dedc0f8-0bdc-485c-9bef-608bae559a9f` | **sin tipo** | valladolid | — | published | 20.6892 / -88.2010 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Cenote Suytún | `b5c4be83-d674-477b-bb33-2a9c0c69de17` | **sin tipo** | valladolid | — | published (demo) | 20.6547 / -88.1436 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Calzada de los Frailes | `1a089755-d6e6-4bfc-b0dc-f7f8b47a34c0` | **sin tipo** | valladolid | — | published (demo) | 20.6862 / -88.2050 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Ex Convento San Bernardino / Sisal | `f7728d46-6e4b-4c24-927c-c44568e1fe6b` | **sin tipo** | valladolid | — | published (demo) | 20.6845 / -88.2078 | 0 | — | 0 | 0 | 0 | 0 | 0 |
| Casa de los Venados | **NO EXISTE** | — | — | — | — | — | — | — | — | — | — | — | — |
| Zazil Tunich (como Lugar) | **NO EXISTE** | — | — | — | — | — | — | — | — | — | — | — | — |
| (extra) Cenote Ik Kil | `776f58ee-ba02-4b9c-8006-3352ad3a4dfa` | sin tipo | valladolid (**coords en Tinum**) | — | published (demo) | 20.6333 / -88.5667 | 0 | — | 0 | 0 | 0 | 0 | 0 |

Faltantes comunes a **todos** los lugares: `place_type_id` en 5 de 7, zona, horarios, tipo de admisión y precio, accesibilidad, contacto, medios, ALT/crédito, SEO, JSON-LD, autoridad/operador, productos y eventos relacionados, fuente acreditada.

Incoherencia detectada: **Cenote Ik Kil** está asignado a Valladolid pero sus coordenadas caen en Tinum. No se corrige en esta fase; se reporta.

Confirmado: **Chichén Itzá y Ek' Balam permanecen en draft** — no se publican en esta fase.

---

## 3 · Modelo Cenote Suytún (tres autoridades separadas)

| Autoridad | Registro | ID | Estado |
|---|---|---|---|
| Lugar / Atractivo | Cenote Suytun (POI) | `b5c4be83-d674-477b-bb33-2a9c0c69de17` | published, demo_seed |
| Empresa operadora | Cenote Suytun (business, cat. cenotes) | `33e4c2c7-89c9-4ffb-87e3-f68b93b020f7` | published, demo_seed, 1 producto |
| Producto / Tour | Tour Cenote Suytun · Guiado | `dddddddd-aaaa-4aaa-8aaa-000000000010` | published, demo_seed, $550 MXN |
| (cuarta entidad conflictiva) | Cenote Suytun · Tour guiado (business, cat. experiencias) | `2d12cdd0-c609-44b7-85cf-52ea4600cd3d` | published, demo_seed, 0 productos |

Relaciones existentes: **ninguna** (`place_authorities` = 0, `place_products` = 0).

Vínculos faltantes propuestos (no ejecutados):
1. `place_authorities`: Lugar Suytún → Empresa `33e4c2c7…` con `authority_kind = operador`, `is_primary = true`.
2. `place_products`: Lugar Suytún → Producto `dddddddd…0010` con `relation_kind = oficial`.
3. Adjudicación Founder pendiente sobre la empresa duplicada `2d12cdd0…` ("Cenote Suytun · Tour guiado"): es un **tour modelado como empresa**, contradice el modelo de tres autoridades. Propuesta reversible: pasar a draft, no borrar.

No se fusiona, borra ni renombra nada.

---

## 4 · Empresas piloto

Criterios de exclusión aplicados: demo_seed, sin coordenadas, sin contacto, sin identidad verificable, información contradictoria.

### 4.1 Únicas empresas reales (no demo) en el universo

| Empresa | ID | Destino | Categoría | Estado | Contacto | Coords | Medios | Productos | SEO | Readiness |
|---|---|---|---|---|---|---|---|---|---|---|
| Hacienda San Servacio Boutique | `7d1d0001-1111-4111-8111-000000000001` | valladolid | hoteles | published | 1 tel | sí | 3 | 0 | sí | **70 %** |
| Cocina del Frailes | `7d1d0002-1111-4111-8111-000000000002` | valladolid | restaurantes | published | 1 tel | sí | 3 | 0 | sí | **70 %** |
| Ruta Cenotes y Selva | `7d1d0003-1111-4111-8111-000000000003` | valladolid | experiencias | published | 1 tel | sí | 3 | 0 | sí | **70 %** |
| Hacienda Selva Maya | `55555555-aaaa-4aaa-8aaa-000000000001` | valladolid | hoteles | draft | 0 | sí | 0 | 1 (demo) | no | 35 % |
| Cocina de Doña Elsa | `55555555-aaaa-4aaa-8aaa-000000000002` | valladolid | restaurantes | draft | 0 | sí | 0 | 1 (demo) | no | 35 % |
| Manglar Expediciones | `55555555-aaaa-4aaa-8aaa-000000000003` | rio-lagartos | tours | draft | 0 | no | 0 | 1 (demo) | no | 20 % |
| Taller de Bordado Uayma | `55555555-aaaa-4aaa-8aaa-000000000004` | uayma | cultura | draft | 0 | no | 0 | 0 | no | 15 % |
| "hotel" (registro basura) | `1f08a9c7-225c-4cc2-8a71-7e65a9af0bc7` | valladolid | hoteles | draft | tel + email personales | **no** | 0 | 0 | no | **EXCLUIR** |

Faltantes exactos de las tres empresas al 70 %: horarios (`business_hours` = 0), productos, ALT/crédito en sus 3 medios, JSON-LD específico, políticas y CTA de conversión.

Registro `1f08a9c7…` ("hotel"): sin identidad verificable, sin coordenadas, con datos personales expuestos. **Excluido de la propuesta y candidato a depuración con autorización.**

### 4.2 Zazil Tunich (obligatoria)

| Campo | Valor |
|---|---|
| ID | `e4588636-bb44-4b13-8c08-f29b2026c76f` |
| Estado | published, `is_demo_seed = true`, `verified = false` |
| Destino / categoría | valladolid / cenotes |
| Descripción | 1 385 caracteres (la más completa del sistema) |
| Contacto | website `zaziltunich.com`, email `reservas@zaziltunich.com` |
| Coordenadas | sí (20.7167 / -88.2500, Yalcobá) |
| Medios | **0** |
| Productos | 4 (todos demo_seed, `conversion_mode = sitio_externo`) |
| SEO | 0 filas propias (title actual generado por plantilla) |
| Readiness | **60 %** |

Faltantes: retirar marca demo_seed previa validación del titular, `verified = true`, portada + galería reales con derechos, horarios, teléfono, precios vigentes confirmados, SEO propio, Lugar asociado, JSON-LD.

### 4.3 Cupos del encargo vs. realidad

| Cupo solicitado | Candidatos reales disponibles |
|---|---|
| hasta 6 hoteles | **2** (San Servacio publicado, Selva Maya en draft) |
| hasta 6 restaurantes | **2** (Cocina del Frailes publicado, Doña Elsa en draft) |
| hasta 2 operadoras de atractivos | **2** (Ruta Cenotes y Selva, Zazil Tunich) |
| hasta 1 casa de vacaciones (sin publicar) | **0** reales — las 2 existentes son demo |
| Zazil Tunich | incluida |

**Déficit: 4 hoteles, 4 restaurantes y 1 casa de vacaciones sin candidato real.**

---

## 5 · Productos, experiencias y tours

Los 9 productos del sistema son `is_demo_seed = true`. **Cero productos reales.**

| Producto | ID | Empresa | Tipo | Precio | Duración | Cover | Medios |
|---|---|---|---|---|---|---|---|
| Recorrido Cenote Museo | `02d154d0-157d-403d-8f05-40f2a5080d5c` | zazil-tunich | experiencia | $450 | 60 min | no | 0 |
| Nado en el Cenote Sagrado | `6e1b9d1d-f1f7-468f-ab80-88bc6ae2139f` | zazil-tunich | experiencia | $650 | 90 min | no | 0 |
| Ceremonia Maya | `1d0a7df3-7bfb-4764-8fad-bc303189d521` | zazil-tunich | experiencia | $8 500 | 120 min | no | 0 |
| Cena Romántica en Cenote | `d7fa2eb7-7605-4b4b-ad11-0610951ce11d` | zazil-tunich | experiencia | $6 500 | 180 min | no | 0 |
| Tour Cenote Suytun · Guiado | `dddddddd-aaaa-4aaa-8aaa-000000000010` | cenote-suytun | tour | $550 | — | no | 0 |
| Bici Nocturna Frailes · Ticket | `dddddddd-aaaa-4aaa-8aaa-000000000011` | bici-nocturna… | experiencia | $350 | — | no | 0 |
| Menú Cochinita Tradicional | `dddddddd-aaaa-4aaa-8aaa-000000000002` | cocina-de-dona-elsa | restaurante | $380 | 90 min | no | 0 |
| Suite Selva Maya | `dddddddd-aaaa-4aaa-8aaa-000000000001` | hacienda-selva-maya | hotel | $4 800 | — | no | 0 |
| Tour del Manglar al Amanecer | `dddddddd-aaaa-4aaa-8aaa-000000000003` | manglar-expediciones | experiencia | $950 | 180 min | no | 0 |

Los 4 productos de Zazil Tunich son los únicos **promovibles a reales** si el titular confirma precio vigente, capacidad, ubicación exacta, políticas de cancelación y entrega fotografías. Hoy ninguno acredita: capacidad (nula en los 4), medios, CTA propio, políticas, SEO ni JSON-LD.

**Propuesta de cupo: 4 experiencias (Zazil Tunich) + 0 tours reales.** No hay tour real acreditable.

---

## 6 · Eventos

10 eventos, **los 10 `is_demo_seed = true` y los 10 sin portada** (`cover_media_id` nulo), sin empresa asociada, sin `external_url` y sin CTA.

Vigencia respecto a hoy (2026-08-29): 9 de 10 ya vencieron. El único con fecha futura es **Hanal Pixán Izamal** (`3388ff30-a22b-4c85-9502-4a59150ca5c4`, 03–05 sep 2026), pero es demo, sin portada y en un destino excluido.

**Eventos reales publicables: 0.** El bloque Eventos queda fuera del piloto hasta que el Founder aporte convocatorias reales.

---

## 7 · Medios

| Clasificación | Cantidad | Detalle |
|---|---|---|
| Aprobado y real | **0 acreditados** | 9 `business_media` de las 3 empresas reales, con derechos aún no confirmados |
| IA conceptual temporal | 6 | heroes de destinos en `demo-media/destinations/*` |
| Demo | 19 `is_demo_seed` | — |
| Sin medio | Todos los Lugares, todos los Productos, 7 de 10 destinos, 10 de 10 eventos | — |
| Sin ALT | 3 de 32 | — |
| Sin crédito/licencia | **14 de 32** | — |
| Técnico (excluir de superficies editoriales) | 1 | `media-original/pilot-v11/vertical-2400h.jpg` |

Regla respetada: no se reutiliza fotografía de una entidad en otra.

### 7.1 Lista exacta de fotografías a solicitar

Formato por entidad: **1 portada 16:9 ≥ 2400×1350** + **galería 4–8 fotos 4:3 ≥ 1600×1200**, cada una con ALT en español, crédito visible, autor, licencia y punto focal (x,y en 0–1).

| Entidad | Portada | Galería | Responsable |
|---|---|---|---|
| Destino Tinum | 1 | 4 | Founder |
| Destino Temozón | 1 | 4 | Founder |
| Cenote Zací | 1 | 6 | Founder |
| Calzada de los Frailes | 1 | 8 | Founder |
| Ex Convento San Bernardino / Sisal | 1 | 8 | Founder |
| Cenote Suytún (Lugar) | 1 | 6 | Operador |
| Zazil Tunich (Empresa) | 1 | 8 | Empresa |
| Zazil Tunich (4 productos) | 4 | 12 (3 c/u) | Empresa |
| Hacienda San Servacio | validar derechos de las 3 existentes | +5 | Empresa |
| Cocina del Frailes | validar derechos de las 3 existentes | +5 | Empresa |
| Ruta Cenotes y Selva | validar derechos de las 3 existentes | +5 | Empresa |

**Total mínimo: 12 portadas nuevas + ~66 fotos de galería + validación de derechos y ALT de 9 imágenes existentes.**

---

## 8 · SEO

Sólo existen 4 filas de `seo_metadata`: destino Valladolid y las 3 empresas reales. Todas con `noindex = false` y canonical correcto bajo `/oriente-maya/...`.

Faltan por completo: title, description, canonical, robots, JSON-LD, Open Graph, breadcrumb y enlaces internos para **todos los Lugares, todos los Productos, todos los Eventos y los destinos Tinum, Temozón e Izamal**.

Colisiones de slug ya adjudicadas en R1-F1A (familias distintas, no rompen resolución canónica): `ek-balam` (destino/lugar), `chichen-itza` (destino/lugar), `cenote-suytun` (lugar/empresa/producto).

Landings SEO piloto solicitadas — **ninguna existe hoy**:

| Landing | Estado propuesto |
|---|---|
| Zazil Tunich | crear en draft + noindex |
| Chichén Itzá | crear en draft + noindex |
| Cenote Suytún | crear en draft + noindex |

---

## 9 · Los 23 demo_seed publicados (empresas)

Sin cambio de estado en esta fase. Ruta pública: `/oriente-maya/{destino}/{categoria}/{slug}`.

| # | Empresa | ID | Destino | Categoría | Dependencias | Impacto de pasar a draft |
|---|---|---|---|---|---|---|
| 1 | Taller de Hipil Espita | `ce80e13e-88ad-4057-a88a-3b3f491ce0f3` | espita | artesanias | — | bajo |
| 2 | Hotel Boutique Casa Espita | `354c8cfe-2341-4234-8176-6f738b7ea12f` | espita | hoteles | — | bajo |
| 3 | Los Almendros Espita | `8978a500-12eb-46ec-866a-63964dea5e27` | espita | restaurantes | — | bajo |
| 4 | Tour Mercado Municipal Espita | `308d3968-2ebf-4071-864b-f1d0995612fd` | espita | tours | — | bajo |
| 5 | Artesanías Hunab Ku | `dfc09c93-fafb-4282-9e81-8cbd16bf6678` | izamal | artesanias | — | bajo |
| 6 | Villa Amarilla · Izamal | `66666666-aaaa-4aaa-8aaa-000000000002` | izamal | casas-de-vacaciones | — | bajo |
| 7 | Paseos en Calesa Izamal | `b027039c-992c-42b0-94b0-1e4098df2b8f` | izamal | experiencias | — | bajo |
| 8 | Hotel Santo Domingo | `1b54676b-0e90-45a6-bae3-88b3f25bc2a0` | izamal | hoteles | — | bajo |
| 9 | Macan Ché Bed & Breakfast | `b4226c06-d49b-44f8-bad6-b30fb68cbb3f` | izamal | hoteles | — | bajo |
| 10 | Restaurante Kinich | `58be51b7-ef57-4b39-89c3-dfb690ee7f91` | izamal | restaurantes | — | bajo |
| 11 | Tour Convento de San Antonio | `63a67b8c-a878-48f1-95bb-f17463b828b9` | izamal | tours | — | bajo |
| 12 | Casa Colonial Sisal | `66666666-aaaa-4aaa-8aaa-000000000001` | valladolid | casas-de-vacaciones | — | bajo |
| 13 | **Cenote Suytun** | `33e4c2c7-89c9-4ffb-87e3-f68b93b020f7` | valladolid | cenotes | producto `…0010`, modelo 3 autoridades | **alto — conservar** |
| 14 | **Zazil Tunich** | `e4588636-bb44-4b13-8c08-f29b2026c76f` | valladolid | cenotes | 4 productos, landing SEO piloto | **alto — conservar** |
| 15 | Bici nocturna por la Calzada de los Frailes | `3d5b4e6a-1e84-4014-beef-9b5faf8faa28` | valladolid | experiencias | producto `…0011` | medio |
| 16 | Cenote Suytun · Tour guiado | `2d12cdd0-c609-44b7-85cf-52ea4600cd3d` | valladolid | experiencias | duplica el modelo Suytún | **pasar a draft (propuesta)** |
| 17 | Coqui Coqui Perfumería & Casa | `14d7732a-2a28-4353-b47a-5742278588b6` | valladolid | experiencias | marca real de terceros | **riesgo reputacional — draft** |
| 18 | Casa Hipil · Hotel Boutique | `75555085-f6dc-4017-9bc2-1a97214c1b9f` | valladolid | hoteles | — | bajo |
| 19 | Hotel Casa Tía Micha | `f362ae38-c021-4223-9306-20ec511730b4` | valladolid | hoteles | negocio real sin consentimiento | **riesgo — draft** |
| 20 | Conato 1910 | `5b2c502a-e943-46c8-8c70-4d335dac9e45` | valladolid | restaurantes | negocio real sin consentimiento | **riesgo — draft** |
| 21 | Taberna de los Frailes | `0d3ddf64-7f89-48b8-82fc-c7f78624bbaf` | valladolid | restaurantes | negocio real sin consentimiento | **riesgo — draft** |
| 22 | Yerbabuena del Sisal | `eaf37375-29bd-4736-abe9-c79ca54df8e7` | valladolid | restaurantes | negocio real sin consentimiento | **riesgo — draft** |
| 23 | Bici Tours Valladolid | `4d3657b4-e884-4477-8f2f-12c7ea5cc157` | valladolid | tours | — | medio |

Tráfico conocido: `business_view_events` no registra actividad relevante para estos registros.

**Propuesta reversible única:** una migración `UPDATE … SET status = 'draft'` filtrada por la lista de IDs, con migración inversa idéntica que restaura `published`. Sin borrado, sin cambio de slug, por tanto sin necesidad de 301.

Se reporta como riesgo prioritario que 6 de los 23 (filas 17, 19–22) corresponden a **negocios reales de Valladolid publicados con datos demo y sin consentimiento acreditado**.

---

## 10 · Las cuatro listas

### A. Entidades listas sin cambios
**Ninguna.** Ni una sola entidad del sistema cumple simultáneamente medios acreditados, SEO propio y datos operativos completos.

### B. Entidades que sólo requieren fotografías
| Entidad | ID | Faltante único |
|---|---|---|
| Cenote Zací | `7dedc0f8-0bdc-485c-9bef-608bae559a9f` | portada + galería (además de tipo de lugar, ver nota) |
| Calzada de los Frailes | `1a089755-d6e6-4bfc-b0dc-f7f8b47a34c0` | portada + galería |
| Ex Convento San Bernardino | `f7728d46-6e4b-4c24-927c-c44568e1fe6b` | portada + galería |

Nota: los tres tienen descripción, coordenadas y destino correctos; les falta además `place_type_id`, asignable internamente sin información del Founder.

### C. Entidades que requieren información del Founder o de la empresa
| Entidad | ID | Qué se necesita |
|---|---|---|
| Destino Tinum | `bdeb0bdd-178b-4b04-b36f-6982e7d1ae17` | descripción, tagline, highlights, coordenadas, medios |
| Destino Temozón | `a7111b9a-a1de-49c0-b251-9818645a9a43` | descripción, tagline, highlights, coordenadas, medios |
| Zazil Tunich | `e4588636-bb44-4b13-8c08-f29b2026c76f` | consentimiento, verificación, fotos, horarios, teléfono, precios vigentes |
| 4 productos Zazil Tunich | `02d154d0…`, `6e1b9d1d…`, `1d0a7df3…`, `d7fa2eb7…` | precio vigente, capacidad, políticas, fotos |
| Hacienda San Servacio | `7d1d0001-…0001` | horarios, derechos de las 3 fotos, productos |
| Cocina del Frailes | `7d1d0002-…0002` | horarios, derechos de las 3 fotos, carta/productos |
| Ruta Cenotes y Selva | `7d1d0003-…0003` | horarios, derechos de las 3 fotos, productos |
| Cenote Suytún (Lugar) | `b5c4be83-…` | operador acreditado, horarios, precio de entrada, accesibilidad, fotos |
| Casa de los Venados | **no existe** | alta completa: consentimiento, datos, fotos, horarios |
| Hoteles 3–6, restaurantes 3–6, casa de vacaciones | **no existen** | selección y consentimiento del Founder |

### D. Entidades demo que deben salir del piloto
Los 23 de la sección 9, más: 5 lugares demo publicados (incluido Cenote Ik Kil con coordenadas incoherentes), los 9 productos demo, los 10 eventos demo y los 6 destinos demo (Ek Balam, Espita, Izamal, Las Coloradas, Río Lagartos, Uayma). También el registro basura `1f08a9c7-…` ("hotel").

---

## 11 · Manifiesto del piloto (versión mínima viable)

| # | Entidad | ID | Familia | Acción |
|---|---|---|---|---|
| 1 | Valladolid | `11111111-…0001` | destino | enriquecer |
| 2 | Tinum | `bdeb0bdd-…` | destino | completar, mantener draft |
| 3 | Temozón | `a7111b9a-…` | destino | completar, mantener draft |
| 4 | Cenote Zací | `7dedc0f8-…` | lugar | fotos + tipo |
| 5 | Calzada de los Frailes | `1a089755-…` | lugar | fotos + tipo |
| 6 | Ex Convento San Bernardino | `f7728d46-…` | lugar | fotos + tipo |
| 7 | Cenote Suytún | `b5c4be83-…` | lugar | fotos + operador + horarios |
| 8 | Chichén Itzá | `3842b6cb-…` | lugar | permanece draft |
| 9 | Ek' Balam | `6c22aa5f-…` | lugar | permanece draft |
| 10 | Casa de los Venados | — | lugar | alta nueva |
| 11 | Zazil Tunich | `e4588636-…` | empresa | promover a real |
| 12 | Empresa operadora de Suytún | `33e4c2c7-…` | empresa | acreditar o sustituir |
| 13 | Hacienda San Servacio | `7d1d0001-…` | empresa | completar |
| 14 | Cocina del Frailes | `7d1d0002-…` | empresa | completar |
| 15 | Ruta Cenotes y Selva | `7d1d0003-…` | empresa | completar |
| 16–19 | 4 productos Zazil Tunich | ver §5 | producto | acreditar |
| 20–22 | Landings SEO (Zazil Tunich, Chichén Itzá, Cenote Suytún) | — | landing | crear draft + noindex |

Cobertura territorial estimada del piloto: **Valladolid ~40 % del inventario turístico relevante; Tinum y Temozón ~5 % cada uno; Izamal 0 % (excluido).**

## 12 · Orden de carga editorial propuesto

1. Consentimiento y verificación de las 4 empresas reales (incluye Zazil Tunich).
2. Retiro reversible a draft de los 23 demo publicados, con prioridad en los 6 de riesgo reputacional.
3. Completar destinos Tinum y Temozón.
4. Tipificar los 5 lugares sin `place_type_id`.
5. Crear los vínculos `place_authorities` y `place_products` de Suytún.
6. Alta de Casa de los Venados.
7. Carga fotográfica (12 portadas + ~66 galería) con ALT, crédito y punto focal.
8. SEO y JSON-LD por entidad.
9. Landings SEO piloto en draft + noindex.
10. Eventos reales, si el Founder los aporta.

## 13 · Criterio para declarar una entidad publicable

Las diez condiciones deben cumplirse simultáneamente:

1. `is_demo_seed = false`.
2. Identidad verificable y consentimiento del titular documentado.
3. Descripción editorial propia ≥ 300 caracteres.
4. Coordenadas reales (regla Geolocation Mandatory).
5. Portada con derechos confirmados, ALT humano, crédito y punto focal.
6. Galería ≥ 3 fotografías propias de la entidad.
7. Al menos un canal de contacto público válido.
8. Fila propia en `seo_metadata` con title, description y canonical.
9. JSON-LD del tipo correcto y breadcrumb resuelto por el contrato canónico.
10. Ruta canónica única sin colisión de familia.

---

## STOP CONDITION

Diagnóstico entregado. Cero cambios ejecutados. A la espera de la selección y autorización del Founder antes de iniciar G8-R1-F1B.
