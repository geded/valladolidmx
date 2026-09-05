# Lote 3J.4 · Remediación P0 y cierre de verificación (v1.0)

Rama: `integration/lovable-valladolidmx` · Sin publicar · 2026-09-06

## 1. Slug de categoría y resolución territorial

- Se restauró `business_categories.slug = 'Casas-de-vacaciones'` (valor preexistente); no se alteró dato real.
- `src/lib/navigation/territorial-resolver.functions.ts`: la resolución de categoría pasa a
  comparación insensible a mayúsculas (`ilike`) y `normalizeRouteSlug` en la comparación de
  slugs (`src/lib/navigation/canonical-paths.ts`). `SLUG_RE` no se modificó y ya no se lanza
  `invalid_categoria` para slugs con mayúsculas.
- Verificado: `/oriente-maya/uayma/Casas-de-vacaciones/demo-3j3-casa-uayma-roja` → 200,
  variantes en minúsculas → 200, listados → 200.

## 2. Credenciales demo

- Las tres cuentas demo (`…0001` viajero, `…0002` empresario, `…0003` concierge) fueron rotadas.
- Las contraseñas anteriores se eliminaron del informe y del repositorio. Ninguna credencial
  vigente figura en código, migraciones, logs ni documentación.
- Gestión: **credencial temporal gestionada fuera del repositorio**.

| Cuenta | Rol | ID (abrev.) | Vigencia |
|---|---|---|---|
| demo.traveler.3j3@valladolid.demo | traveler | d3330000…0001 | hasta limpieza demo autorizada por el Founder |
| demo.owner.3j3@valladolid.demo | business_owner | d3330000…0002 | ídem |
| demo.concierge.3j3@valladolid.demo | concierge | d3330000…0003 | ídem |

Declaración de exposición: las contraseñas iniciales estuvieron escritas en el informe 3J.3 de
esta misma rama antes de la rotación; por eso fueron rotadas y ya no son válidas.

## 3. Pruebas autenticadas (Playwright, sesión real)

### 3.1 Viajero — PASA
Borrador anónimo → inicio de sesión → importación a Mi Viaje → persistencia tras recarga →
deduplicación al reagregar → eliminación → estado demo restaurado. Sin errores de consola.

### 3.2 Empresario — PASA (con un defecto corregido)
- Ve exclusivamente sus dos empresas demo (Casa de Piedra, Sac-Be).
- Edición real en `/portal/ficha`: cambio de *tagline* guardado, persistente tras recarga y
  revertido al valor original al terminar la prueba.
- Empresa ajena (`0d3ddf64…`): acceso denegado (`forbidden`). RLS/autorización efectiva.
- Controles prohibidos ausentes: publicar, verificar, Premium, Destacado, posicionamiento y
  fecha de publicación (esta última sólo aparece en el texto informativo que la declara reservada).
- **Defecto real detectado y corregido:** `/portal/empresas` mostraba a los propietarios el botón
  "Ver detalle" hacia una vista administrativa (`getAdminBusinessCommercialStatus` exige
  admin/super_admin), que siempre terminaba en `forbidden`. Ahora ese enlace sólo se muestra a
  administradores; el propietario recibe "Editar ficha".

### 3.3 Concierge — PASA
`/concierge` accesible (bandeja de expedientes), `/portal/ficha` sin empresas asignadas,
`/admin` redirige a `/concierge`, `/cms` responde 403 con mensaje de acceso restringido.

## 4. Medios demo

Se asignaron imágenes administrables desde la Media Library (todas identificadas en su `alt_text`
como representación conceptual generada con IA, `is_demo_seed = true`), sin URLs ni archivos en código:

| Registro | Medio |
|---|---|
| DEMO · Fogón de Espita | portada gastronómica demo |
| DEMO · Mirador del Ex Convento de Uayma | portada de ex convento (`place_media`) |
| DEMO · Noche Artesanal de Uayma | portada artesanal demo |
| DEMO · Ruta Uayma y Espita | portada de mercado/sobremesa demo |
| Los 4 negocios y el producto demo | portada vinculada también a galería (`business_media`, `product_media`) |

Verificación: las 8 superficies públicas demo devuelven 200, con 0 imágenes rotas y un solo `h1`.
Todos los medios son reemplazables desde CMS/Portal. No se alteró el diseño Premium.

## 5. Alux contextual con sesión — PASA

Sobre la ficha de Experiencias Sac-Be con viajero autenticado, el panel muestra: selección activa,
destino/familia (Izamal · Experiencias), viaje guardado ("1 lugar guardado · DEMO · Casa Roja de
Uayma"), petición de fechas, cercanía opcional con permiso explícito y tres sugerencias de
familias distintas con rationale visible. Excluye la entidad activa y lo ya guardado.

Naturaleza del motor: **ranking determinístico** sobre catálogo publicado y contexto territorial.
No se ejecutó ni se declara capa generativa en esta verificación.

## 6. Validaciones

- `bunx tsgo --noEmit`: limpio
- `bun test`: 777/777 (5297 aserciones)
- `bun run build`: correcto
- Route Inventory: 247 rutas cubiertas
- QA responsive 1440/834/430/390: 0 desbordamientos, 0 imágenes rotas en las 8 fichas demo

## 7. Límites respetados

Sin publicación ni despliegue, sin tocar `main`, sin ramas/PR/merge, sin pagos ni reservas, sin
cambios en mapas, dominios, claves, cuotas, monitoreo ni diseño Premium. Sólo se modificaron
registros demo y los dos archivos de navegación/portal citados.
