# Continuidad de origen en autenticación y Alux

## Objetivo
Corregir el flujo existente para que cada llamado a iniciar sesión conserve la superficie desde la que nació y regrese allí después de autenticarse, sin crear navegación ni almacenamiento paralelos.

## Alcance autorizado
- Centralizar la captura del retorno en el acceso existente a `/auth`.
- Aplicarlo a Arma tu Viaje, Alux y al acceso global de cuenta.
- Evitar que `/auth` sobrescriba el rastro público útil.
- Mantener el contexto territorial y la cadena Arma tu Viaje → Alux cuando correspondan.
- Mostrar en autenticación una salida clara hacia la superficie de origen.

## Preservación obligatoria
- Sin cambios visuales fuera de los controles de navegación implicados.
- Preservar plantillas Premium, textos, CMS, header, footer, breadcrumbs territoriales, Alux, Mi Viaje y estados autenticados/anónimos.
- Sin backend, tablas, rutas, providers ni sistemas nuevos.
- Sin publicación ni despliegue.

## Implementación
1. Añadir una utilidad única y validada para registrar/leer el retorno público de autenticación usando el mecanismo existente `vmx.auth.next`.
2. Conectar los enlaces públicos a `/auth` de Arma tu Viaje, Alux y el menú global con esa utilidad.
3. Hacer que la pantalla de acceso use el mismo retorno para volver y para continuar después del inicio de sesión.
4. Proteger el rastro de navegación para que la entrada a autenticación no destruya el origen real.

## Controles
- Scope Gate: sólo archivos de navegación, autenticación y los llamados públicos afectados.
- Preservation Gate: comparar recorrido y presentación en 1440, 834, 430 y 390 px.
- Probar Arma tu Viaje → Alux → crear cuenta → regreso, Alux → crear cuenta → regreso y acceso global → regreso.
- Ejecutar verificación de tipos y comprobar ausencia de desbordes, errores de consola y cambios colaterales.
