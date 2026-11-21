import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resilientFactory } from "../src/pwa/resilient-lazy";

function Piece() {
  return React.createElement("span", null, "pieza");
}

describe("resilientLazy (app sin señal)", () => {
  it("con señal entrega la misma pieza que React.lazy", async () => {
    const mod = await resilientFactory(async () => ({ default: Piece }));
    expect(mod.default).toBe(Piece);
  });

  it("sin señal no lanza error: entrega una pieza vacía en lugar de tumbar la página", async () => {
    const mod = await resilientFactory<React.ComponentType>(async () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    expect(mod.default).not.toBe(Piece);
    expect(renderToStaticMarkup(React.createElement(mod.default))).toBe("");
  });
});
