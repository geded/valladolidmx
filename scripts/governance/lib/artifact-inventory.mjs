import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const INVENTORY_PATH = "docs/governance/generated/GOVERNANCE-ARTIFACT-INVENTORY.json";

const ignoredDirectories = new Set([
  ".git",
  ".nitro",
  ".output",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
]);

const ignoredFiles = new Set([
  INVENTORY_PATH,
  "docs/governance/audit/2026-07-21-GOVERNANCE-INTEGRITY-COVERAGE-AUDIT-v1.0.md",
]);

const rootConfigFiles = new Set([
  ".gitignore",
  ".prettierignore",
  ".prettierrc",
  "bun.lock",
  "bunfig.toml",
  "components.json",
  "eslint.config.js",
  "nitro.config.ts",
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
]);

const relevantPrefixes = [
  ".github/",
  ".lovable/",
  "docs/blueprint/",
  "docs/decisions/",
  "public/",
  "scripts/",
  "src/",
  "supabase/functions/",
  "supabase/migrations/",
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function walk(directory, root, result) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".env" || entry.name.startsWith(".env.")) continue;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, root, result);
    else if (entry.isFile()) result.push(toPosix(path.relative(root, absolute)));
  }
}

export function listRepositoryFiles(root) {
  const files = [];
  walk(root, root, files);
  return files.sort();
}

export function isRelevantArtifact(file) {
  if (ignoredFiles.has(file)) return false;
  if (rootConfigFiles.has(file)) return true;
  if (file === "supabase/config.toml") return true;
  return relevantPrefixes.some((prefix) => file.startsWith(prefix));
}

export function classifyArtifact(file) {
  const lower = file.toLowerCase();

  if (file.startsWith("docs/blueprint/")) return "blueprint_document";
  if (file.startsWith("docs/decisions/")) return "decision_record";
  if (file.startsWith("supabase/migrations/")) return "migration";
  if (file.startsWith("supabase/functions/")) return "server_function";
  if (file.startsWith(".github/workflows/")) return "workflow";
  if (file.startsWith("src/routes/")) {
    if (/(sitemap|robots|llms|manifest|seo)/.test(lower)) return "seo";
    if (/template/.test(lower)) return "surface_template";
    return "route";
  }
  if (file === "src/config/site.ts" || /(domain|canonical|redirect)/.test(lower))
    return "domain_config";
  if (/(\/seo[./-]|sitemap|robots|llms|structured[-_.]?data|metadata)/.test(lower)) return "seo";
  if (
    file.startsWith("src/components/surfaces/kit/") ||
    file.startsWith("src/lib/experience-builder/") ||
    file.startsWith("src/lib/email-templates/") ||
    /template/.test(lower)
  )
    return "surface_template";
  if (/(__tests__|\.test\.|\.spec\.|\/tests?\/)/.test(lower)) return "test";
  if (file.startsWith("src/components/")) return "component";
  if (file.startsWith("src/")) return "module";
  if (file.startsWith("scripts/")) return "script";
  if (file.startsWith("public/")) return "public_asset";
  return "config";
}

export function sha256File(absolutePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
}

function normalizedNodePath(node) {
  return typeof node.path === "string" ? node.path.replace(/^\.\//, "") : "";
}

function nodeMatchesFile(nodePath, file) {
  if (!nodePath) return false;
  if (nodePath === file) return true;
  const prefix = nodePath.endsWith("/") ? nodePath : `${nodePath}/`;
  return file.startsWith(prefix);
}

export function buildCoverageIndex(dependencyMap) {
  const nodesById = new Map((dependencyMap.nodes || []).map((node) => [node.id, node]));
  const documentLinksByArtifact = new Map();

  for (const edge of dependencyMap.edges || []) {
    const origin = nodesById.get(edge.origin);
    const destination = nodesById.get(edge.destination);
    if (!origin || !destination) continue;

    if (origin.id.startsWith("ART:") && destination.id.startsWith("DOC:")) {
      const links = documentLinksByArtifact.get(origin.id) || new Set();
      links.add(destination.path);
      documentLinksByArtifact.set(origin.id, links);
    }
    if (destination.id.startsWith("ART:") && origin.id.startsWith("DOC:")) {
      const links = documentLinksByArtifact.get(destination.id) || new Set();
      links.add(origin.path);
      documentLinksByArtifact.set(destination.id, links);
    }
  }

  const artifactNodes = [...nodesById.values()].filter((node) => node.id.startsWith("ART:"));
  const documentNodes = new Map(
    [...nodesById.values()]
      .filter((node) => node.id.startsWith("DOC:"))
      .map((node) => [node.path, node]),
  );

  return { artifactNodes, documentLinksByArtifact, documentNodes };
}

export function coverageForFile(file, coverageIndex) {
  if (file.startsWith("docs/blueprint/")) {
    const documentNode = coverageIndex.documentNodes.get(file);
    return {
      status: documentNode ? "covered_exact" : "gap",
      matched_nodes: documentNode ? [documentNode.id] : [],
      documented_by: documentNode ? [file] : [],
    };
  }

  const matches = coverageIndex.artifactNodes.filter((node) =>
    nodeMatchesFile(normalizedNodePath(node), file),
  );
  const exactMatches = matches.filter((node) => normalizedNodePath(node) === file);
  const documentedBy = new Set();
  for (const node of matches) {
    for (const documentPath of coverageIndex.documentLinksByArtifact.get(node.id) || []) {
      documentedBy.add(documentPath);
    }
  }

  return {
    status:
      documentedBy.size === 0
        ? "gap"
        : exactMatches.length > 0
          ? "covered_exact"
          : "covered_inherited",
    matched_nodes: matches.map((node) => node.id).sort(),
    documented_by: [...documentedBy].sort(),
  };
}

export function scanArtifacts(root, dependencyMap) {
  const coverageIndex = buildCoverageIndex(dependencyMap);
  return listRepositoryFiles(root)
    .filter(isRelevantArtifact)
    .map((file) => ({
      path: file,
      kind: classifyArtifact(file),
      sha256: sha256File(path.join(root, file)),
      coverage: coverageForFile(file, coverageIndex),
    }));
}

export function summarizeArtifacts(artifacts) {
  const byKind = {};
  let coveredExact = 0;
  let coveredInherited = 0;
  for (const artifact of artifacts) {
    byKind[artifact.kind] = (byKind[artifact.kind] || 0) + 1;
    if (artifact.coverage.status === "covered_exact") coveredExact += 1;
    if (artifact.coverage.status === "covered_inherited") coveredInherited += 1;
  }
  const covered = coveredExact + coveredInherited;
  return {
    total: artifacts.length,
    covered,
    covered_exact: coveredExact,
    covered_inherited: coveredInherited,
    gaps: artifacts.length - covered,
    coverage_percent: Number(((covered / Math.max(artifacts.length, 1)) * 100).toFixed(2)),
    exact_coverage_percent: Number(
      ((coveredExact / Math.max(artifacts.length, 1)) * 100).toFixed(2),
    ),
    by_kind: Object.fromEntries(Object.entries(byKind).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function extractMasterIndexPaths(indexMarkdown) {
  return indexMarkdown
    .split("\n")
    .filter((line) => line.startsWith("| [`docs/blueprint/"))
    .map((line) => line.match(/^\| \[`([^`]+)`\]/)?.[1])
    .filter(Boolean)
    .sort();
}
