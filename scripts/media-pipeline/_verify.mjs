// M1 Pilot Verification: originals byte-identical + storage listing + fallback proof
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { resolveMediaSource } from "../../src/lib/media/resolve-source.ts";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const rows = [
  ["57a401dc-68d3-456f-87ba-f5196070376b","destinations","11111111-aaaa-4aaa-8aaa-000000000001/1783106483564-edcvzn-img_6663.jpg","bc52fca2d5af8d4b25c1b312e009b8de1670abbad0ac6da507fd02a437157e00"],
  ["cb8ccb0d-60de-4d37-b178-7802f6d39b24","companies","55555555-aaaa-4aaa-8aaa-000000000002/1783106258270-x8a55u-85b97f6a-d2fd-4983-8a60-b61ec914f50d.jpg","16fbd1fa0c215b65041e7079fa1a7093e3f8d39fdf1fc5368bfb86ce904b851b"],
  ["1c276d54-7bab-4b36-9b85-5e70d6fe8e01","studio-media","2026/imported-1783037283528-xv523j-bg02-ddstg3xc.jpg","16d31e1c3d2a504f0c192864ac8eb66c224623b0f88c98b2bbfc3d0aae825568"],
];
console.log("== Original byte-identity check ==");
for (const [id,b,p,pre] of rows){
  const d = await sb.storage.from(b).download(p);
  const buf = Buffer.from(await d.data.arrayBuffer());
  const now = createHash("sha256").update(buf).digest("hex");
  console.log(id, now===pre ? "IDENTICAL" : "DIFFERS", "bytes="+buf.length);
}
console.log("\n== media-derived storage listing (per asset) ==");
for (const [id] of rows){
  // list recursively
  async function walk(prefix){
    const { data } = await sb.storage.from("media-derived").list(prefix, { limit: 100 });
    if (!data) return [];
    let out=[];
    for (const e of data){
      if (e.id === null) { out.push(...await walk(prefix+"/"+e.name)); }
      else out.push({path: prefix+"/"+e.name, size: e.metadata?.size});
    }
    return out;
  }
  const files = await walk(id);
  console.log(id, "files=", files.length);
  files.forEach(f=>console.log("  ", f.path, f.size));
}
console.log("\n== Fallback proof — flag OFF, resolver must return canonical ==");
// Simulate consumer: fetch variants but flag off → resolver ignores unless caller passes them
const testAsset = {
  id: "57a401dc-68d3-456f-87ba-f5196070376b",
  file_url: "https://legacy.example.com/img_6663.jpg",
  pipeline_status: "ready",
  variants: [], // <- superficies públicas NO reciben variants mientras el flag esté OFF
};
const r1 = resolveMediaSource(testAsset, { context: "hero" });
console.log("resolver (flag OFF surface): src=", r1.src, "usedPipeline=", r1.usedPipeline);

const failedAsset = { ...testAsset, pipeline_status: "failed", variants: null };
const r2 = resolveMediaSource(failedAsset);
console.log("resolver (pipeline_status=failed): src=", r2.src, "usedPipeline=", r2.usedPipeline);
