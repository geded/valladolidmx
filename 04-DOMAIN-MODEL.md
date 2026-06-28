# 04-DOMAIN-MODEL.md

# Modelo de Dominio
Versión 1.0

## Objetivo

Definir las entidades principales de la plataforma y cómo se relacionan entre sí.

---

# Entidades principales

## Región
Representa un territorio turístico.

Atributos:
- Nombre
- Descripción
- Imagen principal
- SEO

Tiene muchos Destinos.

---

## Destino

Ejemplo: Valladolid.

Atributos:
- Nombre
- Historia
- Coordenadas
- Galería
- Video
- Mapa
- SEO

Tiene:
- Hoteles
- Restaurantes
- Experiencias
- Eventos
- Empresas

---

## Categoría

Ejemplos:
- Hotel
- Restaurante
- Cenote
- Museo
- Artesanía
- Tour
- Transporte

---

## Empresa

Atributos:
- Datos generales
- Contacto
- Ubicación
- Horarios
- Redes sociales
- Galería
- Video
- Servicios
- Plan de visibilidad
- Estado de verificación

Pertenece a uno o más destinos y categorías.

---

## Producto / Experiencia

Representa aquello que el visitante puede descubrir o agregar a "Arma tu Viaje".

Puede pertenecer a una empresa.

---

## Usuario

Tipos:
- Visitante
- Registrado
- Empresa
- Concierge
- Administrador

---

## Perfil del viajero

Guarda:
- Idioma
- Preferencias
- Tipo de viaje
- Presupuesto
- Intereses
- Historial

---

## Arma tu Viaje

Contiene:
- Destinos
- Hoteles
- Restaurantes
- Experiencias
- Eventos
- Notas
- Fechas

Estados:
- Borrador
- Solicitado
- En revisión
- Cotizado
- Confirmado
- Finalizado

---

## Concierge

Recibe expedientes creados desde Arma tu Viaje.

Puede:
- Editar
- Cotizar
- Comentar
- Dar seguimiento

---

## Alux

Entidad lógica que:
- Analiza preferencias
- Genera recomendaciones
- Resume reseñas
- Prepara expedientes
- Sugiere rutas

---

## Reseña

Atributos:
- Calificación
- Comentario
- Idioma
- Fecha
- Fotos
- Respuesta empresa
- Verificada

---

## Plan de Visibilidad

Tipos sugeridos:
- Gratuito
- Profesional
- Premium
- Aliado Regional

Incluye beneficios y métricas.

---

# Relaciones

Región
└── Destinos

Destino
├── Empresas
├── Productos
├── Eventos

Empresa
├── Productos
├── Promociones
├── Reseñas

Usuario
└── Arma tu Viaje

Arma tu Viaje
└── Concierge

Alux
↔ Usuario
↔ Arma tu Viaje
↔ Empresas

---

# Reglas

- Todo contenido pertenece a una entidad.
- No existen elementos huérfanos.
- Todo producto pertenece al menos a un destino.
- Toda empresa tiene propietario.
- Todo viaje pertenece a un usuario.

---

# Criterios de aceptación

El modelo debe permitir crecer sin modificar la estructura principal y soportar nuevas regiones, categorías y empresas.
