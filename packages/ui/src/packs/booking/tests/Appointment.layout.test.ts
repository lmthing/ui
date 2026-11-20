import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, type RenderedElement } from "../../../../test/render";

function pairedNumbers(node: RenderedElement): boolean {
  const hasPart = (cell: RenderedElement | undefined, part: string) =>
    cell?.children.some((child) => child.attributes.includes(`data-testid="home/c1/${part}"`));
  return Boolean(
    (hasPart(node.children[0], "minutes") && hasPart(node.children[1], "price")) ||
    node.children.some(pairedNumbers),
  );
}

it.each(["card", "summary"] as const)("pairs the %s duration and price across optional details", (style) => {
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
        expect(pairedNumbers(elementAt(html, "home/c1/root"))).toBe(true);
      }
});
