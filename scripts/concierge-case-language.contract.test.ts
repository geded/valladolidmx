import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const source = readFileSync("src/components/concierge/CaseFileView.tsx", "utf8");
const route = readFileSync("src/routes/_authenticated/concierge/expedientes.$caseId.tsx", "utf8");

describe("Expediente Concierge en lenguaje claro", () => {
  test("traduce los estados operativos sin alterar sus valores internos", () => {
    expect(source).toContain('new: "Nuevo"');
    expect(source).toContain('normal: "Normal"');
    expect(source).toContain('on_time: "A tiempo"');
    expect(source).toContain('travel_plan: "Mi Viaje"');
    expect(source).toContain('travel_plan_item: "Experiencia guardada en Mi Viaje"');
  });

  test("no presenta claves técnicas en los puntos principales de lectura", () => {
    expect(source).not.toContain("{f.case.status}");
    expect(source).not.toContain("{r.status}");
    expect(source).not.toContain("{q.status}");
    expect(source).not.toContain("{t.event_type}");
    expect(source).not.toContain("Sin perfil M2 disponible");
    expect(source).not.toContain("Plan vacío al momento del handoff");
    expect(source).not.toContain(">read-only<");
  });

  test("presenta el contexto y las sugerencias de Alux para lectura humana", () => {
    expect(source).toContain("Información disponible cuando el viajero envió su selección");
    expect(source).toContain("Experiencias guardadas");
    expect(source).toContain("Alux interpreta la información disponible");
    expect(source).toContain("<AluxReadableText text={r.text} />");
    expect(source).not.toContain("JSON.stringify(payload.territorial_memory");
  });

  test("usa un título comprensible para la vista interna", () => {
    expect(route).toContain(">Detalle del expediente</h1>");
    expect(route).not.toContain(">Customer Case File</h1>");
  });

  test("identifica el expediente y presenta el contacto sólo en la vista interna", () => {
    expect(source).toContain("Expediente {f.case.id.slice(0, 8).toUpperCase()}");
    expect(source).toContain("{internal && <TravelerContactSection traveler={f.traveler} />}");
    expect(source).toContain('title="Cliente y contacto"');
    expect(source).toContain("Autorizado por el viajero");
    expect(source).toContain("Sin autorización de contacto");
  });

  test("mantiene separadas las cotizaciones empresariales y la propuesta final", () => {
    expect(source).toContain('"Propuesta económica del Concierge"');
    expect(source).toContain("Las empresas sólo cotizan sus servicios.");
    expect(source).toContain("Preparar propuesta final para el viajero");
    expect(source).toContain("Total seleccionado:");
  });
});
