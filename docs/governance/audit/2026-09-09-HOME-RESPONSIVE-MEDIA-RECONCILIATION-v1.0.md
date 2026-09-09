# Home Premium · reconciliación responsive y de medios

Fecha: 2026-09-09  
Autorización: PCA-2026-080  
Ruta pública: `/`

## Hallazgo

La revisión posterior a rutas dejó dos regresiones sobre la autoridad Home ya aprobada:

- el Home duplicó una composición rígida de Alux en lugar de consumir la barra responsive compartida;
- campos de medios todavía vacíos en CMS anularon los medios temporales expresamente aprobados para la etapa de construcción.

## Corrección cerrada

- `HomePremiumSurface` vuelve a consumir `PremiumAluxBar`, conservando selección de grupo, apertura de Alux, apariencia clara de Marca y navegación;
- la materialización continúa preservando los valores CMS, incluidos los vacíos;
- el resolver visual usa el medio CMS acreditado cuando existe y, cuando el campo sigue vacío, conserva sólo el fallback incluido en la lista exacta de medios Home aprobados;
- la comparación de esa lista normaliza los metadatos de slot `vmxAlt`, `vmxReview`, naturaleza y punto focal, conservando íntegra la URL configurada por CMS;
- medios conceptuales arbitrarios y demos continúan rechazados;
- `HomePremiumSurface` y `vmx.home.premium-g4` permanecen como autoridad única; no se alteran otras familias.

## Rendimiento PWA

La corrección elimina la implementación duplicada del Alux en el Home y reutiliza el componente compartido. La compilación confirma que el módulo propio del Home permanece separado. Se identifican como deuda transversal, fuera de este cambio quirúrgico, el peso del renderer universal compartido y un precache PWA sin entradas; ambos requieren una intervención posterior específica porque afectan más rutas que `/`.

## Evidencia

- prueba de autoridad Premium y runtime: 33/33 PASS;
- prueba de materialización CMS Home: 5/5 PASS;
- typecheck: PASS;
- build: PASS;
- Governance local: PASS;
- publicación y despliegue: no ejecutados.

La validación visual final se realizará en la vista previa lateral de Lovable después de fusionar, conforme a la operación de construcción autorizada.
