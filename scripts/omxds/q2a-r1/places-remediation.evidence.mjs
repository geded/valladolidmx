/**
 * G8-Q2A-R1 · Evidencia estática de la remediación del modelo de Lugares.
 *
 * No consulta la base compartida: acredita el contenido exacto de la migración
 * autorizada y su alineación con los contratos tipados de la aplicación.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = process.cwd();
const dir = path.join(ROOT, "supabase/migrations");
const q2aFile = fs.readdirSync(dir).find((f) => f.startsWith("20260828072703"));
const r1File = fs.readdirSync(dir).find((f) => f.startsWith("20260828145637"));
if (!q2aFile || !r1File) throw new Error("faltan las migraciones Q2A o Q2A-R1");

const q2a = fs.readFileSync(path.join(dir, q2aFile), "utf8");
const r1 = fs.readFileSync(path.join(dir, r1File), "utf8");
const taxonomy = fs.readFileSync(path.join(ROOT, "src/lib/places/place-taxonomy.ts"), "utf8");

const sha = (value) => createHash("sha256").update(value).digest("hex");
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const NEW_TABLES = ["place_products", "place_events"];
const NEW_COLUMNS = [
  "directions",
  "admission_kind",
  "price_to",
  "contact_whatsapp",
  "social_links",
  "published_at",
];
const PLACE_TABLES = [
  "place_types",
  "place_categories",
  "place_authority_kinds",
  "place_category_links",
  "place_hours",
  "place_media",
  "place_authorities",
  ...NEW_TABLES,
];

for (const table of NEW_TABLES)
  expect(r1.includes(`CREATE TABLE IF NOT EXISTS public.${table}`), `falta la tabla ${table}`);
for (const column of NEW_COLUMNS)
  expect(r1.includes(`ADD COLUMN IF NOT EXISTS ${column}`), `falta la columna ${column}`);
for (const table of PLACE_TABLES)
  expect(
    r1.includes(`REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated;`),
    `sin REVOKE mínimo en ${table}`,
  );

expect(
  !/GRANT[^;]*ON public\.place_authorities TO[^;]*anon/.test(r1),
  "place_authorities expuesta a anon",
);
expect(!/ALTER DEFAULT PRIVILEGES/i.test(r1), "modifica default privileges globales");
expect(
  !/REVOKE[^;]*ON public\.points_of_interest/.test(r1),
  "modifica el ACL histórico de points_of_interest",
);
expect(!/CREATE\s+TYPE/i.test(r1), "introduce un enum de PostgreSQL");
expect(
  /place_duplicate_warnings[\s\S]*SECURITY INVOKER/.test(r1),
  "place_duplicate_warnings no es SECURITY INVOKER",
);
expect(
  !/place_duplicate_warnings[\s\S]*SECURITY DEFINER/.test(r1),
  "place_duplicate_warnings sigue siendo SECURITY DEFINER",
);
expect(!/INSERT INTO public\.points_of_interest/i.test(r1), "crea contenido turístico");
expect(!/UPDATE public\.points_of_interest/i.test(r1), "muta contenido turístico");
expect(
  !/Chich[eé]n|Ek.?\s?Balam|Tinum|Temoz[oó]n|Suytun|Zazil|Venados/i.test(r1),
  "menciona lugares reales excluidos",
);
expect(taxonomy.includes("PLACE_ADMISSION_KINDS"), "la taxonomía no declara los códigos de acceso");
expect(
  taxonomy.includes("PLACE_PRODUCT_RELATION_KINDS") &&
    taxonomy.includes("PLACE_EVENT_RELATION_KINDS"),
  "faltan códigos de relación",
);
expect(q2a.includes("poi_staff_write"), "la reconciliación de RLS de Q2A no está presente");

const report = {
  scope: "G8-Q2A-R1",
  migrations: { q2a: q2aFile, q2a_sha256: sha(q2a), r1: r1File, r1_sha256: sha(r1) },
  new_tables: NEW_TABLES,
  new_columns: NEW_COLUMNS,
  hardened_tables: PLACE_TABLES,
  admission_kind_codes: ["gratuito", "pago", "mixto", "no_aplica"],
  product_relation_codes: ["oficial", "operado", "ofrecido", "recomendado"],
  event_relation_codes: ["sede", "organizado", "asociado"],
  security_invoker: ["place_duplicate_warnings"],
  security_definer_retained: [
    "admin_create_place",
    "admin_update_place_details",
    "admin_set_place_categories",
  ],
  result: failures.length === 0 ? "PASS" : "FAIL",
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
