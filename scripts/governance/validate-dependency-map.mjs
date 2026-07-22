import fs from 'node:fs';
import path from 'node:path';
import { readMasterIndex, validateMasterIndex } from './lib/master-index.mjs';

const root = process.cwd();
const indexPath = path.join(root, 'docs/governance/06-BLUEPRINT-MASTER-INDEX.md');
const mapPath = path.join(root, 'docs/governance/generated/07-BLUEPRINT-DEPENDENCY-MAP.json');
const index = fs.readFileSync(indexPath, 'utf8');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const masterIndex = readMasterIndex(root);
const admissionErrors = validateMasterIndex(masterIndex, root);
if (admissionErrors.length) throw new Error(`Governance admission failed:\n- ${admissionErrors.join('\n- ')}`);

const rowPaths = index.split('\n')
  .filter(line => line.startsWith('| [`docs/blueprint/'))
  .map(line => {
    const match = line.match(/^\| \[`([^`]+)`\]/);
    if (!match) throw new Error(`Malformed 06 row: ${line.slice(0, 100)}`);
    return match[1];
  });

if (new Set(rowPaths).size !== rowPaths.length) throw new Error('Duplicate document path in 06');
if (map.derived_from?.version !== masterIndex.version || map.derived_from?.state !== masterIndex.state) throw new Error(`Map is not derived from 06 v${masterIndex.version} ${masterIndex.state}`);

const nodes = new Map();
for (const node of map.nodes || []) {
  if (!node.id || !node.path || !node.type) throw new Error(`Malformed node: ${JSON.stringify(node)}`);
  if (nodes.has(node.id)) throw new Error(`Duplicate node id: ${node.id}`);
  nodes.set(node.id, node);
}

const documentNodes = [...nodes.values()].filter(node => node.id.startsWith('DOC:'));
if (documentNodes.length !== rowPaths.length) throw new Error(`Expected ${rowPaths.length} document nodes; found ${documentNodes.length}`);
for (const p of rowPaths) if (!nodes.has(`DOC:${p}`)) throw new Error(`Missing document node: ${p}`);

const edgeKeys = new Set();
for (const edge of map.edges || []) {
  if (!edge.id || !edge.origin || !edge.destination || !edge.relation || !edge.evidence || !edge.verified_at) throw new Error(`Malformed edge: ${JSON.stringify(edge)}`);
  if (!nodes.has(edge.origin) || !nodes.has(edge.destination)) throw new Error(`Dangling edge ${edge.id}`);
  if (edge.origin === edge.destination) throw new Error(`Self-reference ${edge.id}`);
  const key = `${edge.origin}\u0000${edge.relation}\u0000${edge.destination}`;
  if (edgeKeys.has(key)) throw new Error(`Duplicate edge ${edge.id}`);
  edgeKeys.add(key);
}

if ((map.critical_chain_coverage || []).length !== 4) throw new Error('Expected four critical-chain coverage records');

console.log(JSON.stringify({
  result: 'PASS',
  document_rows: rowPaths.length,
  nodes: nodes.size,
  edges: edgeKeys.size,
  critical_chains: map.critical_chain_coverage.length,
}, null, 2));
