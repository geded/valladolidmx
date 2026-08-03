import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  exactImplementationPaths,
  readMasterIndex,
  validateMasterIndex,
} from "./lib/master-index.mjs";

const MAP_CURATED_BASELINE_SHA256 =
  "94bfae90da2ce7a499a268774f01f3b6aa5ebee4e4ce66c95ac1f632c5ce7f3a";
const GRAPH_CURATED_BASELINE_SHA256 =
  "8abaaa77a1864edbe90dd23e9e1078547cca439dd1a368e899e0310b4e2f33bc";
const GENERATOR_PATH = "scripts/governance/sync-governance.mjs";

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256File = (file) => sha256(fs.readFileSync(file));
const sha256Json = (value) => sha256(JSON.stringify(value));

function projectionTimestamp(index) {
  const dates = index.rows
    .map((row) => row.reviewedAt)
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
  if (!dates.length)
    throw new Error("06 lacks a canonical reviewed date for deterministic projection metadata");
  return `${dates.sort().at(-1)}T00:00:00.000Z`;
}

function mapCuratedBaseline(map) {
  const baseline = { ...map };
  delete baseline.derived_from;
  delete baseline.generated_at;
  baseline.nodes = (map.nodes || []).filter(
    (node) => !node.id.startsWith("DOC:") && !node.id.startsWith("ART:"),
  );
  baseline.edges = (map.edges || []).filter((edge) => !edge.id.startsWith("AUTO:IMPLEMENTS:"));
  return baseline;
}

function graphCuratedBaseline(graph, dependencyIds) {
  const baseline = { ...graph };
  delete baseline.derived_from;
  delete baseline.generated_at;
  baseline.nodes = (graph.nodes || []).filter((node) => !dependencyIds.has(node.id));
  baseline.edges = (graph.edges || []).filter(
    (edge) => !edge.id.startsWith("DEP:") && !edge.id.startsWith("AUTO:GOVERNED_BY:"),
  );
  return baseline;
}

const root = process.cwd();
const check = process.argv.includes("--check");
const index = readMasterIndex(root);
const admissionErrors = validateMasterIndex(index, root);
if (index.state !== "Approved") admissionErrors.push(`06 must be Approved; found ${index.state}`);
if (admissionErrors.length)
  throw new Error(`Governance admission failed:\n- ${admissionErrors.join("\n- ")}`);

const mapPath = path.join(root, "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json");
const graphPath = path.join(root, "docs/governance/generated/08-KNOWLEDGE-GRAPH.json");
const map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const mapBaselineSha256 = sha256Json(mapCuratedBaseline(map));
if (mapBaselineSha256 !== MAP_CURATED_BASELINE_SHA256) {
  throw new Error(`07 curated baseline changed outside the synchronizer: ${mapBaselineSha256}`);
}
const rows = new Map(index.rows.map((row) => [row.path, row]));
const docIds = new Set(index.rows.map((row) => `DOC:${row.path}`));

map.derived_from = {
  document: "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
  version: index.version,
  state: index.state,
  source_sha256: sha256File(path.join(root, "docs/governance/06-BLUEPRINT-MASTER-INDEX.md")),
  generator: GENERATOR_PATH,
  projection_mode: "canonical-plus-frozen-curated-baseline",
  curated_baseline_sha256: MAP_CURATED_BASELINE_SHA256,
};
map.generated_at = projectionTimestamp(index);
map.nodes = map.nodes.filter((node) => !node.id.startsWith("DOC:") || docIds.has(node.id));
const mapNodeIds = new Set(map.nodes.map((node) => node.id));
for (const row of index.rows) {
  const id = `DOC:${row.path}`;
  const existing = map.nodes.find((node) => node.id === id);
  const projected = {
    id,
    type: existing?.type || "blueprint",
    path: row.path,
    owner: row.owner,
    state: row.state,
    version: row.version,
  };
  if (existing) Object.assign(existing, projected);
  else map.nodes.push(projected);
}
for (const row of index.rows) {
  for (const artifactPath of exactImplementationPaths(row)) {
    if (!fs.existsSync(path.join(root, artifactPath))) continue;
    const artifactId = `ART:${artifactPath}`;
    if (!map.nodes.some((node) => node.id === artifactId))
      map.nodes.push({ id: artifactId, type: "artifact", path: artifactPath });
    const destination = `DOC:${row.path}`;
    if (
      !map.edges.some(
        (edge) =>
          edge.origin === artifactId &&
          edge.relation === "implements" &&
          edge.destination === destination,
      )
    ) {
      map.edges.push({
        id: `AUTO:IMPLEMENTS:${artifactPath}:${row.path}`,
        origin: artifactId,
        relation: "implements",
        destination,
        evidence: `${row.path} § Implementación`,
        source_row: row.path,
        verified_at: row.reviewedAt || new Date().toISOString().slice(0, 10),
      });
    }
  }
}
const validMapNodes = new Set(map.nodes.map((node) => node.id));
map.edges = map.edges.filter(
  (edge) => validMapNodes.has(edge.origin) && validMapNodes.has(edge.destination),
);

const dependencyIds = new Set(map.nodes.map((node) => node.id));
const graphBaselineSha256 = sha256Json(graphCuratedBaseline(graph, dependencyIds));
if (graphBaselineSha256 !== GRAPH_CURATED_BASELINE_SHA256) {
  throw new Error(`08 curated baseline changed outside the synchronizer: ${graphBaselineSha256}`);
}
graph.nodes = graph.nodes.filter(
  (node) => !node.id.startsWith("DOC:") || dependencyIds.has(node.id),
);
for (const node of map.nodes) {
  if (graph.nodes.some((candidate) => candidate.id === node.id)) continue;
  graph.nodes.push({
    ...node,
    source: node.path || "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
    evidence: node.path || node.id,
  });
}
for (const row of index.rows) {
  const id = `DOC:${row.path}`;
  const existing = graph.nodes.find((node) => node.id === id);
  const projected = {
    id,
    type: existing?.type || "blueprint",
    path: row.path,
    owner: row.owner,
    state: row.state,
    version: row.version,
    source: existing?.source || row.path,
    evidence: existing?.evidence || `${row.path} + docs/governance/06-BLUEPRINT-MASTER-INDEX.md`,
  };
  if (existing) Object.assign(existing, projected);
  else graph.nodes.push(projected);
}
const mapEdges = new Map(map.edges.map((edge) => [`DEP:${edge.id}`, edge]));
graph.edges = graph.edges.filter((edge) => {
  if (edge.id.startsWith("DEP:")) return mapEdges.has(edge.id);
  if (edge.relation === "governed_by" && edge.origin.startsWith("DOC:"))
    return docIds.has(edge.origin);
  return true;
});
for (const [id, edge] of mapEdges) {
  const existing = graph.edges.find((candidate) => candidate.id === id);
  const projected = {
    ...edge,
    id,
    source: existing?.source || "docs/governance/07-BLUEPRINT-DEPENDENCY-MAP.md",
  };
  if (existing) Object.assign(existing, projected);
  else graph.edges.push(projected);
}
const accountability = new Set(
  graph.edges
    .filter((edge) => edge.relation === "governed_by" && edge.origin.startsWith("DOC:"))
    .map((edge) => edge.origin),
);
for (const row of index.rows) {
  const origin = `DOC:${row.path}`;
  if (accountability.has(origin)) continue;
  graph.edges.push({
    id: `AUTO:GOVERNED_BY:${row.path}`,
    verified_at: row.reviewedAt || new Date().toISOString().slice(0, 10),
    origin,
    relation: "governed_by",
    destination: `DOMAIN:${row.domainId}`,
    source: "docs/governance/06-BLUEPRINT-MASTER-INDEX.md",
    evidence: `06 v${index.version} · ${row.path} → ${row.owner}`,
  });
}
graph.derived_from = {
  glossary: {
    document: "docs/governance/01-GLOSSARY.md",
    state: "Approved",
    source_sha256: sha256File(path.join(root, "docs/governance/01-GLOSSARY.md")),
  },
  dependency_map: {
    document: "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json",
    state: "Approved",
    source_sha256: sha256(`${JSON.stringify(map, null, 2)}\n`),
  },
  domain_adr: {
    document: "docs/decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md",
    state: "Approved",
    source_sha256: sha256File(
      path.join(root, "docs/decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md"),
    ),
  },
  generator: GENERATOR_PATH,
  projection_mode: "canonical-plus-frozen-curated-baseline",
  curated_baseline_sha256: GRAPH_CURATED_BASELINE_SHA256,
};
graph.generated_at = projectionTimestamp(index);

const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const outputs = [
  [mapPath, serialize(map)],
  [graphPath, serialize(graph)],
];
const stale = outputs
  .filter(([file, content]) => fs.readFileSync(file, "utf8") !== content)
  .map(([file]) => path.relative(root, file));
if (check && stale.length)
  throw new Error(
    `Governance projections are stale; run bun run governance:sync:\n- ${stale.join("\n- ")}`,
  );
if (!check) {
  for (const [file, content] of outputs) fs.writeFileSync(file, content);
  childProcess.execFileSync(
    process.execPath,
    ["scripts/governance/generate-artifact-inventory.mjs"],
    { cwd: root, stdio: "inherit" },
  );
}
console.log(
  JSON.stringify(
    {
      result: "PASS",
      mode: check ? "check" : "sync",
      master_index_version: index.version,
      blueprint_documents: index.rows.length,
      stale_projections: stale,
    },
    null,
    2,
  ),
);
