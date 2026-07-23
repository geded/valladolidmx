import assert from "node:assert/strict";
import { authorizeChanges, isExactPath, parseNameStatus } from "./lib/product-authorization.mjs";

const approved = [{
  id: "PCA-TEST-001",
  status: "Approved",
  branch: "test/authorized",
  permissions: [
    { operation: "modify", path: "src/components/cards/Example.tsx" },
    { operation: "create", path: "src/routes/example.tsx" },
    { operation: "rename", path: "src/lib/old.ts", to: "src/lib/new.ts" }
  ]
}];

assert.equal(isExactPath("src/routes/example.tsx"), true);
assert.equal(isExactPath("src/routes/**"), false);
assert.deepEqual(parseNameStatus("A\tsrc/routes/example.tsx\nM\tsrc/components/cards/Example.tsx\nR100\tsrc/lib/old.ts\tsrc/lib/new.ts\n"), [
  { operation: "create", path: "src/routes/example.tsx" },
  { operation: "modify", path: "src/components/cards/Example.tsx" },
  { operation: "rename", path: "src/lib/old.ts", to: "src/lib/new.ts" }
]);

assert.equal(authorizeChanges([{ operation: "modify", path: "src/components/cards/Example.tsx" }], approved, "test/authorized").errors.length, 0);
assert.match(authorizeChanges([{ operation: "modify", path: "src/components/cards/Example.tsx" }], approved, "test/other").errors[0], /UNAUTHORIZED modify/);
assert.match(authorizeChanges([{ operation: "create", path: "src/components/cards/Example.tsx" }], approved, "test/authorized").errors[0], /UNAUTHORIZED create/);
assert.match(authorizeChanges([{ operation: "create", path: "src/routes/invented.tsx" }], approved, "test/authorized").errors[0], /UNAUTHORIZED create/);
assert.match(authorizeChanges([{ operation: "delete", path: "src/routes/example.tsx" }], approved, "test/authorized").errors[0], /UNAUTHORIZED delete/);
assert.equal(authorizeChanges([{ operation: "rename", path: "src/lib/old.ts", to: "src/lib/new.ts" }], approved, "test/authorized").errors.length, 0);
assert.match(authorizeChanges([{ operation: "rename", path: "src/lib/old.ts", to: "src/lib/other.ts" }], approved, "test/authorized").errors[0], /UNAUTHORIZED rename/);

console.log(JSON.stringify({ result: "PASS", cases: 10 }, null, 2));
