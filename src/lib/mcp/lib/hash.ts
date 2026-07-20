import { createHash } from "crypto";

/** SHA-256 truncado a 16 hex chars — suficiente para agrupar sin PII. */
export function inputHash(input: unknown): string {
  try {
    const json = JSON.stringify(input ?? null);
    return createHash("sha256").update(json).digest("hex").slice(0, 16);
  } catch {
    return "unhashable";
  }
}
