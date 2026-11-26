# Identidad del acceso · 2026-11-26

## Alcance
Revisión solicitada de métodos de acceso e identidad visible; sin cambiar autenticación, proveedores, permisos, publicación ni plantillas.

## Evidencia
- El sitio publicado tiene audiencia pública, comprobada con la configuración de publicación. Esta audiencia es independiente de la privacidad del proyecto/editor.
- Solo dos puntos llaman `lovable.auth.signInWithOAuth`: `/auth` y `SignInPromptSheet`; ambos pasan literalmente `google`. Ninguno ofrece iniciar sesión con el proveedor Lovable.
- `/auth` ofrece Google, correo y contraseña; el aviso compartido también ofrece enlace por correo. El módulo interno de integración no implica un método de acceso Lovable para visitantes.
- En Chromium con tamaño móvil 390 × 844, el acceso publicado mostró la marca Valladolid, Google y correo, sin texto Lovable.
- Al pulsar Google en el sitio publicado, el navegador llegó a `accounts.google.com/v3/signin/identifier` y mostró «to continue to quehacerenvalladolid.com», sin texto Lovable. No se introdujeron credenciales ni se certificó la pantalla posterior de consentimiento o el retorno con sesión.
- Taxi y Arma tu Viaje no mostraron texto Lovable durante las visitas públicas. El botón de pedir taxi estaba deshabilitado sin una cotización completa; no se certificó ese flujo de solicitud.
- La primera visita usó el slug inexistente `cafe-copalli`, no la ficha real `copalli-cafe`; no cuenta como verificación de reservas de Copalli.

## Preservación
No se modificó código de producto ni presentación: header, footer, traducción, navegación, CMS, Alux, Mi Viaje, mapas y opciones de acceso permanecen intactos. No se configura un proveedor nuevo ni se desactiva Google.

## Límites y siguiente paso
El alojamiento y parte del código recibido por el navegador pueden investigarse; conocerlos no concede acceso al proyecto/editor ni a sus datos privados. No se promete invisibilidad técnica.

La documentación oficial permite configurar credenciales propias de Google y su pantalla de consentimiento si se desea personalizar esa etapa; no garantiza eliminar el dominio del intermediario en todas las redirecciones. La pantalla observada ya muestra el dominio del sitio, por lo que no se cambió la configuración actual.

«Tipo de proyecto»: falta conocer las opciones exactas que está viendo el Founder. Se pidió captura o lista; no se inventa una etiqueta ni se modifica visibilidad. La configuración recomendada distingue sitio publicado público de proyecto/editor restringido según las opciones del plan.