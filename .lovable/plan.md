# Trust Engine v1 — Arranque: US-G.2 · Lectura pública

**Épica G · Carril A · v2.5 → v3.0**
**Política de elegibilidad aprobada:** A (compra verificada) + B (caso concierge cerrado) + D (visitante declarado bajo protesta). C (check-in físico) queda para v2.

Arranco por **US-G.2** porque desbloquea el render real (US-G.3) sin tocar auth ni composer. Todo se apoya en la tabla `reviews` ya existente (polimórfica por `subject_kind`/`subject_id`, con `status`, `rating`, `body`, `author_user_id`, `moderation_notes`, etc.). Cero infra nueva.

---

## Alcance US-G.2

Servidor público — cero secretos — para alimentar el bloque `vmx.experience.reviews` y cualquier superficie pública (ficha de producto, negocio, destino).

### 1. Backend (server functions públicas)

Archivo nuevo: `src/lib/reviews/public-reads.functions.ts`

- `listPublicReviews({ subjectKind, subjectId, limit?, cursor?, sort? })`
  - Cliente publishable (no `requireSupabaseAuth`, para permitir SSR de rutas públicas).
  - Filtra `status = 'approved'`, proyecta sólo columnas seguras (id, rating, title, body, author_display_name, verified_source, published_at, business_response, business_response_at).
  - Orden: `recent` (default), `highest`, `lowest`, `helpful`.
  - Paginación por cursor (`published_at + id`).
- `getReviewStats({ subjectKind, subjectId })`
  - Devuelve `{ count, average, distribution: {1..5}, verifiedCount }`.
  - Usa RPC `get_review_stats(subject_kind, subject_id)` (creado en migración) para agregarse en DB — evita N+1.

### 2. Migración

- Añadir columnas a `reviews` **si no existen** (verificar primero):
  - `verified_source text` — enum `verified_purchase | managed_visit | verified_visit | declared_visitor`
  - `visit_date date`, `visit_type text`, `weight numeric default 1.0`
  - `business_response text`, `business_response_at timestamptz`, `business_response_by uuid`
  - `helpful_count int default 0`, `report_count int default 0`
- Índice: `(subject_kind, subject_id, status, published_at desc)`
- RPC `get_review_stats(subject_kind text, subject_id uuid)` → agregado con `count / avg / distribución / verified`, `security definer`, `stable`.
- Policy nueva **TO anon**: `SELECT` sólo cuando `status='approved'`. Mantener policies existentes de owner/moderador.
- `GRANT SELECT ON public.reviews TO anon` (proyección se controla en server fn) + `GRANT EXECUTE ON FUNCTION get_review_stats TO anon, authenticated`.

### 3. Cliente / consumo

- **No** cablear todavía el bloque `experience-reviews` (eso es US-G.3). Sólo exponer las server fns con tipos + un smoke que las llame.
- Actualizar `ExperienceReviewsBlock` documentando el punto de mapeo pero sin activarlo (mantener retrocompatibilidad manual).

### 4. Definition of Done

- `bunx tsgo --noEmit` → 0 errores.
- Migración aplicada, RLS + GRANTs verificados con `supabase--read_query`.
- Smoke: llamar `listPublicReviews` y `getReviewStats` para un `subject_kind='product'` conocido → responde `[]` / `count: 0` sin error 401/403.
- Auditoría no-regresión: `/cms/reviews`, `/producto/*`, `/oriente-maya/**` intactas.
- **Demo Pack:** sembrar 3 reseñas approved + 1 pending sobre 1 producto real → validar que anon ve las 3 approved y que stats devuelve `count=3, average` correcto. URLs exactas en el Completion Report.
- Completion Report + Product Changelog v2.0 (nueva entrada Épica G · US-G.2).

### 5. Siguientes olas (no ahora)

- **US-G.3** — Cablear `experience-reviews` a datos reales en `/producto/$slug`.
- **US-G.1** — `ReviewComposer` con flujo estrellas→texto + elegibilidad A/B/D + fricciones antiabuso.
- **US-G.4** — Verificación básica (badge `verified`).
- **US-G.5** — `<TrustBadges>` dinámico.

---

¿Autorizas arrancar US-G.2 con este alcance?
