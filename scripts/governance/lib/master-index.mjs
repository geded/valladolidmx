import fs from "node:fs";
import path from "node:path";

export const MASTER_INDEX_PATH = "docs/governance/06-BLUEPRINT-MASTER-INDEX.md";
export const ALLOWED_STATES = new Set(["Approved", "Draft", "Superseded", "Historical", "Deprecated"]);

export function readMasterIndex(root = process.cwd()) {
  const source = fs.readFileSync(path.join(root, MASTER_INDEX_PATH), "utf8");
  const version = source.match(/^\*\*Versión:\*\*\s*([\d.]+)/m)?.[1];
  const state = source.match(/^\*\*Estado:\*\*\s*(\w+)/m)?.[1];
  if (!version || !state) throw new Error("06 lacks an explicit version or state");

  const rows = source.split("\n").filter((line) => line.startsWith("| [`docs/blueprint/")).map((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    const documentPath = cells[0]?.match(/^\[`([^`]+)`\]/)?.[1];
    const value = (index) => cells[index]?.replace(/^`|`$/g, "").trim();
    const owner = value(5);
    const domain = owner?.match(/^(D(?:0[1-9]|1[0-4]))\s*·\s*(.+)$/);
    if (!documentPath || cells.length < 13) throw new Error(`Malformed 06 row: ${line.slice(0, 140)}`);
    return {
      path: documentPath,
      title: cells[1],
      version: value(2),
      state: value(3),
      type: cells[4],
      owner,
      domainId: domain?.[1],
      implementation: value(8),
      authority: cells[12],
      reviewedAt: cells[13],
      line,
    };
  });
  return { source, version, state, rows };
}

export function exactImplementationPaths(row) {
  if (!row.implementation || row.implementation === "—" || row.implementation === "Not established") return [];
  return row.implementation.split(";").map((value) => value.trim()).filter((value) => value && !value.endsWith("/") && !value.includes("*"));
}

export function validateMasterIndex(index, root = process.cwd()) {
  const errors = [];
  const seen = new Set();
  for (const row of index.rows) {
    if (seen.has(row.path)) errors.push(`Duplicate 06 row: ${row.path}`);
    seen.add(row.path);
    if (!ALLOWED_STATES.has(row.state)) errors.push(`Unauthorized state in 06: ${row.path} (${row.state})`);
    if (!row.domainId) errors.push(`Missing canonical D01-D14 owner in 06: ${row.path}`);
    if (!row.authority || row.authority === "—") errors.push(`Missing admission evidence in 06: ${row.path}`);
    if (!fs.existsSync(path.join(root, row.path))) errors.push(`06 references missing Blueprint: ${row.path}`);
  }
  const files = fs.readdirSync(path.join(root, "docs/blueprint"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.posix.join("docs/blueprint", entry.parentPath.replaceAll("\\", "/").split("docs/blueprint").pop().replace(/^\//, ""), entry.name))
    .map((file) => file.replace("docs/blueprint/./", "docs/blueprint/"))
    .sort();
  for (const file of files) if (!seen.has(file)) errors.push(`Blueprint requires admission in 06: ${file}`);
  if (files.length !== index.rows.length) errors.push(`Blueprint universe mismatch: tree=${files.length}, 06=${index.rows.length}`);
  return errors;
}
