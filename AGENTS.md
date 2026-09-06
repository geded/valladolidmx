# Valladolid.mx · Reglas vinculantes para agentes

Estas reglas aplican a Codex, Lovable y a cualquier agente que modifique este repositorio.
La autoridad completa es `docs/blueprint/19.47-PREMIUM-TEMPLATE-PRESERVATION-AND-EVOLUTION-POLICY-v1.0.md`.

## Jerarquía obligatoria

Antes de proponer o modificar una superficie, respetar en este orden:

1. CANON y configuración de marca vigente en el CMS.
2. Plantilla Premium aprobada de la familia.
3. Componentes compartidos y sistema visual OMXDS.
4. Contenido, enlaces, medios y visibilidad guardados en CMS/Experience Builder.
5. Patrones de usabilidad de referentes turísticos; nunca su identidad visual.

## Preservación

- Una plantilla aprobada es una autoridad, no un punto de partida descartable.
- “Corregir”, “mejorar”, “conectar”, “agregar” o “continuar” no autorizan rediseño.
- Modificar el componente aprobado; no crear superficies `V2`, `New`, paralelas o fallbacks visuales.
- Constructor, preview y ruta pública deben resolver la misma autoridad de render por familia.
- No reemplazar configuración CMS válida con fixtures, presets, demos o contenido codificado.
- No importar ramas históricas completas. Recuperar sólo el cambio mínimo acreditado.
- Preservar diseño, orden, responsive, marca, breadcrumb, mapas, Alux, Mi Viaje, header y footer salvo autorización explícita que nombre el elemento.

## Protocolo previo a cambios

1. Identificar familia, ruta pública, preview, preset, contrato, renderer y fuente CMS.
2. Comparar la plantilla completa con su autoridad aprobada en desktop, tablet y móvil.
3. Clasificar la solicitud: corrección, mejora, extensión o rediseño.
4. Declarar archivos autorizados y superficies que deben permanecer invariantes.
5. Implementar el delta mínimo sobre la autoridad existente.
6. Ejecutar gates completos y regresión visual de la plantilla entera y superficies compartidas.

Un rediseño exige autorización Founder explícita, maqueta previa y aceptación visual humana. Si el alcance es ambiguo o un cambio colateral altera otra sección, detenerse y reportar.

## Dos gates independientes

Una autorización de archivo no acredita preservación del producto. Todo cambio debe superar ambos controles:

1. **Scope Gate:** acredita que la operación y los archivos fueron autorizados.
2. **Preservation Gate:** acredita que la autoridad aprobada y sus invariantes visuales, funcionales y editoriales no sufrieron regresiones fuera del delta autorizado.

Un PASS del Scope Gate nunca sustituye al Preservation Gate. Si no existe evidencia comparable de la plantilla completa, el cambio visual queda bloqueado.

## Referentes de experiencia

Airbnb, Tripadvisor y Google Travel son referencias de claridad, confianza, descubrimiento, navegación y conversión. No autorizan copiar su marca ni uniformar Valladolid.mx. La identidad final debe seguir siendo Oriente Maya de Yucatán y la marca configurada en el CMS.

## Historia Lovable

No reescribir historial publicado, no hacer force-push y no eliminar la rama de integración. Los commits enviados a la rama conectada deben quedar funcionales y trazables.
