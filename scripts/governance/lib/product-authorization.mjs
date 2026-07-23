import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ACTIVE_STATUS = "Approved";
export const OPERATIONS = new Set(["create", "modify", "delete", "rename"]);

const productPrefixes = ["src/", "supabase/migrations/", "supabase/functions/"];
const productFiles = new Set([
  "package.json",
  "bun.lock",
  "vite.config.ts",
  "tsconfig.json",
  "components.json",
  "public/manifest.webmanifest"
]);

export function normalizeRepositoryPath(value) {
  if (typeof value !== "string") return "";
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

export function isExactPath(value) {
  const normalized = normalizeRepositoryPath(value);
  return Boolean(normalized) && !normalized.startsWith("/") && !normalized.endsWith("/") && !normalized.includes("..") && !/[?*\[\]{}!]/.test(normalized);
}

export function isSensitiveProductPath(value) {
  const file = normalizeRepositoryPath(value);
  return productPrefixes.some((prefix) => file.startsWith(prefix)) || productFiles.has(file);
}

export function parseNameStatus(text) {
  const changes = [];
  for (const line of text.split("\n").filter(Boolean)) {
    const [status, from, to] = line.split("\t");
    const kind = status[0];
    if (kind === "A") changes.push({ operation: "create", path: normalizeRepositoryPath(from) });
    else if (kind === "M" || kind === "T") changes.push({ operation: "modify", path: normalizeRepositoryPath(from) });
    else if (kind === "D") changes.push({ operation: "delete", path: normalizeRepositoryPath(from) });
    else if (kind === "R") changes.push({ operation: "rename", path: normalizeRepositoryPath(from), to: normalizeRepositoryPath(to) });
    else if (kind === "C") changes.push({ operation: "create", path: normalizeRepositoryPath(to) });
  }
  return changes;
}

export function changedFilesFromGit(baseRef, root = process.cwd()) {
  const outputs = [];
  if (baseRef) outputs.push(childProcess.execFileSync("git", ["diff", "--name-status", "-M", `${baseRef}...HEAD`], { cwd: root, encoding: "utf8" }));
  outputs.push(childProcess.execFileSync("git", ["diff", "--name-status", "-M", "HEAD"], { cwd: root, encoding: "utf8" }));
  const untracked = childProcess.execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
  outputs.push(untracked.split("\n").filter(Boolean).map((file) => `A\t${file}`).join("\n"));
  const unique = new Map();
  for (const change of parseNameStatus(outputs.join("\n"))) {
    if (!isSensitiveProductPath(change.path) && !(change.to && isSensitiveProductPath(change.to))) continue;
    unique.set(`${change.operation}:${change.path}:${change.to || ""}`, change);
  }
  return [...unique.values()];
}

export function currentBranch(root = process.cwd()) {
  return process.env.GITHUB_HEAD_REF || childProcess.execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
}

export function loadAuthorizations(root = process.cwd()) {
  const directory = path.join(root, "docs/governance/product-authorizations");
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith(".json")).sort().map((file) => {
    const source = `docs/governance/product-authorizations/${file}`;
    return { ...JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")), source };
  });
}

export function validateAuthorizations(authorizations, masterIndex) {
  const errors = [];
  const ids = new Set();
  const approvedBlueprints = new Set(masterIndex.rows.filter((row) => row.state === "Approved").map((row) => row.path));
  for (const authorization of authorizations) {
    const prefix = authorization.source || authorization.id || "authorization";
    if (!authorization.id || ids.has(authorization.id)) errors.push(`${prefix}: id missing or duplicated`);
    ids.add(authorization.id);
    if (!["Draft", "Approved", "Consumed", "Revoked"].includes(authorization.status)) errors.push(`${prefix}: invalid status`);
    if (!isExactPath(authorization.branch) || authorization.branch.includes(".tsx") || authorization.branch.includes(".ts")) errors.push(`${prefix}: branch must be an exact branch name`);
    if (!approvedBlueprints.has(authorization.blueprint)) errors.push(`${prefix}: blueprint is not admitted as Approved in 06: ${authorization.blueprint}`);
    if (typeof authorization.founder_authority !== "string" || authorization.founder_authority.trim().length < 12) errors.push(`${prefix}: founder_authority is missing`);
    if (!Array.isArray(authorization.permissions) || authorization.permissions.length === 0) errors.push(`${prefix}: permissions must not be empty`);
    const keys = new Set();
    for (const permission of authorization.permissions || []) {
      if (!OPERATIONS.has(permission.operation)) errors.push(`${prefix}: invalid operation ${permission.operation}`);
      if (!isExactPath(permission.path)) errors.push(`${prefix}: permission path must be exact: ${permission.path}`);
      if (!isSensitiveProductPath(permission.path)) errors.push(`${prefix}: permission is outside protected product scope: ${permission.path}`);
      if (permission.operation === "rename") {
        if (!isExactPath(permission.to)) errors.push(`${prefix}: rename destination must be exact: ${permission.to}`);
      } else if (permission.to !== undefined) errors.push(`${prefix}: 'to' is only valid for rename`);
      const key = `${permission.operation}:${permission.path}:${permission.to || ""}`;
      if (keys.has(key)) errors.push(`${prefix}: duplicate permission ${key}`);
      keys.add(key);
    }
    for (const field of ["public_routes", "required_feature_flags", "required_tests"]) {
      if (!Array.isArray(authorization[field])) errors.push(`${prefix}: ${field} must be an array`);
    }
  }
  return errors;
}

function permissionMatches(change, permission) {
  return change.operation === permission.operation && change.path === normalizeRepositoryPath(permission.path) && (change.operation !== "rename" || change.to === normalizeRepositoryPath(permission.to));
}

export function authorizeChanges(changes, authorizations, branch) {
  const active = authorizations.filter((authorization) => authorization.status === ACTIVE_STATUS && authorization.branch === branch);
  const errors = [];
  const matched = [];
  for (const change of changes) {
    const matches = active.flatMap((authorization) => (authorization.permissions || []).filter((permission) => permissionMatches(change, permission)).map(() => authorization.id));
    const label = change.operation === "rename" ? `${change.path} -> ${change.to}` : change.path;
    if (matches.length === 0) errors.push(`UNAUTHORIZED ${change.operation}: ${label}`);
    else if (matches.length > 1) errors.push(`AMBIGUOUS ${change.operation}: ${label} matches ${matches.join(", ")}`);
    else matched.push({ ...change, authorization: matches[0] });
  }
  return { errors, matched };
}
