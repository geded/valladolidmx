import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const GRAPH_CURATED_BASELINE_SHA256 =
  "8abaaa77a1864edbe90dd23e9e1078547cca439dd1a368e899e0310b4e2f33bc";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

function curatedBaseline(graph, dependencyIds) {
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
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const graph = JSON.parse(read("docs/governance/generated/08-KNOWLEDGE-GRAPH.json"));
const dependency = JSON.parse(read("docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"));
const glossary = read("docs/governance/01-GLOSSARY.md");
const domainAdr = read("docs/decisions/ADR-GOV-0001-CANONICAL-DOCUMENT-DOMAINS.md");

if (graph.schema_version !== "1.0") throw new Error("Unsupported graph schema");
if (graph.status !== "Approved") throw new Error("Knowledge graph is not Approved");
if (graph.derived_from?.glossary?.state !== "Approved")
  throw new Error("Glossary source is not Approved");
if (graph.derived_from?.dependency_map?.state !== "Approved")
  throw new Error("Dependency map source is not Approved");
if (
  graph.derived_from?.dependency_map?.document !==
  "docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"
)
  throw new Error("Knowledge graph dependency source is not canonical generated 07");
if (
  graph.derived_from?.dependency_map?.source_sha256 !==
  sha256(read("docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json"))
)
  throw new Error("Knowledge graph dependency fingerprint is stale");
if (graph.derived_from?.glossary?.source_sha256 !== sha256(glossary))
  throw new Error("Knowledge graph glossary fingerprint is stale");
if (graph.derived_from?.domain_adr?.source_sha256 !== sha256(domainAdr))
  throw new Error("Knowledge graph domain ADR fingerprint is stale");
if (graph.derived_from?.generator !== "scripts/governance/sync-governance.mjs")
  throw new Error("Knowledge graph generator is not canonical");
if (graph.derived_from?.projection_mode !== "canonical-plus-frozen-curated-baseline")
  throw new Error("Knowledge graph projection mode is not fail-closed");
const dependencyIds = new Set((dependency.nodes || []).map((node) => node.id));
const curatedBaselineSha256 = sha256(JSON.stringify(curatedBaseline(graph, dependencyIds)));
if (
  curatedBaselineSha256 !== GRAPH_CURATED_BASELINE_SHA256 ||
  graph.derived_from?.curated_baseline_sha256 !== GRAPH_CURATED_BASELINE_SHA256
)
  throw new Error(`Knowledge graph curated baseline drifted: ${curatedBaselineSha256}`);
for (const legacyField of ["data_blob", "merge_commit", "notes"])
  if (legacyField in (graph.derived_from?.dependency_map || {}))
    throw new Error(`Knowledge graph retains stale provenance field: ${legacyField}`);

const nodes = new Map();
for (const node of graph.nodes || []) {
  if (!node.id || !node.type || !node.source || !node.evidence)
    throw new Error(`Node lacks id/type/source/evidence: ${JSON.stringify(node)}`);
  if (nodes.has(node.id)) throw new Error(`Duplicate node: ${node.id}`);
  nodes.set(node.id, node);
}

const edgeKeys = new Set();
for (const edge of graph.edges || []) {
  if (
    !edge.id ||
    !edge.origin ||
    !edge.destination ||
    !edge.relation ||
    !edge.source ||
    !edge.evidence ||
    !edge.verified_at
  )
    throw new Error(`Edge lacks required field: ${JSON.stringify(edge)}`);
  if (!nodes.has(edge.origin) || !nodes.has(edge.destination))
    throw new Error(`Dangling edge: ${edge.id}`);
  if (edge.origin === edge.destination) throw new Error(`Self-reference: ${edge.id}`);
  if (!graph.allowed_relations.includes(edge.relation))
    throw new Error(`Unauthorized relation: ${edge.relation}`);
  const key = `${edge.origin}\u0000${edge.relation}\u0000${edge.destination}`;
  if (edgeKeys.has(key)) throw new Error(`Duplicate semantic edge: ${edge.id}`);
  edgeKeys.add(key);
}

const glossaryTerms = glossary.split("\n# 4. Convenciones")[0].match(/^### .+$/gm) || [];
const conceptNodes = [...nodes.values()].filter((n) => n.id.startsWith("CONCEPT:"));
if (conceptNodes.length !== glossaryTerms.length)
  throw new Error(`Glossary projection mismatch: ${conceptNodes.length}/${glossaryTerms.length}`);

const inheritedNodes = dependency.nodes.every((n) => nodes.has(n.id));
if (!inheritedNodes) throw new Error("At least one 07 node is absent");
const inheritedEdges = graph.edges.filter((e) => e.id.startsWith("DEP:"));
if (inheritedEdges.length !== dependency.edges.length)
  throw new Error(
    `07 edge projection mismatch: ${inheritedEdges.length}/${dependency.edges.length}`,
  );

const docCount = dependency.nodes.filter((n) => n.id.startsWith("DOC:")).length;
const accountability = graph.edges.filter(
  (e) => e.relation === "governed_by" && e.origin.startsWith("DOC:"),
);
if (accountability.length !== docCount)
  throw new Error(`Document accountability mismatch: ${accountability.length}/${docCount}`);

const domainNodes = [...nodes.values()].filter((n) => n.id.startsWith("DOMAIN:"));
if (domainNodes.length !== 14) throw new Error(`Expected 14 domains; found ${domainNodes.length}`);
for (const domain of domainNodes) {
  if (
    !graph.edges.some(
      (e) =>
        e.origin === "GOVDOC:ADR-GOV-0001" &&
        e.relation === "authorizes" &&
        e.destination === domain.id,
    )
  )
    throw new Error(`Domain lacks ADR authorization: ${domain.id}`);
}

console.log(
  JSON.stringify(
    {
      result: "PASS",
      glossary_concepts: conceptNodes.length,
      domains: domainNodes.length,
      nodes: nodes.size,
      edges: edgeKeys.size,
      inherited_dependency_edges: inheritedEdges.length,
      accountable_documents: accountability.length,
    },
    null,
    2,
  ),
);
