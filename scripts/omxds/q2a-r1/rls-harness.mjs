/**
 * G8-Q2A-R1 · Arnés empírico de RLS, ACL, idempotencia y rollback.
 *
 * Levanta un clúster PostgreSQL efímero LOCAL (nunca la base compartida),
 * aplica las migraciones reales de Q2A y Q2A-R1 sobre un esqueleto mínimo de
 * dependencias, y prueba empíricamente los ocho sujetos autorizados.
 *
 * Reglas vinculantes:
 *  - No crea usuarios ni modifica roles en la base compartida.
 *  - No ejecuta rollback contra la base compartida.
 *  - Si el clúster no inicia, el arnés falla (STOP) en lugar de simular.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// PostgreSQL se niega a ejecutarse como root. Cuando el arnés arranca con uid 0
// se reejecuta a sí mismo con un uid sin privilegios, sin tocar la base compartida.
if (typeof process.getuid === "function" && process.getuid() === 0) {
  const child = spawnSync(
    "setpriv",
    ["--reuid=1000", "--regid=1000", "--clear-groups", process.argv[0], ...process.argv.slice(1)],
    { stdio: "inherit", cwd: process.cwd(), env: process.env },
  );
  process.exit(child.status ?? 1);
}


const ROOT = process.cwd();
const Q2A = "supabase/migrations/20260828072703_77c7df42-9a22-4568-ac6a-dddfd53c178e.sql";
const R1 = fs
  .readdirSync(path.join(ROOT, "supabase/migrations"))
  .filter((f) => f.startsWith("20260828145637"))
  .map((f) => `supabase/migrations/${f}`)[0];

if (!R1) throw new Error("Q2A-R1 migration file not found");

const CLUSTER = path.join(os.tmpdir(), "omxds-q2a-r1-cluster");
const PORT = "55437";
const results = { subjects: {}, checks: {}, acl: {}, fingerprints: {} };

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function sql(query, { db = "omxds", expectFail = false } = {}) {
  const r = run("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-Atq", "-h", os.tmpdir(), "-p", PORT, "-U", "postgres", "-d", db, "-c", query], {
    env: { ...process.env, PGPASSWORD: "" },
  });
  if (r.code !== 0 && !expectFail) throw new Error(`SQL failed: ${query.slice(0, 120)}\n${r.err}`);
  return r;
}

function sqlFile(file, { expectFail = false } = {}) {
  const r = run("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-q", "-h", os.tmpdir(), "-p", PORT, "-U", "postgres", "-d", "omxds", "-1", "-f", path.join(ROOT, file)]);
  if (r.code !== 0 && !expectFail) throw new Error(`Migration failed: ${file}\n${r.err}`);
  return r;
}

function stop() {
  run("pg_ctl", ["-D", CLUSTER, "-m", "immediate", "stop"]);
}

// ---------------------------------------------------------------- bootstrap
fs.rmSync(CLUSTER, { recursive: true, force: true });
const init = run("initdb", ["-D", CLUSTER, "-U", "postgres", "--auth=trust", "-E", "UTF8"]);
if (init.code !== 0) {
  console.error(init.err || init.out);
  throw new Error("STOP: el clúster efímero no pudo inicializarse");
}
const start = run("pg_ctl", ["-D", CLUSTER, "-o", `-p ${PORT} -k ${os.tmpdir()} -c listen_addresses=`, "-w", "-l", path.join(CLUSTER, "log"), "start"]);
if (start.code !== 0) {
  console.error(fs.existsSync(path.join(CLUSTER, "log")) ? fs.readFileSync(path.join(CLUSTER, "log"), "utf8") : start.err);
  throw new Error("STOP: el clúster efímero no arrancó");
}

try {
  sql("CREATE DATABASE omxds", { db: "postgres" });

  // Esqueleto mínimo: roles de plataforma, helpers y tablas padre.
  const BASE = `
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;

CREATE TYPE app_role AS ENUM ('traveler','business_owner','concierge','editor','admin','super_admin','concierge_lead');
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role app_role NOT NULL, PRIMARY KEY (user_id, role));
CREATE TABLE public.role_permissions (role app_role NOT NULL, permission text NOT NULL, PRIMARY KEY (role, permission));
INSERT INTO public.role_permissions (role, permission) VALUES ('admin','poi.write'),('editor','poi.write');

CREATE OR REPLACE FUNCTION public.is_editor_or_admin(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('editor','admin','super_admin'));
$fn$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  );
$fn$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $fn$;

CREATE TYPE content_status AS ENUM ('draft','in_review','approved','published','archived');
CREATE TABLE public.destinations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug citext UNIQUE, name text);
CREATE TABLE public.businesses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text);
CREATE TABLE public.events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text);
CREATE TABLE public.media_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storage_path text);

CREATE TABLE public.points_of_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid REFERENCES public.destinations(id),
  slug citext NOT NULL,
  name text NOT NULL,
  description text,
  status content_status NOT NULL DEFAULT 'draft',
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.points_of_interest TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_of_interest TO authenticated;
GRANT ALL ON public.points_of_interest TO service_role;
ALTER TABLE public.points_of_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poi_public_read" ON public.points_of_interest FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "geo editor manage poi" ON public.points_of_interest FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "poi_perm_write" ON public.points_of_interest FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'poi.write')) WITH CHECK (public.has_permission(auth.uid(),'poi.write'));
GRANT SELECT ON public.destinations, public.products, public.events, public.media_assets TO anon, authenticated;
`;
  sql(BASE);

  // ------------------------------------------------------- up Q2A + up R1
  sqlFile(Q2A);
  results.checks.q2a_up = "PASS";

  const fingerprint = () => {
    const q = `
      SELECT md5(string_agg(line, E'\\n' ORDER BY line)) FROM (
        SELECT c.relname||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull AS line
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        WHERE n.nspname='public' AND (c.relname LIKE 'place\\_%' OR c.relname='points_of_interest')
        UNION ALL
        SELECT 'policy:'||c.relname||':'||pol.polname||':'||pg_get_expr(pol.polqual,pol.polrelid)
        FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND (c.relname LIKE 'place\\_%' OR c.relname='points_of_interest')
        UNION ALL
        SELECT 'acl:'||c.relname||':'||coalesce((SELECT string_agg(x, ',' ORDER BY x) FROM unnest(c.relacl::text[]) AS t(x)),'-')
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname LIKE 'place\\_%' AND c.relkind='r'
        UNION ALL
        SELECT 'proc:'||p.proname||':'||p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND (p.proname LIKE 'place\\_%' OR p.proname LIKE 'admin\\_%place%')
      ) s`;
    return sql(q).out;
  };

  const afterQ2A = fingerprint();
  // Reaplicación de Q2A dentro de una transacción: acredita ausencia de divergencia.
  const replayQ2A = sqlFile(Q2A, { expectFail: true });
  const afterReplayQ2A = fingerprint();
  results.checks.q2a_replay_exit = replayQ2A.code;
  results.checks.q2a_replay_no_divergence = afterQ2A === afterReplayQ2A ? "PASS" : "FAIL";
  results.checks.q2a_replay_note =
    replayQ2A.code === 0
      ? "reaplicación idempotente"
      : "reaplicación abortada en transacción única (objetos ya existentes) sin divergencia de schema";

  sqlFile(R1);
  results.checks.r1_up = "PASS";
  const afterR1 = fingerprint();
  const replayR1 = sqlFile(R1, { expectFail: true });
  const afterReplayR1 = fingerprint();
  results.checks.r1_replay_exit = replayR1.code;
  results.checks.r1_idempotent = replayR1.code === 0 && afterR1 === afterReplayR1 ? "PASS" : "FAIL";
  results.fingerprints = { afterQ2A, afterR1 };

  // ---------------------------------------------------------- datos sintéticos
  sql(`
    INSERT INTO public.destinations (id, slug, name) VALUES ('11111111-1111-4111-8111-111111111111','sintetico','Destino sintético');
    INSERT INTO public.products (id, name) VALUES ('22222222-2222-4222-8222-222222222222','Producto sintético');
    INSERT INTO public.events (id, title) VALUES ('33333333-3333-4333-8333-333333333333','Evento sintético');
    INSERT INTO public.media_assets (id, storage_path) VALUES ('44444444-4444-4444-8444-444444444444','sintetico.jpg');
    INSERT INTO public.points_of_interest (id, destination_id, slug, name, status)
      VALUES ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','lugar-publicado','Lugar publicado sintético','published'),
             ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111','lugar-borrador','Lugar borrador sintético','draft');
    INSERT INTO public.place_products (place_id, product_id, relation_kind)
      VALUES ('55555555-5555-4555-8555-555555555555','22222222-2222-4222-8222-222222222222','oficial');
    INSERT INTO public.place_events (place_id, event_id, relation_kind)
      VALUES ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','sede');
    INSERT INTO public.place_authorities (place_id, authority_kind_id, authority_name, is_primary)
      SELECT '55555555-5555-4555-8555-555555555555', id, 'Autoridad sintética', true FROM public.place_authority_kinds WHERE slug='autoridad-federal';
  `);

  // ------------------------------------------------------------- 8 sujetos
  const SUBJECTS = [
    ["anon", "anon", null, []],
    ["traveler", "authenticated", "aaaaaaa1-0000-4000-8000-000000000001", ["traveler"]],
    ["business_owner", "authenticated", "aaaaaaa1-0000-4000-8000-000000000002", ["business_owner"]],
    ["concierge", "authenticated", "aaaaaaa1-0000-4000-8000-000000000003", ["concierge"]],
    ["editor", "authenticated", "aaaaaaa1-0000-4000-8000-000000000004", ["editor"]],
    ["admin", "authenticated", "aaaaaaa1-0000-4000-8000-000000000005", ["admin"]],
    ["super_admin", "authenticated", "aaaaaaa1-0000-4000-8000-000000000006", ["super_admin"]],
    ["service_role", "service_role", null, []],
  ];
  for (const [, , uid, roles] of SUBJECTS) {
    for (const role of roles) sql(`INSERT INTO public.user_roles (user_id, role) VALUES ('${uid}','${role}') ON CONFLICT DO NOTHING`);
  }

  const PROBES = [
    ["read_place_types", "SELECT count(*) FROM public.place_types"],
    ["read_published_place", "SELECT count(*) FROM public.points_of_interest WHERE status='published'"],
    ["read_draft_place", "SELECT count(*) FROM public.points_of_interest WHERE status='draft'"],
    ["read_place_products", "SELECT count(*) FROM public.place_products"],
    ["read_place_events", "SELECT count(*) FROM public.place_events"],
    ["read_place_authorities", "SELECT count(*) FROM public.place_authorities"],
    ["write_place_hours", "INSERT INTO public.place_hours (place_id, day_of_week, is_closed) VALUES ('55555555-5555-4555-8555-555555555555', 1, false)"],
    ["write_place_products", "INSERT INTO public.place_products (place_id, product_id, relation_kind) VALUES ('66666666-6666-4666-8666-666666666666','22222222-2222-4222-8222-222222222222','ofrecido')"],
    ["write_place_authorities", "INSERT INTO public.place_authorities (place_id, authority_kind_id, authority_name) SELECT '66666666-6666-4666-8666-666666666666', id, 'x' FROM public.place_authority_kinds LIMIT 1"],
    ["exec_duplicate_warnings", "SELECT count(*) FROM public.place_duplicate_warnings('Lugar borrador sintético')"],
  ];

  for (const [name, dbRole, uid] of SUBJECTS) {
    const row = {};
    for (const [probe, statement] of PROBES) {
      const claim = uid ? `SET LOCAL request.jwt.claim.sub = '${uid}';` : "";
      const r = sql(`BEGIN; SET LOCAL ROLE ${dbRole}; ${claim} ${statement}; ROLLBACK;`, { expectFail: true });
      if (r.code !== 0) row[probe] = "DENEGADO";
      else if (statement.startsWith("SELECT count")) row[probe] = `filas=${r.out.split("\n").filter(Boolean).pop()}`;
      else row[probe] = "PERMITIDO";
    }
    results.subjects[name] = row;
  }

  // ---------------------------------------------------------------- ACL final
  const acl = sql(
    `SELECT c.relname||' => '||coalesce(array_to_string(c.relacl,' | '),'-') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname LIKE 'place\\_%' ORDER BY 1`,
  ).out;
  results.acl.effective = acl.split("\n");
  results.acl.no_anon_on_authorities = /place_authorities => (?!.*anon=)/.test(acl) ? "PASS" : "FAIL";

  // ACL amplio no elude RLS: se prueba con un rol con todos los privilegios de tabla.
  sql(`CREATE ROLE broad_acl NOLOGIN; GRANT USAGE ON SCHEMA public TO broad_acl; GRANT ALL ON public.points_of_interest TO broad_acl;`);
  const broad = sql(`BEGIN; SET LOCAL ROLE broad_acl; SELECT count(*) FROM public.points_of_interest; ROLLBACK;`, { expectFail: true });
  // El rol tiene ACL total sobre la tabla y aun así RLS le devuelve cero filas:
  // ninguna política lo nombra. El ACL amplio no elude la RLS.
  results.checks.broad_acl_does_not_bypass_rls =
    broad.code === 0 && broad.out.split("\n").filter(Boolean).pop() === "0" ? "PASS" : `FAIL(${broad.code}:${broad.out})`;

  // ------------------------------------------------------- rollback operativo
  const ROLLBACK_R1 = `
DROP TABLE IF EXISTS public.place_products;
DROP TABLE IF EXISTS public.place_events;
ALTER TABLE public.points_of_interest
  DROP CONSTRAINT IF EXISTS poi_admission_kind_code,
  DROP CONSTRAINT IF EXISTS poi_price_range_coherent,
  DROP CONSTRAINT IF EXISTS poi_social_links_object,
  DROP CONSTRAINT IF EXISTS poi_contact_email_shape,
  DROP CONSTRAINT IF EXISTS poi_contact_website_shape,
  DROP COLUMN IF EXISTS directions,
  DROP COLUMN IF EXISTS admission_kind,
  DROP COLUMN IF EXISTS price_to,
  DROP COLUMN IF EXISTS contact_whatsapp,
  DROP COLUMN IF EXISTS social_links,
  DROP COLUMN IF EXISTS published_at;
`;
  const poisBefore = sql("SELECT count(*) FROM public.points_of_interest").out;
  sql(ROLLBACK_R1);
  const poisAfterRollback = sql("SELECT count(*) FROM public.points_of_interest").out;
  results.checks.rollback_r1 = "PASS";
  results.checks.rollback_r1_preserves_places = poisBefore === poisAfterRollback ? "PASS" : "FAIL";
  sqlFile(R1);
  results.checks.rollback_r1_reapply = "PASS";

  const ROLLBACK_Q2A = `
DROP TABLE IF EXISTS public.place_products, public.place_events, public.place_authorities,
  public.place_media, public.place_hours, public.place_category_links CASCADE;
ALTER TABLE public.points_of_interest DROP COLUMN IF EXISTS place_type_id;
DROP TABLE IF EXISTS public.place_types, public.place_categories, public.place_authority_kinds CASCADE;
DROP POLICY IF EXISTS "poi_staff_write" ON public.points_of_interest;
CREATE POLICY "geo editor manage poi" ON public.points_of_interest FOR ALL TO authenticated
  USING (public.is_editor_or_admin(auth.uid())) WITH CHECK (public.is_editor_or_admin(auth.uid()));
CREATE POLICY "poi_perm_write" ON public.points_of_interest FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(),'poi.write')) WITH CHECK (public.has_permission(auth.uid(),'poi.write'));
`;
  sql(ROLLBACK_Q2A);
  const finalPois = sql("SELECT count(*) FROM public.points_of_interest").out;
  const finalPolicies = sql("SELECT count(*) FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid WHERE c.relname='points_of_interest'").out;
  results.checks.rollback_q2a = "PASS";
  results.checks.rollback_q2a_preserves_places = finalPois === poisBefore ? "PASS" : "FAIL";
  results.checks.rollback_q2a_restores_policies = finalPolicies === "3" ? "PASS" : `FAIL(${finalPolicies})`;
} finally {
  stop();
  fs.rmSync(CLUSTER, { recursive: true, force: true });
}

// --------------------------------------------------------------- adjudicación
const expected = {
  anon: { read_draft_place: "filas=0", read_place_authorities: "DENEGADO", write_place_hours: "DENEGADO", exec_duplicate_warnings: "DENEGADO" },
  traveler: { read_draft_place: "filas=0", read_place_authorities: "filas=0", write_place_hours: "DENEGADO", exec_duplicate_warnings: "DENEGADO" },
  business_owner: { read_draft_place: "filas=0", write_place_products: "DENEGADO", exec_duplicate_warnings: "DENEGADO" },
  concierge: { read_draft_place: "filas=0", write_place_authorities: "DENEGADO", exec_duplicate_warnings: "DENEGADO" },
  editor: { read_draft_place: "filas=1", write_place_hours: "PERMITIDO", write_place_authorities: "PERMITIDO" },
  admin: { read_draft_place: "filas=1", write_place_products: "PERMITIDO", exec_duplicate_warnings: "filas=1" },
  super_admin: { read_draft_place: "filas=1", write_place_hours: "PERMITIDO", exec_duplicate_warnings: "filas=1" },
  service_role: { read_draft_place: "filas=1", write_place_hours: "PERMITIDO" },
};

const failures = [];
for (const [subject, probes] of Object.entries(expected)) {
  for (const [probe, want] of Object.entries(probes)) {
    const got = results.subjects[subject]?.[probe];
    if (got !== want) failures.push(`${subject}.${probe}: esperado ${want}, obtenido ${got}`);
  }
}
for (const [key, value] of Object.entries(results.checks)) {
  if (typeof value === "string" && value.startsWith("FAIL")) failures.push(`${key}: ${value}`);
}
if (results.acl.no_anon_on_authorities !== "PASS") failures.push("place_authorities expuesta a anon");

results.result = failures.length === 0 ? "PASS" : "FAIL";
results.failures = failures;
results.migrations = { q2a: Q2A, r1: R1, q2a_sha256: createHash("sha256").update(fs.readFileSync(path.join(ROOT, Q2A))).digest("hex"), r1_sha256: createHash("sha256").update(fs.readFileSync(path.join(ROOT, R1))).digest("hex") };

console.log(JSON.stringify(results, null, 2));
if (failures.length > 0) process.exit(1);
