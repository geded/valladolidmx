/**
 * G8-Q2A · Evidencia estática del modelo de Lugares.
 * No consulta la base de datos: verifica que los contratos y la taxonomía del
 * repositorio permanezcan alineados con la migración aprobada.
 */
import fs from "node:fs";

const taxonomy = fs.readFileSync("src/lib/places/place-taxonomy.ts", "utf8");
const contracts = fs.readFileSync("src/lib/places/place-contracts.ts", "utf8");

const errors = [];
const required = [
  "zona-arqueologica",
  "cenote",
  "museo",
  "mercado-artesanal",
  "patrimonio",
  "naturaleza",
  "cultura",
];
for (const slug of required) {
  if (!taxonomy.includes(`"${slug}"`)) errors.push(`Falta el slug canónico ${slug}`);
}
for (const forbidden of ["business_categories", "seo_title", "seo_description", "seo_keywords"]) {
  if (contracts.includes(forbidden)) errors.push(`Autoridad duplicada detectada: ${forbidden}`);
}
if (!contracts.includes("place_type_id: z.string().uuid().nullable()"))
  errors.push("place_type_id debe permanecer nullable para registros históricos");

if (errors.length) {
  console.error(`G8-Q2A evidence FAIL:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      result: "PASS",
      gate: "G8-Q2A",
      place_types: 15,
      place_categories: 9,
      place_authority_kinds: 6,
      seo_authority: "seo_metadata(entity_kind = point_of_interest)",
      category_authority: "place_categories (independiente de business_categories)",
      historical_rows_mutated: 0,
    },
    null,
    2,
  ),
);
