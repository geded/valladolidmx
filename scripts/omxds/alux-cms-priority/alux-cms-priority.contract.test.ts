import { describe, expect, it } from "bun:test";
import {
  extractSearchTerms,
  prioritizeRows,
  productOfferFacts,
  productSellsOnline,
} from "../../../src/lib/alux/converse-priority";
import {
  candidateToPromptLine,
  rankConverseCandidates,
} from "../../../src/lib/alux/converse-grounding";
import {
  parseTravelIntent,
  type AluxConverseCandidate,
} from "../../../src/lib/alux/converse-contract";

const published = { status: "published", deleted_at: null } as const;

function cand(
  id: string,
  family: AluxConverseCandidate["family"],
  title: string,
  extra: Partial<AluxConverseCandidate> = {},
): AluxConverseCandidate {
  return {
    entityType: family === "experiencia" ? "product" : "business",
    entityId: id,
    family,
    title,
    href: `/x/${id}`,
    destinationSlug: "valladolid",
    destinationLabel: "Valladolid",
    scope: "destination",
    summary: null,
    facts: [],
    unavailable: [],
    tags: [family],
    planKind: "business",
    imageUrl: null,
    subtitle: null,
    coords: null,
    openState: null,
    ...extra,
  };
}

describe("Alux lee todo el CMS, no sólo los primeros en orden alfabético", () => {
  it("una empresa que empieza con Z entra aunque haya más de 60 antes", () => {
    const rows = [
      ...Array.from({ length: 64 }, (_, i) => ({ id: `a${i}`, name: `Aaa ${i}`, text: "hotel" })),
      { id: "z", name: "Zazil Tunich", text: "cenote museo cena romántica" },
    ];
    const picked = prioritizeRows(rows, {
      limit: 60,
      terms: extractSearchTerms("Quiero una cena romántica en un cenote"),
      idOf: (r) => r.id,
      nameOf: (r) => r.name,
      textOf: (r) => r.text,
    });
    expect(picked[0]?.id).toBe("z");
  });

  it("una empresa con visibilidad pagada se lee antes que otra sin pagar", () => {
    const rows = [
      { id: "a", name: "Alfa" },
      { id: "z", name: "Zeta" },
    ];
    const picked = prioritizeRows(rows, {
      limit: 1,
      terms: [],
      idOf: (r) => r.id,
      nameOf: (r) => r.name,
      textOf: (r) => r.name,
      weightOf: (r) => (r.id === "z" ? 55 : 0),
    });
    expect(picked.map((r) => r.id)).toEqual(["z"]);
  });

  it("busca sin acentos ni plurales y quita el nombre del destino", () => {
    expect(extractSearchTerms("¿Qué cenotes hay en Valladolid?", ["Valladolid"])).toEqual([
      "cenote",
    ]);
    expect(extractSearchTerms("cena ROMÁNTICA")).toEqual(["cena", "romantica"]);
  });
});

describe("Precios: sólo experiencias y artesanías autorizadas se venden en línea", () => {
  it("experiencia con venta en línea autorizada da su precio de venta", () => {
    const offer = productOfferFacts({
      ...published,
      product_type: "experiencia",
      direct_sale_enabled: true,
      direct_sale_price_amount: 245000,
      direct_sale_currency: "MXN",
      price_amount: 2450,
    });
    expect(offer.sellsOnline).toBe(true);
    expect(offer.facts[0]).toBe("Se vende en línea en Valladolid.mx: 2,450 MXN");
  });

  it("artesanía autorizada por el administrador también se vende en línea", () => {
    expect(
      productSellsOnline({
        ...published,
        product_type: "artesanal",
        direct_sale_enabled: true,
        direct_sale_price_amount: 89000,
      }),
    ).toBe(true);
  });

  it("artesanía sin autorización sólo muestra precio de referencia", () => {
    const offer = productOfferFacts({
      ...published,
      product_type: "artesanal",
      direct_sale_enabled: false,
      price_amount: 890,
    });
    expect(offer.sellsOnline).toBe(false);
    expect(offer.facts[0]).toBe(
      "Precio de referencia: 890 MXN (no se vende en línea; lo cotiza el concierge)",
    );
  });

  it("un traslado con venta activada no se vende en línea: precio de referencia", () => {
    const offer = productOfferFacts({
      ...published,
      product_type: "transporte",
      direct_sale_enabled: true,
      direct_sale_price_amount: 180000,
      price_amount: 1800,
    });
    expect(offer.sellsOnline).toBe(false);
    expect(offer.facts[0]?.startsWith("Precio de referencia: 1,800 MXN")).toBe(true);
  });

  it("una experiencia que se vende en línea trae anticipación y cancelación", () => {
    const offer = productOfferFacts({
      ...published,
      product_type: "experiencia",
      direct_sale_enabled: true,
      direct_sale_price_amount: 245000,
      direct_sale_min_lead_hours: 48,
      direct_sale_cancellation_policy: "Sin costo hasta 72 horas antes",
      capacity: 8,
    });
    expect(offer.facts).toContain("Cupo: hasta 8 personas");
    expect(offer.facts).toContain("Reservar con 48 h de anticipación");
    expect(offer.facts).toContain("Cancelación: Sin costo hasta 72 horas antes");
  });
});

describe("Visibilidad pagada como Google: primero en su categoría sólo si encaja", () => {
  const ctx = (q: string) => ({
    activeKey: null,
    tripItems: [],
    intent: parseTravelIntent(q, { knownDestinationSlugs: ["valladolid"] }),
  });

  it("la pagada que encaja sube al primer lugar de su categoría", () => {
    const q = "comida japonesa";
    const ranked = rankConverseCandidates(
      [
        cand("org", "restaurante", "Sushi del Centro", { summary: "comida japonesa y sushi" }),
        cand("paid", "restaurante", "Kuran", { summary: "comida japonesa", aluxWeight: 55 }),
      ],
      ctx(q),
      { queryTerms: extractSearchTerms(q) },
    );
    expect(ranked[0]?.candidate.entityId).toBe("paid");
  });

  it("la pagada que no encaja con el tema no desplaza a la mejor opción", () => {
    const q = "comida japonesa";
    const ranked = rankConverseCandidates(
      [
        cand("org", "restaurante", "Sushi del Centro", { summary: "comida japonesa" }),
        cand("paid", "restaurante", "Cochinita Real", { summary: "cochinita pibil", aluxWeight: 55 }),
      ],
      ctx(q),
      { queryTerms: extractSearchTerms(q) },
    );
    expect(ranked[0]?.candidate.entityId).toBe("org");
  });

  it("sólo una pagada por categoría sube al primer lugar", () => {
    const ranked = rankConverseCandidates(
      [
        cand("p1", "hotel", "Hotel Uno", { aluxWeight: 55 }),
        cand("p2", "hotel", "Hotel Dos", { aluxWeight: 55 }),
        cand("o", "hotel", "Hotel Abc", { facts: [{ id: "F1", text: "x" }, { id: "F2", text: "y" }] }),
      ],
      ctx("hola"),
      { queryTerms: [] },
    );
    const order = ranked.map((r) => r.candidate.entityId);
    expect(["p1", "p2"]).toContain(order[0]);
    expect(order[1]).toBe("o");
  });

  it("Alux recibe la marca recomendado=sí para la empresa pagada", () => {
    const line = candidateToPromptLine(cand("p", "hotel", "Hotel Uno", { aluxWeight: 55 }), 0);
    expect(line.includes("recomendado=sí")).toBe(true);
    const plain = candidateToPromptLine(cand("o", "hotel", "Hotel Dos"), 0);
    expect(plain.includes("recomendado=sí")).toBe(false);
  });
});
