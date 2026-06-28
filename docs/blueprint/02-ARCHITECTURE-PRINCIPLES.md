# 02-ARCHITECTURE-PRINCIPLES.md

# Architecture Principles
Versión: 1.0

## Objetivo

Definir las reglas arquitectónicas obligatorias para toda la plataforma. Ningún módulo podrá implementarse contradiciendo este documento.

---

# 1. Principios generales

1. La plataforma representa al Oriente Maya de Yucatán, no únicamente a Valladolid.
2. Valladolid es la puerta de entrada del territorio.
3. Todo contenido visible debe ser administrable.
4. El sitio público nunca dependerá de páginas HTML fijas.
5. El contenido se genera dinámicamente desde el CMS.

---

# 2. Arquitectura funcional

La plataforma estará formada por:

- Sitio Público
- CMS
- Panel de Empresas
- Panel Concierge
- Panel Administrador
- Alux Intelligence System
- Arma tu Viaje
- CRM
- Motor de Visibilidad Inteligente

Todos comparten la misma base de datos y el mismo modelo de dominio.

---

# 3. Arquitectura territorial

La navegación siempre respetará la jerarquía:

Oriente Maya
→ Destino
→ Categoría
→ Empresa o Experiencia

Ejemplo:

Inicio
> Oriente Maya
> Valladolid
> Restaurantes
> Restaurante

Las URLs deberán reflejar esta estructura.

---

# 4. CMS First

Todo elemento debe editarse desde el CMS:

- textos
- fotografías
- videos
- banners
- categorías
- destinos
- empresas
- promociones
- SEO
- traducciones
- menú
- páginas informativas

No debe ser necesario modificar código para actualizar contenido.

---

# 5. Arma tu Viaje

Es el eje funcional del producto.

Todo destino, hotel, restaurante, experiencia, evento o servicio podrá agregarse a "Arma tu Viaje".

El módulo no funciona como carrito de compras sino como expediente de planificación.

---

# 6. Alux

Alux es transversal.

Debe estar disponible en cualquier pantalla para:

- responder preguntas
- recomendar
- relacionar destinos
- explicar cultura
- ayudar a planificar
- preparar el expediente para el concierge

Nunca reemplaza al concierge humano.

---

# 7. Empresas

Cada empresa administra:

- perfil
- fotografías
- videos
- promociones
- experiencias
- horarios
- datos de contacto
- SEO
- estadísticas
- plan de visibilidad

---

# 8. Motor de Visibilidad Inteligente

No existen banners invasivos.

La exposición de una empresa dependerá de:

1. relevancia para el viajero
2. compatibilidad con preferencias
3. Índice de Confianza Alux
4. plan contratado

Nunca únicamente del pago.

---

# 9. Diseño

Conservar:

- identidad regional
- hero principal
- navegación territorial
- filosofía de Valladolid.mx
- reseñas

Modernizar:

- UX
- UI
- responsive
- componentes
- rendimiento
- accesibilidad

No copiar literalmente el diseño antiguo.

---

# 10. Escalabilidad

La plataforma deberá permitir incorporar nuevas regiones sin rediseñar el sistema.

El modelo debe soportar múltiples territorios utilizando la misma arquitectura.

---

# 11. Tecnología

Arquitectura prevista:

Frontend:
- Lovable
- PWA

Backend:
- Supabase

IA:
- OpenAI (Alux)

Servicios:
- Google Maps
- Email
- WhatsApp
- Stripe
- Analytics

---

# 12. Reglas para Lovable

- Construir por módulos.
- Reutilizar componentes.
- Evitar duplicación.
- Mantener separación entre contenido y presentación.
- Preparar internacionalización.
- Optimizar para dispositivos móviles.
- Priorizar rendimiento.

---

# Criterios de aceptación

La arquitectura será correcta cuando:

- Todo sea administrable.
- No existan páginas rígidas.
- Arma tu Viaje esté integrado en todo el sitio.
- Alux sea transversal.
- El CMS gobierne el contenido.
- La navegación territorial nunca se pierda.
- El sistema pueda crecer a nuevas regiones sin rediseño.
