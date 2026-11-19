import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, type RenderedElement } from "../../../../test/render";

function priceColumn(node: RenderedElement): number | undefined {
  const column = node.children.findIndex((cell) =>
    cell.children.some((child) => child.attributes.includes('data-testid="home/c1/price"')),
  );
  return column < 0 ? node.children.map(priceColumn).find((value) => value !== undefined) : column;
}

it.each(["card", "summary"] as const)(
  "keeps the %s price in the right column with optional details",
  (style) => {
    for (const withPerson of [false, true])
      for (const withPlace of [false, true])
        for (const state of ["filled", "success"] as const) {
          const input = {
            ...components.Appointment.examples[0]!,
            style,
            with: withPerson ? "Sam" : undefined,
            place: withPlace ? "Park" : undefined,
            price: 0,
          };
          const html = renderInstance("Appointment", input, state, {
            preset: "calm",
            mode: "light",
            accent: "moss",
          });
          expect(priceColumn(elementAt(html, "home/c1/root"))).toBe(1);
        }
  },
);
