# Cierre transversal OMXDS Visual y Funcional

## Alcance autorizado

Corrección y verificación de las autoridades públicas Premium existentes. No se crearán plantillas, cards, rutas, mapas, Alux ni sistemas paralelos. Commerce C0–C8, Visitor Intelligence CV8, publicación, despliegue, PR y merge quedan fuera de alcance.

## Scope Gate

- Auditar Home, región, destinos, listados, fichas y recomendaciones “Explora cerca de…”.
- Corregir únicamente autoridades compartidas responsables de pérdida de media, baja densidad móvil, acciones sin efecto y repetición del destino en la ruta territorial.
- Mantener marca CMS, estructura Premium, filtros, mapas, Alux, Mi Viaje, favoritos, SEO y URLs.

## Preservation Gate

- Comparar antes/después en 1440, 834, 430 y 390 px.
- Verificar con y sin portada real, navegación global y por destino, fichas y secciones relacionadas.
- Confirmar máximo un Alux visible y conservar su continuidad.
- No sustituir contenido CMS ni inventar imágenes, enlaces o coordenadas.

## Implementación

1. Reproducir Conato 1910 y trazar la cadena completa: lectura pública → DTO → media canónica → perfil → colección relacionada.
2. Inventariar y ejecutar CTAs visibles compartidos: abrir ficha, favorito/Mi Viaje, destino, indicaciones, contacto, mapa, compartir y Alux.
3. Corregir en las autoridades existentes:
   - propagar media canónica cuando exista;
   - usar fallback editorial compacto sólo sin media real;
   - aplicar la variante compacta/lista ya admitida por la card compartida en móvil;
   - conectar acciones soportadas y ocultar o deshabilitar semánticamente las que carezcan de datos;
   - separar el selector territorial del `nav` de breadcrumb para eliminar la lectura duplicada.
4. Revalidar la cobertura de portadas y separar faltantes CMS reales de fallos de resolución.
5. Ejecutar typecheck, lint focalizado, pruebas relevantes, Route Inventory, smoke funcional y Playwright visual/interactivo en los cuatro anchos.
6. Actualizar el mismo Closure Readiness Report con QA de CTAs, resolución de media, armonía responsive, matriz PASS/PENDIENTE/BLOQUEANTE y correcciones exactas.

## Pendiente detectado en móvil (Conato 1910)

- Reducir el alto del marcador sin fotografía en las tarjetas de “Explora cerca de…”.
- Dar respiro lateral al carrusel para que la tarjeta no quede cortada contra el borde.
- Equilibrar la barra inferior: nombre sin truncar y acción principal a escala táctil correcta.
- Corregir el texto truncado del aviso de mapa.

## Criterio de GO

GO sólo si no quedan defectos funcionales o visuales atribuibles a las autoridades compartidas. Los registros que realmente carecen de portada pueden quedar como backlog CMS documentado.
