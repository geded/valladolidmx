## E5 · Perfil Público del Viajero (v2.5, Programa A, Carril A)

Perfil público opt-in en `/viajero/:handle` con handle elegido por el viajero. V1 minimalista: identidad básica (nombre, avatar, país, idiomas). Base para futuros Trust Signals sin comprometer privacidad.

### Historias (4)

**US-E5.1 · Migración: handle + visibilidad**
- Añadir a `traveler_profiles`: `public_handle text unique`, `is_public boolean default false`, `public_display_name text`, `public_bio text` (200 char), `avatar_url text`.
- Índice único case-insensitive (`lower(public_handle)`).
- Trigger de validación: handle 3–24 chars, `^[a-z0-9_]+$`, lista de reservados (`admin`, `staff`, `alux`, `valladolid`, etc.).
- RLS: policy pública `TO anon` SELECT sólo columnas seguras cuando `is_public = true` (vía RPC `get_public_traveler_profile`, no SELECT directo).
- GRANT `SELECT` mínimo + `EXECUTE` a `anon`/`authenticated` sobre la RPC.

**US-E5.2 · Server fns + validaciones**
- `checkHandleAvailability({ handle })` — pública, rate-limitable.
- `updatePublicProfile` (protegida, `requireSupabaseAuth`) — handle, display_name, bio, is_public.
- `getPublicTravelerProfile({ handle })` — pública vía server publishable client + RPC.
- Zod schemas compartidos con reglas del trigger para feedback inmediato.

**US-E5.3 · Superficie pública `/viajero/:handle`**
- Ruta pública SSR con `head()` dinámico (title `@handle · Viajero en Valladolid`, description desde bio, `robots: noindex` si `!is_public`).
- Componente `TravelerPublicProfileSurface` usando Discovery Layer (PublicShell). Renderiza:
  - Avatar + nombre público + `@handle`
  - Chips: home_country (bandera), idiomas
  - Bio corta si existe
  - Estado vacío elegante si `!is_public` → 404 semántico con `notFound()`.
- OG image: usar avatar cuando existe; omitir de lo contrario (regla del blueprint).
- Zero business logic nueva: reusa cards/tokens del DSL colonial.

**US-E5.4 · Panel de gestión en `/cuenta`**
- Nueva pestaña "Perfil público" en `/cuenta` (dentro del Workspace autenticado, no Discovery).
- Form con: toggle `is_public`, campo handle (con `checkHandleAvailability` debounced), display_name, bio, upload de avatar (Supabase Storage bucket `avatars`, ya existe o crearlo si falta — verificar en implementación).
- CTA "Ver mi perfil público" → `Link to /viajero/:handle` cuando `is_public`.
- Aviso claro: "Tu perfil es privado por defecto. Actívalo cuando quieras compartir."

### Decisiones fijadas
- Visibilidad: privada por defecto (opt-in explícito).
- URL: `/viajero/:handle` elegido por el usuario, unicidad case-insensitive.
- V1 no muestra: intereses, favoritos, plan de viaje. Se reservan para épicas posteriores (E5.5+ o Trust Signals) con sus propios toggles granulares.

### Reglas
- Cero infra nueva: reusa `traveler_profiles`, PublicShell, Workspace Engine, Storage.
- Navegación pública respeta Navigation Blueprint (nueva rama `/viajero/*` fuera del árbol `/oriente-maya/*`, coexiste).
- Loader público llama server fn pública (no `requireSupabaseAuth`) — cumple regla SSR/prerender.
- Completion Report + Demo Pack (≥3 handles sembrados con perfiles públicos realistas) + Product Changelog al cierre.

### Detalles técnicos
- Migración en una sola llamada: CREATE columns + índice + trigger de validación + RPC `get_public_traveler_profile(text) RETURNS jsonb` (SECURITY DEFINER, `SET search_path = public`) + GRANT + policy anon.
- Handle en minúsculas persistido; UI acepta mayúsculas y las normaliza.
- Reservados almacenados en función, no en tabla, para v1.
- 4 archivos nuevos aprox: `traveler-public.functions.ts`, `src/routes/viajero.$handle.tsx`, `src/components/traveler/PublicProfileForm.tsx`, `src/components/surfaces/TravelerPublicProfileSurface.tsx`.

### Orden de entrega
US-E5.1 → US-E5.2 → US-E5.3 → US-E5.4. Cada historia con typecheck + build + smoke + Completion Report antes de la siguiente.