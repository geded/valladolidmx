# Acceso profesional y adaptable

## Objetivo
Armonizar la pantalla existente de autenticación con las fichas Premium de Valladolid.mx, sin crear una superficie paralela ni alterar el flujo de acceso.

## Alcance autorizado
- Reorganizar únicamente la presentación de `/auth`.
- Integrar encabezado, beneficio y formulario en una composición clara y equilibrada.
- Refinar campos, acceso con Google, acción principal y enlaces secundarios.
- Mantener visible y discreto el regreso a la superficie de origen.
- Adaptar la misma composición a 1440, 834, 430 y 390 px.

## Preservación obligatoria
- Conservar marca CMS, encabezado, pie, breadcrumb, Alux y navegación pública.
- Conservar inicio de sesión, creación de cuenta, recuperación, Google y retorno posterior al acceso.
- No modificar backend, datos, rutas, textos administrables ni otras plantillas.
- No publicar ni desplegar.

## Implementación
1. Usar el `PublicShell` y los controles oficiales existentes.
2. Convertir la zona de acceso en una composición Premium compacta: contexto a un lado en escritorio y flujo único en móvil.
3. Sustituir el botón amarillo dominante por la acción oscura y sobria ya aprobada para controles principales.
4. Mejorar altura, foco, jerarquía, mensajes y distribución de los enlaces sin cambiar su función.

## Controles
- Scope Gate: sólo `src/routes/auth.tsx`.
- Preservation Gate: comparación completa de `/auth` en 1440, 834, 430 y 390 px.
- Verificar los tres modos: iniciar sesión, crear cuenta y recuperar contraseña.
- Confirmar un único H1, ausencia de desbordes y errores de consola, navegación de regreso y flujo sin cambios.
