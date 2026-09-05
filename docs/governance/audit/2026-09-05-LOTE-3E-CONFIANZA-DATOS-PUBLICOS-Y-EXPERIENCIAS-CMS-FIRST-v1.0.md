# Lote 3E · Confianza de datos públicos y Experiencias CMS-first — Reporte de cierre v1.0

- **Fecha:** 2026-09-05
- **Autorización:** Founder — "LOTE 3E · CONFIANZA DE DATOS PÚBLICOS Y EXPERIENCIAS CMS-FIRST"
- **Rama efectiva de edición:** `edit/edt-e4e01764-00c6-4e90-8bc9-c03ea4ce1f5f` (la publicación en `integration/lovable-valladolidmx` la realiza la plataforma; no se ejecutan comandos de git desde el agente)
- **Base del lote:** `857100ee4558590926f2115d393260cb7d34ba1b` (commit que incorporó el informe del Lote 3D)
- **HEAD al cierre técnico:** `eb887a15f53af585e04937b62026e2f3f4c315ee` (este informe y el `roadmap.md` se añaden después; árbol de trabajo limpio en cada verificación)
- **Alcance respetado:** sin ramas, PR, merge ni despliegue; sin tocar `main`, mapas, pagos, reservaciones, monitoreo ni flags; sin publicar demos; sin modificar datos reales; diseño Premium aprobado intacto.

---

## 1. Resumen ejecutivo

| Objetivo | Estado |
| --- | --- |
| 1. Datos públicos CMS-first (Home y superficies públicas sin `@/mocks/*`) | **PASS** |
| 2. Experiencias · fuente canónica única (`products.product_type = 'experiencia'`) | **PASS** |
| 3. Atributos y filtros administrables (migración aditiva/reversible + CMS + Portal Empresa + RLS) | **PASS** |
| 4. Conexión pública (listado, filtros, perfil, micrositio) con IDs/slugs y atributos reales | **PASS** |
| 5. Pruebas y cierre (cuentas temporales, RLS, typecheck, build, suite, Route Inventory, QA responsive, pruebas de contrato) | **PASS** |

Ninguna casilla queda en FAIL ni NO VERIFICADO. El lote se declara **CERRADO** a nivel técnico y documental.

---

## 2. Objetivo 1 · Datos públicos CMS-first

### 2.1 Cambios

| Superficie / módulo | Antes | Ahora |
| --- | --- | --- |
| `src/components/home/CategoriasSection.tsx` | `CATEGORIAS_MOCK` | `useHomeFeaturedCategories()` → `listHomeFeaturedCategories` (CMS). Vacío honesto: "Aún no hay categorías publicadas para la portada." (`data-home-empty="categorias"`, `role="status"`). |
| `src/components/home/EmpresasSection.tsx` | `EMPRESAS_MOCK` | `listFeaturedBusinesses` (CMS). Vacío honesto: "Aún no hay empresas destacadas publicadas." |
| `src/components/home/ResenasSection.tsx` | `RESENAS_MOCK` | `listFeaturedReviews` (CMS). Vacío honesto: "Aún no hay reseñas publicadas para la portada." |
| `src/components/home/RutasSection.tsx` | `RUTAS_MOCK` | `listPublishedRoutes` (CMS). Vacío honesto: "Aún no hay rutas publicadas." |
| `src/components/home/HeroSearchPill.tsx` | `DESTINOS_MOCK` + `CATEGORIAS_MOCK` | `usePublishedDestinations()` + `useHomeFeaturedCategories()`; opciones vacías → "Sin destinos disponibles" / "Sin categorías disponibles". |
| `src/lib/cms/home-featured-categories-query.ts` (nuevo) | — | `queryOptions` compartidas (SSR + cliente) para categorías destacadas. |
| `src/routes/index.tsx` | — | `ensureQueryData(homeFeaturedCategoriesQueryOptions)` en el loader (SSR sin parpadeo; falla cerrada a `[]`). |
| `src/lib/experience-builder/preview-registry.tsx` | `DESTINOS_MOCK` para vistas previas del Constructor | `listPublishedDestinations` (CMS). |

Composición, jerarquía, espaciado, tipografía, imágenes aprobadas y comportamiento Premium no cambian: sólo la fuente de datos y el estado vacío (texto accesible, mismos tokens).

### 2.2 Mocks restantes

`src/mocks/*` permanece únicamente para pruebas unitarias y vistas previas internas `/lovable/*` con `noindex`. La prueba de contrato `scripts/experiences/public-data-sources.contract.test.ts` impide reintroducir imports de `@/mocks/*` en módulos públicos (ver §6.4).

---

## 3. Objetivo 2 · Experiencias · fuente canónica única

### 3.1 Estado de la fuente canónica (lectura de sólo consulta, 2026-09-05)

| `status` | `is_demo_seed` | Registros | Con `tipo_experiencia` | Con portada | Empresas |
| --- | --- | --- | --- | --- | --- |
| `published` | false | 4 | 0 | 0 | `zazil-tunich` |
| `in_review` | true (DEMO) | 8 | 8 | 8 | `demo-*` (8 empresas demostrativas) |
| `draft` | true | 2 | 0 | 0 | `bici-nocturna-calzada-frailes`, `manglar-expediciones` |

- Los 8 registros DEMO conservan su estado editorial `in_review`, su prefijo "DEMO ·" y `is_demo_seed = true`. **No se publicó ninguno.**
- Los registros publicados reales no fueron modificados (sin atributos inventados, sin portadas inventadas).

### 3.2 Cambios

| Módulo | Cambio |
| --- | --- |
| `src/lib/experiences/experience-demo-dataset.ts` | **Eliminado** (559 líneas de fixture). |
| `scripts/experiences/experience-demo-dataset.contract.test.ts` | **Eliminado** (probaba el fixture). |
| `src/lib/experiences/experience-public-reads.server.ts` | Lector público reescrito: `products` (`product_type = 'experiencia'`, `status = 'published'`, `deleted_at IS NULL`) + `businesses`/`business_locations`/`destinations` + `tourism_attribute_definitions/_options` (familia `experiencias`) + firma de portadas. Filtro estricto por destino (`?destino=`); nombre de destino leído de `destinations` aunque el listado esté vacío ("Experiencias en Espita"). Sin service role. Lectura de detalle para revisión interna (`in_review`) sólo con sesión editorial. |
| `src/lib/experiences/experience-public-reads.functions.ts` | `getExperiencesListing` (GET, sólo publicados); `getExperiencesReviewListing` y `getExperienceReviewDetail` (POST, `requireSupabaseAuth` + `is_editor_or_admin`, estados `published` + `in_review`, `markDemo`). |
| `src/lib/experiences/experience-attributes.ts` (nuevo) | Constantes de familia/ejes: `experiencias`, `tipo_experiencia`, `idioma`, `accesibilidad`. |
| `src/routes/lovable/g4-experience-listing-premium-preview.tsx` | Vista previa interna (noindex): modo **Publicado** (lectura pública por loader) y modo **En revisión** (consulta autenticada del lado del cliente). Sin fixture local. |
| `src/routes/lovable/g4-experience-premium-preview.tsx` (nuevo) | Vista previa interna de ficha (noindex) con los mismos dos modos; registrada en `route-inventory.ts`. |

---

## 4. Objetivo 3 · Atributos y filtros administrables

### 4.1 Migración aditiva y reversible

`supabase/migrations/20260904235111_27691f06-473f-447a-a329-ebfd2efbbe5d.sql`

- Inserta el eje `tipo_experiencia` (familia `experiencias`, `single`, `filter_group = primary`, `filterable = true`, `sort_order = -10`) en `tourism_attribute_definitions` con 6 opciones ya visibles en el listado aprobado: Arqueología, Cultura maya, Cultura y patrimonio, Gastronomía, Cenotes y naturaleza, Artesanía viva. `ON CONFLICT DO NOTHING`.
- Relocaliza `metadata.category_label` → `filter_attributes.tipo_experiencia` **sólo** en registros DEMO (`is_demo_seed = true`) que ya declaraban su tipo. No inventa ni completa valores en registros reales.
- Rollback documentado en cabecera (borrar el eje —opciones en cascada— y quitar la clave de los DEMO).

Catálogo resultante de la familia `experiencias` (8 ejes, todos administrables): `tipo_experiencia` (6), `duracion` (3), `horario` (5), `idioma` (4), `accesibilidad` (6), `apta_para` (5), `intensidad` (3), `nivel_precio` (3). Cubre destino/territorio (derivado del negocio), tipo, duración, horario, idioma, accesibilidad, tipo de viajero/intereses, intensidad y nivel de precio. No se añadieron ejes fuera de los ya aprobados/visibles.

### 4.2 Editor de atributos (CMS y Portal Empresa)

| Módulo | Cambio |
| --- | --- |
| `src/lib/portal/product-attributes.functions.ts` | `assertAccess` admite dueño/miembro **o** `is_editor_or_admin`; `readEditorDTO` devuelve valores coaccionados a la forma del catálogo; el handler `updateProductAttributes` sólo persiste valores permitidos por el catálogo. |
| `src/lib/business-attributes/types.ts` | Nueva `coerceAttributesToDefinitions(values, definitions)`: ejes `single` → cadena (si llegó arreglo, primer valor válido); ejes `multi` → arreglo. Corrige que los DEMO guardaran ejes `single` como arreglos y el panel los mostrara vacíos. |
| `src/components/cms/ProductEditor.tsx` | Renderiza `ProductAttributesPanel` ("Características de la experiencia", botón "Guardar características") en alta y edición del CMS. |
| `src/routes/_authenticated/portal/catalogo.tsx` | Mismo panel para el dueño de la experiencia (sin cambios de diseño del Portal). |
| `src/lib/portal/portal-product-publish.functions.ts` | La vista previa del Portal proyecta `attributes: []` y `category_label: null` (los atributos se editan en su panel; la ficha pública sí los resuelve). |

### 4.3 Autoridad editorial (sin cambios de política; verificada)

`business_owner` **no** puede publicar, verificar, destacar, asignar Premium/posicionamiento, cambiar fechas editoriales ni editar experiencias ajenas: lo garantizan las políticas `products_perm_write` y el disparador `trg_enforce_reserved_product_fields` del Lote 3A. Admin/editor conserva la autoridad existente. Evidencia en §6.2.

---

## 5. Objetivo 4 · Conexión pública

| Superficie | Fuente | Evidencia |
| --- | --- | --- |
| `/experiencias` | `getExperiencesListing` → 4 publicadas reales; hero, escaparate, tarjetas y Alux intactos | h1 "Experiencias"; 4 tarjetas; sin fuga DEMO (§6.5) |
| `/experiencias?destino=valladolid` | Filtro estricto por destino | h1 "Experiencias en Valladolid" |
| `/experiencias?destino=espita` / `?destino=izamal` | Vacío honesto con nombre real del destino | "Aún no hay experiencias publicadas en Espita/Izamal." |
| `/producto/ceremonia-maya` | `getMarketplaceProductBySlug` + `resolveProductAttributes` (atributos resueltos contra el catálogo; `eyebrow` = tipo real; idiomas y accesibilidad desde ejes) | 200; sin atributos inventados (el registro real no los tiene) |
| `/producto/demo-taller-urdido-de-hamaca` (DEMO en revisión) | No expuesto públicamente | **404** "Producto no encontrado" |
| Micrositio `/oriente-maya/<destino>` | Navegador de descubrimiento enlaza `/experiencias?destino=<slug>` → primero el destino activo; sin "cercanías" fuera de la regla territorial aprobada (no se muestran) | 200 en Valladolid e Izamal |
| Filtros | `ExperienceFiltersBar` con ejes del catálogo (`destino`, `tipo`, `operador` + ejes `filterable` de la familia); un eje sólo aparece con ≥ 2 opciones reales | Visibles en revisión interna (12 registros); ocultos en público mientras los 4 publicados no tengan atributos capturados |
| Tarjetas | Kicker = `tipo_experiencia` real (fallback "Experiencia"); en revisión interna prevalece "DEMO · en revisión" | Captura §6.5 |
| Alux global / Mi Viaje | Sin cambios (`PremiumAluxBar`, `AddToTravelPlanButton`) | Presentes en las 4 anchuras |

### 5.1 Corrección de estado sin fotografía (componente compartido F1L)

`src/components/home-premium/shared/PremiumShowcase.tsx`: en las dos tarjetas con título superpuesto (destacada de escritorio y carrusel móvil) el marcador neutral ya no repite el nombre, evitando el doble rótulo cuando la entidad real no tiene portada acreditada. Las filas compactas (imagen a la izquierda) conservan el rótulo. No cambia tamaño, forma ni tokens.

### 5.2 Textos de la superficie de revisión interna

`ExperiencesListingSurface`: cuando recibe `reviewNotice` los encabezados dicen "Experiencias publicadas y en revisión del Oriente Maya" / "N experiencias publicadas o en revisión". En público permanecen exactamente los textos aprobados.

---

## 6. Objetivo 5 · Pruebas y cierre

### 6.1 Verificación por UI · CMS (sesión administrador del preview)

| Paso | Resultado |
| --- | --- |
| Abrir `/cms/productos/0a0dd8f5-1522-44d5-afe3-afc0d18976f5/editar` (DEMO · Cocina de humo en fogón maya, empresa `demo-cocina-demostrativa-xtabay`) | Panel "Características de la experiencia" visible con valores actuales |
| Cambiar `duracion` `3-4-horas` → `medio-dia`, "Guardar características", recargar | Persistió `medio-dia` |
| Restaurar `medio-dia` → `3-4-horas`, guardar, recargar | Persistió `3-4-horas` (valor exacto original; confirmado en BD al cierre) |

### 6.2 Verificación por UI · Portal Empresa (cuenta temporal, reversible)

| Paso | Resultado |
| --- | --- |
| Alta temporal `lote3e.ui.tmp@example.com` (`6a6c5675-02ce-4024-8a4e-38ac723d3481`), rol `business_owner`, vínculo `business_users` como dueño de `demo-mesa-demostrativa-sac-nicte` | Creada (scripts `/tmp/browser/lote3e/setup_tmp_owner.ts`) |
| `/portal/catalogo` con esa sesión | Sólo su experiencia "DEMO · Mercado y sobremesa yucateca" (`df465805-2cb6-4cbd-901c-ccd96a8b1913`); acciones visibles únicamente "Guardar cambios", "Retirar revisión", "Archivar" (sin publicar/destacar) |
| Cambiar `intensidad` `media` → `alta`, guardar, recargar | Persistió `alta` |
| Restaurar `alta` → `media`, guardar, recargar | Persistió `media` (valor exacto original; confirmado en BD al cierre) |
| Lectura pública anónima | La experiencia permanece `in_review` → no visible en `/experiencias` ni en `/producto/<slug>` |
| Limpieza | Vínculo `business_users`, roles (`2`, incluido el `traveler` automático) y usuario eliminados; `auth.users` con prefijo `lote3e.` = **0**; roles huérfanos = **0** |

### 6.3 RLS (Data API con la sesión temporal, antes de eliminarla)

| Intento del `business_owner` temporal | Resultado |
| --- | --- |
| `UPDATE products SET status = 'published'` (propia) | Bloqueado — `reserved_field:status` |
| `UPDATE products SET visibility_level = 'destacado'` (propia) | Bloqueado — `reserved_field:visibility_level` |
| `UPDATE products SET published_at = now()` (propia) | Bloqueado — campo reservado |
| `UPDATE products SET filter_attributes / tagline` (experiencia ajena, `0a0dd8f5…`) | 0 filas afectadas (aislamiento entre empresas) |
| `SELECT products WHERE product_type = 'experiencia'` anónimo | Sólo los 4 publicados |
| `SELECT products` con la cuenta temporal tras la limpieza | 0 filas (cuenta inexistente) |

### 6.4 Gates técnicos (resultados exactos)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `bunx tsgo --noEmit -p tsconfig.json` | exit 0, sin errores |
| Build | `bun run build` | exit 0 — cliente `✓ built in 24.18s` (PWA precache 561 entradas · 4848.14 KiB); servidor `✓ built in 5.86s` (620 entradas · 7801.24 KiB) |
| Suite oficial | `bun test scripts/` | **761 pass · 0 fail** · 5261 expect() · 71 archivos · 3.70 s |
| Contratos de Experiencias | `bun test scripts/experiences/` | 11 pass · 0 fail (6 comercio + 5 datos públicos CMS-first) |
| Route Inventory | `bun scripts/route-inventory-coverage.ts` | ✔ 246 rutas cubiertas (incluye la nueva `/lovable/g4-experience-premium-preview`) |

Pruebas de contrato nuevas (`scripts/experiences/public-data-sources.contract.test.ts`):
1. ningún módulo público importa `@/mocks/*` (excepciones: `src/mocks`, pruebas y rutas `/lovable/*` con `noindex`);
2. las vistas previas internas que usan fixtures declaran `noindex`;
3. `experience-demo-dataset` no existe ni se importa;
4. ninguna ruta pública importa fixtures;
5. el lector público de Experiencias sólo admite `published` (no acepta `in_review`/`draft`).

### 6.5 QA responsive (Playwright · localhost:8080 · 1440/834/430/390)

12 superficies × 4 anchuras = **48 casos**: `/`, `/experiencias`, `/experiencias?destino=valladolid`, `/experiencias?destino=espita`, `/experiencias?destino=izamal`, `/producto/ceremonia-maya`, `/producto/demo-taller-urdido-de-hamaca` (404 esperado), `/oriente-maya/valladolid`, `/oriente-maya/izamal`, `/lovable/g4-experience-listing-premium-preview`, `/lovable/g4-experience-premium-preview` (con y sin `slug`).

- Estado HTTP 200 en todas salvo el 404 esperado del DEMO no publicado.
- Desbordamiento horizontal: **0 px** en los 48 casos.
- Imágenes rotas: **0**. Páginas vacías: **0** (los listados sin resultados muestran el vacío honesto con hero, Alux y atajos).
- Fuga de contenido DEMO en superficies públicas: **ninguna**.
- Vistas previas internas en modo revisión (sesión administrador, 1440/390): 12 registros (4 publicados + 8 DEMO marcados "DEMO · en revisión"), barra de filtros con Destino/Tipo/Duración/Todos los filtros, `robots = noindex,nofollow,noarchive`, 0 px de desbordamiento, 0 errores de página.
- Errores de consola: ninguno introducido por el lote. Persisten los ya inventariados en el Lote 3D: `RefererNotAllowedMapError` en Home (P0 · dominio del mapa) y clave duplicada "Estoy planeando" en el micrositio (P1 · Lote 3D).

Capturas en `/tmp/browser/lote3e/shots/` (entorno de verificación).

---

## 7. Archivos modificados (diff `857100ee…` → `eb887a15…`, 27 archivos, +1335 / −930)

- `roadmap.md`
- `scripts/experiences/experience-demo-dataset.contract.test.ts` (eliminado)
- `scripts/experiences/public-data-sources.contract.test.ts` (nuevo)
- `src/components/cms/ProductEditor.tsx`
- `src/components/experience-premium/ExperiencesListingSurface.tsx`
- `src/components/experience-premium/experience-premium-vm.ts`
- `src/components/home-premium/shared/PremiumShowcase.tsx`
- `src/components/home/CategoriasSection.tsx`
- `src/components/home/EmpresasSection.tsx`
- `src/components/home/HeroSearchPill.tsx`
- `src/components/home/ResenasSection.tsx`
- `src/components/home/RutasSection.tsx`
- `src/lib/business-attributes/types.ts`
- `src/lib/catalog/marketplace-reads.functions.ts`
- `src/lib/cms/home-featured-categories-query.ts` (nuevo)
- `src/lib/experience-builder/preview-registry.tsx`
- `src/lib/experiences/experience-attributes.ts` (nuevo)
- `src/lib/experiences/experience-commerce.ts` (sólo formato)
- `src/lib/experiences/experience-demo-dataset.ts` (eliminado)
- `src/lib/experiences/experience-public-reads.functions.ts`
- `src/lib/experiences/experience-public-reads.server.ts`
- `src/lib/portal/portal-product-publish.functions.ts`
- `src/lib/portal/product-attributes.functions.ts`
- `src/routes/index.tsx`
- `src/routes/lovable/g4-experience-listing-premium-preview.tsx`
- `src/routes/lovable/g4-experience-premium-preview.tsx` (nuevo)
- `supabase/migrations/20260904235111_27691f06-473f-447a-a329-ebfd2efbbe5d.sql` (nueva)

Además, con este cierre: este informe y la actualización de `roadmap.md`.

---

## 8. Datos temporales

| Elemento | Estado final |
| --- | --- |
| Cuenta `lote3e.ui.tmp@example.com` | Eliminada (0 usuarios con prefijo `lote3e.` / `lote3c.`) |
| Roles de la cuenta temporal | Eliminados (0 roles huérfanos) |
| Vínculo `business_users` temporal | Eliminado |
| Registros DEMO de Experiencias | Conservados en `in_review` (8) y `draft` (2), sin publicar, identificados "DEMO ·" e `is_demo_seed = true`; retención según Demo Pack Policy hasta indicación literal del Founder |
| Valores editados en las pruebas | Restaurados exactamente (`duracion = 3-4-horas`, `intensidad = media`; verificado en BD al cierre) |

---

## 9. Pendientes fuera de alcance (no bloquean el cierre)

| Prioridad | Hallazgo | Propuesta |
| --- | --- | --- |
| P0 (Lote 3D) | `RefererNotAllowedMapError` del mapa en Home | Autorizar dominio del preview/producción en la clave del mapa (fuera de este lote: "no tocar mapas") |
| P1 | Las 4 experiencias publicadas reales (`zazil-tunich`) no tienen atributos ni portada → filtros públicos ocultos y hero sin fotografía (vacío honesto) | Captura editorial desde el CMS con el panel ya entregado; asignación de portada acreditada desde Medios |
| P1 | Breadcrumb de `/producto/<slug>` hereda el destino del contexto (`inherit: destination`) y puede mostrar "Espita > Ceremonia Maya" para un producto de Valladolid | Ajustar `src/routes/producto.$slug.tsx` para declarar el destino del negocio como ancestro explícito (motor de contexto, preexistente) |
| P1 (Lote 3D) | Clave duplicada "Estoy planeando" en micrositio | Lote de reparación 3D-B |
| P2 | 2 registros DEMO antiguos en `draft` sin atributos (`bici-nocturna-calzada-frailes`, `manglar-expediciones`) | Completar o archivar cuando el Founder libere el Demo Pack |

---

## 10. Declaración de cierre

Todos los objetivos del Lote 3E quedan en **PASS** con evidencia reproducible; no hay FAIL ni NO VERIFICADO. No se avanzó al Lote 3F. La rama efectiva es la de edición indicada arriba; la publicación en `integration/lovable-valladolidmx` corre a cargo de la plataforma.
