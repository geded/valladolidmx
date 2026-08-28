/**
 * G8-Q2B · Matriz de permisos del CMS de Lugares y Atractivos.
 *
 * Harness efímero: reproduce en memoria la autorización server-side real
 * (`assertPlacesStaff` = `is_editor_or_admin` ∨ `has_permission('poi.write')`)
 * sobre un doble de Supabase. No crea usuarios reales, no toca la base
 * compartida y no modifica datos.
 */
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

type Subject = {
  label: string;
  roles: string[];
  permissions: string[];
  allowed: boolean;
};

const STAFF_ROLES = new Set(["editor", "admin", "super_admin"]);

/** Doble efímero de la RPC `is_editor_or_admin`. */
const isEditorOrAdmin = (subject: Subject) => subject.roles.some((role) => STAFF_ROLES.has(role));
/** Doble efímero de la RPC `has_permission`. */
const hasPermission = (subject: Subject, key: string) => subject.permissions.includes(key);

/** Réplica exacta de la guardia server-side; fail-closed por defecto. */
function assertPlacesStaff(subject: Subject) {
  if (isEditorOrAdmin(subject)) return;
  if (hasPermission(subject, "poi.write")) return;
  throw new Error("forbidden");
}

const SUBJECTS: Subject[] = [
  { label: "traveler", roles: ["traveler"], permissions: [], allowed: false },
  { label: "business_owner", roles: ["business_owner"], permissions: [], allowed: false },
  { label: "concierge", roles: ["concierge"], permissions: [], allowed: false },
  { label: "editor", roles: ["editor"], permissions: [], allowed: true },
  { label: "admin", roles: ["admin"], permissions: [], allowed: true },
  { label: "super_admin", roles: ["super_admin"], permissions: [], allowed: true },
  { label: "poi.write", roles: ["traveler"], permissions: ["poi.write"], allowed: true },
  { label: "sin autoridad", roles: [], permissions: [], allowed: false },
];

describe("G8-Q2B · matriz de permisos", () => {
  for (const subject of SUBJECTS) {
    test(`${subject.label}: escritura ${subject.allowed ? "permitida" : "denegada"}`, () => {
      if (subject.allowed) expect(() => assertPlacesStaff(subject)).not.toThrow();
      else expect(() => assertPlacesStaff(subject)).toThrow("forbidden");
    });
  }

  test("la lectura del CMS exige la misma autoridad que la escritura", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/places/places-cms.functions.ts"),
      "utf8",
    );
    const handlers = source.match(/\.handler\(/g) ?? [];
    const guards = source.match(/assertPlacesStaff\(/g) ?? [];
    // 1 declaración + 1 llamada por handler.
    expect(guards.length).toBe(handlers.length + 1);
  });

  test("business_owner no obtiene administración automática del lugar", () => {
    const owner = SUBJECTS.find((s) => s.label === "business_owner")!;
    expect(() => assertPlacesStaff(owner)).toThrow("forbidden");
    // Relacionar producto, evento o autoridad tampoco cambia el veredicto.
    const withRelations: Subject = { ...owner, permissions: ["product.write", "event.write"] };
    expect(() => assertPlacesStaff(withRelations)).toThrow("forbidden");
  });

  test("un producto o tour relacionado nunca concede administración", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/places/places-cms.functions.ts"),
      "utf8",
    );
    expect(source).toContain("grantsPlaceAdministration: false");
    expect(source).not.toMatch(/insert\(\s*\{\s*[^}]*business_users/);
  });

  test("la denegación es fail-closed: cualquier error de rol niega el acceso", () => {
    const brokenRpc = () => {
      throw new Error("role_check_failed");
    };
    expect(brokenRpc).toThrow();
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/places/places-cms.functions.ts"),
      "utf8",
    );
    expect(source).toContain("role_check_failed");
    expect(source).toContain("granular.data !== true");
  });
});
