# 07-CMS-ARCHITECTURE.md

# Arquitectura del CMS
Versión 1.0

## Objetivo

Definir un CMS totalmente administrable para que ningún cambio de contenido requiera modificar código.

---

# Principio

El CMS es el corazón de la plataforma.

Todo lo que ve el usuario debe provenir del CMS.

---

# Módulos principales

- Regiones
- Destinos
- Categorías
- Empresas
- Hoteles
- Restaurantes
- Experiencias
- Eventos
- Artesanías
- Servicios
- Rutas
- Promociones
- Banners
- Blog
- Reseñas
- Usuarios
- Concierge
- Alux
- SEO
- Traducciones
- Configuración

---

# Gestión de destinos

Cada destino podrá administrar:

- Historia
- Descripción
- Fotografías
- Video
- Coordenadas
- Mapa
- Horarios
- Clima (integrable)
- Lugares destacados
- SEO
- Galería
- Destinos relacionados

---

# Gestión de empresas

Cada empresa tendrá un panel para editar:

- Datos generales
- Logo
- Portada
- Galería
- Video
- Servicios
- Categorías
- Ubicación
- Horarios
- Contacto
- Redes sociales
- Promociones
- Preguntas frecuentes
- SEO

Todo sujeto a revisión si el administrador lo configura.

---

# Biblioteca multimedia

Administración de:

- Fotografías
- Videos
- Documentos
- Iconos

Con etiquetas y reutilización.

---

# Editor de contenido

Debe permitir:

- Texto enriquecido
- Bloques reutilizables
- Galerías
- Videos
- Botones
- Enlaces
- Mapas

---

# SEO

Cada entidad administrará:

- URL amigable
- Meta título
- Meta descripción
- Open Graph
- Imagen social
- Canonical
- Indexación

---

# Traducciones

Preparado para múltiples idiomas.

Todo texto debe ser traducible.

---

# Menús

Los menús serán administrables.

No estarán codificados.

---

# Página de inicio

La Home será completamente editable.

Podrá cambiar:

- Hero
- Imagen
- Video
- Frases
- Secciones
- Orden
- Destacados
- CTA
- Bloques

---

# Motor de Visibilidad

El CMS administrará:

- Planes
- Beneficios
- Empresas destacadas
- Estadísticas
- Reglas

---

# Reseñas

Moderación de:

- Comentarios
- Respuestas
- Reportes
- Estados

---

# Panel administrador

Dashboard con:

- Usuarios
- Empresas
- Solicitudes
- Viajes creados
- Uso de Alux
- Conversiones
- KPIs
- Alertas

---

# Integración con Alux

El CMS será la principal fuente de conocimiento estructurado para Alux.

Toda modificación importante podrá ser utilizada por la IA para responder mejor.

---

---

# Traducción automática multilenguaje

La plataforma debe manejar contenido multilenguaje desde el CMS.

## Idioma principal

El idioma base de edición será:

- Español

El administrador o empresa editará primero el contenido en español.

## Idiomas automáticos iniciales

Cada cambio publicado en español deberá generar traducción automática a 5 idiomas iniciales:

- Inglés
- Francés
- Alemán
- Italiano
- Portugués

Estos idiomas podrán ampliarse en el futuro.

## Flujo de traducción

Cuando se cree o edite contenido en español:

1. El usuario guarda el contenido.
2. El CMS detecta los campos traducibles.
3. El sistema genera traducciones automáticas.
4. Las traducciones quedan guardadas como versiones editables.
5. El administrador puede revisar, corregir o aprobar traducciones.
6. El sitio público muestra el idioma según preferencia del visitante.

## Campos traducibles

Deben ser traducibles:

- Títulos
- Descripciones
- Historias de destinos
- Servicios
- Promociones
- Experiencias
- Preguntas frecuentes
- Menús
- Banners
- SEO
- Meta títulos
- Meta descripciones
- Textos de botones
- Respuestas frecuentes de Alux cuando dependan de contenido CMS

## Control editorial

Las traducciones automáticas deben poder tener estados:

- Pendiente
- Generada automáticamente
- Revisada
- Aprobada
- Publicada

## Regla crítica

La traducción automática no debe sobrescribir correcciones humanas ya aprobadas sin autorización.

Si el texto base en español cambia, el sistema debe marcar las traducciones existentes como “requiere revisión”.

## SEO multilenguaje

Cada idioma debe tener:

- URL localizada o parámetro de idioma.
- Meta título traducido.
- Meta descripción traducida.
- Open Graph traducido.
- Etiquetas hreflang si aplica.

## Impacto en Alux

Alux debe responder en el idioma del visitante cuando el contenido exista en ese idioma.

Si el contenido solo existe en español, Alux puede traducir la respuesta, pero debe preservar nombres propios, marcas, direcciones y términos culturales mayas.

## Reglas para Lovable

- Diseñar el CMS considerando campos multilenguaje desde el inicio.
- No construir textos fijos en un solo idioma.
- Separar contenido base en español de traducciones.
- Permitir edición manual de cada traducción.
- Preparar integración futura con OpenAI u otro servicio de traducción automática.

# Permisos

Roles:

- Super Administrador
- Administrador
- Editor
- Concierge
- Empresa
- Colaborador

Cada módulo tendrá permisos independientes.

---

# Reglas para Lovable

- Todo debe ser editable.
- Evitar contenido rígido.
- Diseñar formularios reutilizables.
- Soportar crecimiento futuro.
- Preparar API para integraciones.

---

# Criterios de aceptación

El sitio completo puede mantenerse actualizado desde el CMS sin modificar código y cada tipo de usuario administra únicamente la información que le corresponde.


---

# Integraciones Sociales

El CMS administrará las conexiones con las cuentas oficiales de Valladolid.mx.

## APIs soportadas

- Instagram Graph API
- Facebook Graph API

## Configuración

- Cuenta de Instagram
- Página de Facebook
- Tokens de acceso
- Frecuencia de sincronización
- Número de publicaciones
- Publicaciones destacadas
- Asociación de publicaciones con destinos y categorías

Las publicaciones obtenidas por API podrán reutilizarse en la sección "Oriente Maya EN VIVO".
