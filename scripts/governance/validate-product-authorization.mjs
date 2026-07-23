import { readMasterIndex, validateMasterIndex } from "./lib/master-index.mjs";
import { authorizeChanges, changedFilesFromGit, currentBranch, loadAuthorizations, validateAuthorizations } from "./lib/product-authorization.mjs";

const root = process.cwd();
const baseArg = process.argv.find((argument) => argument.startsWith("--base="));
const baseRef = baseArg?.slice("--base=".length) || process.env.GITHUB_BASE_SHA || "";
const masterIndex = readMasterIndex(root);
const errors = validateMasterIndex(masterIndex, root);
const authorizations = loadAuthorizations(root);
errors.push(...validateAuthorizations(authorizations, masterIndex));

const changes = changedFilesFromGit(baseRef, root);
const branch = currentBranch(root);
const result = authorizeChanges(changes, authorizations, branch);
errors.push(...result.errors);

if (errors.length) {
  throw new Error(`Product Change Authorization Gate failed:\n- ${errors.join("\n- ")}\n\nEvery sensitive change requires one Approved manifest with the exact operation and exact repository path.`);
}

console.log(JSON.stringify({
  result: "PASS",
  base: baseRef || null,
  branch,
  manifests: authorizations.length,
  sensitive_changes: changes.length,
  authorized_changes: result.matched
}, null, 2));
