import { expect, it, vi } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const input = {
  style: "share",
  title: "Time in each area",
  points: [
    { label: "Park", value: 10, icon: "tree", goto: "park" },
    { label: "River", value: 20, icon: "waves" },
  ],
};

it("keeps static rows static and dispatches a linked legend press at its item address", () => {
  const html = renderInstance("Bars", input, "filled", theme);
  expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="button"');
  expect(elementAt(html, "home/c1/r2/root").attributes).not.toContain('role="button"');
  expect(html.match(/<svg\b/g)).toHaveLength(3);
  const screen = { id: "home", components: [{ id: "c1", c: "Bars", ...input }] };
  const onLink = vi.fn();
  const controller = createScreenController({ screen, defs: { Bars: components.Bars }, onLink });
  expect(controller.act({ address: "home/c1/r2", action: "press" }).ok).toBe(false);
  expect(controller.act({ address: "home/c1/r1", action: "press" }).ok).toBe(true);
  expect(onLink).toHaveBeenCalledExactlyOnceWith("park", "home/c1/r1");
});
