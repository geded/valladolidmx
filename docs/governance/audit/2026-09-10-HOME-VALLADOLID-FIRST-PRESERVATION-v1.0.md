# Home · Valladolid como punto de partida — evidencia de preservación v1.0

## Alcance autorizado

El Founder indicó que la primera tarjeta de destinos del Home debe ser siempre Valladolid, para comunicar que Valladolid.mx es el punto de partida para explorar el Oriente Maya de Yucatán.

## Delta aplicado

- `smart-blocks.server.ts` consulta el destino publicado con slug canónico `valladolid` y lo incorpora al corpus acotado de ocho destinos cuando la consulta general no lo contiene.
- `home-premium-real.ts` coloca Valladolid primero y conserva el orden relativo recibido del CMS para todos los destinos restantes.
- El contrato de conexión Premium cubre tanto el orden inverso como el caso en que Valladolid queda fuera del primer lote.

## Invariantes verificables

- La fuente sigue siendo exclusivamente el CMS público y sus reglas de elegibilidad.
- No se codifican títulos, imágenes, descripciones ni tarjetas sustitutas.
- No cambian la plantilla Premium, sus medios, enlaces, diseño responsive ni las demás secciones del Home.
- No se publica ni despliega.

## Resultado esperado

La tarjeta de Valladolid recibe siempre la posición inicial y la etiqueta “Punto de partida”; Ek Balam y los demás destinos mantienen su orden CMS relativo.
