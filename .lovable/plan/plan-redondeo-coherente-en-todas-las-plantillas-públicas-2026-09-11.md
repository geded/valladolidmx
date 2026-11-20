# Plan · Redondeo coherente en todas las plantillas públicas

## Objetivo
Extender el acabado redondeado ya aprobado para la ficha Premium a todas las familias públicas existentes, usando la marca configurada en CMS y el sistema visual OMXDS. Airbnb será únicamente referencia de claridad, proporción y acabado; no se copiará su identidad.

## Alcance autorizado
- Home Premium.
- Región Oriente Maya y micrositios de destino.
- Listados de hoteles, restaurantes, casas de vacaciones, experiencias, eventos, lugares, promociones y rutas.
- Fichas de empresas, productos/experiencias, eventos, lugares, destinos y rutas.
- Landings SEO y bloques compartidos de portada, galería y tarjetas.
- Constructor y previews que consumen las mismas autoridades.

## Invariantes
- No crear plantillas, componentes, galerías, mapas, cards ni sistemas paralelos.
- No cambiar estructura, orden, textos, datos, medios, enlaces, filtros, mapas, Alux, Mi Viaje, SEO ni lógica.
- No sustituir configuración válida del CMS ni sembrar imágenes.
- No redondear mapas interactivos, vídeo realmente full-bleed, lightboxes de pantalla completa o fondos continuos cuando el recorte afecte su función.
- No publicar, desplegar, abrir PR ni fusionar.

## Implementación
1. Inventariar cada familia pública y su autoridad compartida de portada, galería, cards y contenedores editoriales.
2. Registrar comparativas “antes” en 1440, 834, 430 y 390 px para una ruta representativa de cada familia.
3. Aplicar la escala oficial OMXDS, con máximo dos radios por bloque:
   - 24 px para portadas y contenedores editoriales protagonistas.
   - 16 px para cards destacadas y paneles.
   - 12 px para cards estándar y controles.
   - Radio completo sólo para chips, badges y acciones tipo píldora.
4. Corregir primero las autoridades compartidas; tocar una plantilla específica sólo si no hereda correctamente el acabado.
5. Mantener espacio lateral visible alrededor de portadas en móvil y tablet para que el radio sea perceptible, sin alterar la composición aprobada de escritorio.
6. Confirmar paridad entre CMS/Experience Builder, preview y ruta pública.

## Validación
- Comparativa completa antes/después por familia en 1440, 834, 430 y 390 px.
- Variantes Editorial sin medio y Cinematográfica con medio acreditado.
- Un H1, cero overflow horizontal, cero imágenes rotas y enlaces/CTAs funcionales.
- Breadcrumb territorial, header, footer, filtros, mapas, Alux y Mi Viaje preservados.
- Typecheck, lint focalizado, pruebas, build, Route Inventory y Governance Integrity.
- Actualizar el Closure Readiness Report con Scope Gate y Preservation Gate separados.

## Entrega
La implementación se hará por autoridades compartidas y se presentará una comparación visual representativa antes de considerar el cambio listo para integración. Cualquier regresión fuera del redondeo autorizado detendrá esa familia y se revertirá sólo ese delta.
