# G8-Q2A-R1 · Acta de reconciliación del historial de migraciones

**Fecha:** 2026-08-28

## 1. Migración previa `20260828072703_77c7df42-9a22-4568-ac6a-dddfd53c178e.sql`

- **SHA-256 del archivo:** `be5cddd03328860d0b5b8f83ba9c2760b2c2ddc1533bf777f934e5ecaa4d0778`
- **Objetos declarados vs schema efectivo:** coinciden en su totalidad — siete tablas
  `place_*`, dieciséis columnas añadidas a `points_of_interest`, índices, cinco triggers,
  la política `poi_staff_write` (con `poi_public_read` conservada y las dos políticas
  históricas retiradas) y las cuatro funciones administrativas.
- **Reaplicación:** demostrada como **no-op seguro** en clúster efímero (ver
  `rollback-and-idempotency.md`): aborta en transacción única sin divergencia de schema.

## 2. Limitación de acceso al historial protegido

La sesión de base de datos disponible no puede leer
`supabase_migrations.schema_migrations`:

```
ERROR:  permission denied for schema supabase_migrations
```

No se elevaron privilegios ni se manipuló el historial protegido, conforme a la
instrucción del Founder. La acreditación del registro se sustituye por:

1. el SHA-256 del archivo versionado en el repositorio;
2. la comparación objeto a objeto contra el schema efectivo de la base compartida;
3. la prueba de no-op seguro en clúster efímero.

## 3. Registro de Q2A-R1

Q2A-R1 se aplicó **mediante la herramienta canónica de migraciones de la plataforma**,
que creó el archivo `supabase/migrations/20260828145637_97e8e025-3cbf-4722-9b2b-cbfd672a2c57.sql`
(SHA-256 `5ee94ffe0dbc2b689fdb6c017c837eb5ee9c9474c3900ec4e43313e857cb613d`) y lo ejecutó
contra la base compartida.

Respuesta literal de la plataforma conservada como evidencia:

> The migration completed successfully.
> Found 255 linter issues (4 distinct types) in the Supabase project.

El conteo del linter pasó de **256 a 255** hallazgos: la única diferencia es
`place_duplicate_warnings`, que deja de contribuir al hallazgo 0029
(`authenticated_security_definer_function_executable`). Los 255 restantes son
preexistentes y ajenos al alcance de Q2A-R1.
