import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { createHash } from "node:crypto";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const assets = [
  ["5f614350-1347-4500-8489-5f84ff36f09e","studio-media","2026/imported-1783037277673-6evkkz-bg01-dv5sczwm.jpg"],
  ["1c276d54-7bab-4b36-9b85-5e70d6fe8e01","studio-media","2026/imported-1783037283528-xv523j-bg02-ddstg3xc.jpg"],
  ["cb8ccb0d-60de-4d37-b178-7802f6d39b24","companies","55555555-aaaa-4aaa-8aaa-000000000002/1783106258270-x8a55u-85b97f6a-d2fd-4983-8a60-b61ec914f50d.jpg"],
  ["57a401dc-68d3-456f-87ba-f5196070376b","destinations","11111111-aaaa-4aaa-8aaa-000000000001/1783106483564-edcvzn-img_6663.jpg"],
  ["2f749dc4-64c9-414a-a61d-5faa9a1f1ba6","demo-media","destinations/hero_valladolid.jpg"],
];
for (const [id, bucket, path] of assets) {
  const dl = await sb.storage.from(bucket).download(path);
  if (dl.error) { console.log(id, "ERR", dl.error.message); continue; }
  const buf = Buffer.from(await dl.data.arrayBuffer());
  const meta = await sharp(buf).metadata();
  console.log(id.slice(0,8), bucket, `${meta.width}x${meta.height}`, `${(buf.length/1024).toFixed(0)}KB`, meta.format, "exif:", !!meta.exif, "alpha:", meta.hasAlpha, "sha:", createHash("sha256").update(buf).digest("hex").slice(0,16));
}
