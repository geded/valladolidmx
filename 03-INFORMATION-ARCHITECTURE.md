# 03-INFORMATION-ARCHITECTURE.md

# Arquitectura de Información
Versión 1.0

## Objetivo

Definir la estructura completa de navegación para que cualquier visitante siempre sepa dónde está dentro del Oriente Maya de Yucatán.

---

# Principio

La navegación representa un territorio real.

No se navega entre páginas; se navega entre regiones, destinos, categorías, empresas y experiencias.

---

# Jerarquía principal

Inicio

→ Oriente Maya

→ Destinos

→ Categorías

→ Experiencias

→ Hoteles

→ Restaurantes

→ Eventos

→ Arma tu Viaje

→ Alux

→ Empresas

---

# Modelo territorial

Oriente Maya

→ Destino

→ Subcategoría

→ Empresa o Experiencia

Ejemplo:

Oriente Maya

→ Valladolid

→ Restaurantes

→ Restaurante "X"

---

# Micrositios

Cada destino tendrá un micrositio generado desde el CMS.

Cada micrositio podrá mostrar:

- Historia
- Descripción
- Mapa
- Fotografías
- Video
- Qué hacer
- Hoteles
- Restaurantes
- Experiencias
- Eventos
- Artesanías
- Servicios
- Empresas
- Reseñas
- Consejos de Alux

---

# Buscador global

El usuario podrá buscar por:

- nombre
- destino
- categoría
- actividad
- tipo de viajero
- palabra clave

El buscador combinará resultados de todo el Oriente Maya.

---

# Arma tu Viaje

Visible desde:

- Destinos
- Empresas
- Hoteles
- Restaurantes
- Experiencias
- Eventos

Todo elemento podrá agregarse al plan del usuario.

---

# Breadcrumbs

Siempre visibles.

Ejemplo:

Inicio > Oriente Maya > Valladolid > Restaurantes > Restaurante

Nunca deben perder la referencia territorial.

---

# URLs

Ejemplos:

/oriente-maya

/oriente-maya/valladolid

/oriente-maya/valladolid/hoteles

/oriente-maya/valladolid/hoteles/hotel-ejemplo

Las URLs deberán generarse automáticamente desde el CMS.

---

# Menú principal

- Descubre
- Destinos
- Experiencias
- Hoteles
- Restaurantes
- Eventos
- Arma tu Viaje
- Alux
- Empresas
- Iniciar sesión

---

# Navegación móvil

Prioridad:

1. Buscar
2. Destinos
3. Arma tu Viaje
4. Alux
5. Menú

---

# Reglas

- Ningún contenido queda aislado.
- Todo destino enlaza con empresas relacionadas.
- Todo producto pertenece a un destino.
- Toda empresa pertenece al menos a un destino y una categoría.
- Todo se genera desde el CMS.

---

# Criterios de aceptación

- El usuario siempre conoce dónde está.
- Puede cambiar de destino sin perder contexto.
- Puede buscar cualquier elemento desde un buscador único.
- Puede agregar cualquier elemento a Arma tu Viaje.
- La estructura SEO coincide con la navegación.
