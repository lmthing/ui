import { expect, it, vi } from "vitest";
import { z } from "zod";
import * as catalog from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

function definition(id: string, part: string): catalog.Definition {
  return {
    meta: {
      id,
      group: "input",
      purpose: "Capture a mark",
      pick: "Capture a mark",
      region: "body",
      tier: "phone",
      weight: 1,
      realPath: "Local capture",
      actions: { parts: { [part]: ["set"] } },
      ...catalog.hostOnlyParts({ parts: [part] }),
    },
    props: z.strictObject({}),
    fallback: () => ({}),
    examples: [],
    probes: [],
  };
}

const screen = {
  id: "home",
  components: [
    { id: "home", c: "Fixture" },
    { id: "pad", c: "OtherPad" },
  ],
};
const defs = { Fixture: definition("Fixture", "pad"), OtherPad: definition("OtherPad", "root") };
const address = "home/home/pad";
const mark = "local-ref";
const step = { address, action: "set", value: mark };
const unavailable = { ok: false, code: "not_actionable", at: 0 };

it("offers no public catalog entry point for privileged planning", () => {
  expect(catalog).not.toHaveProperty("planHostAct");
  expect(catalog.planAct(screen, defs, {}, [step], null, "controller")).toMatchObject(unavailable);
});

it("writes and tags only the authorized part when the screen and component have the same id", () => {
  const onAction = vi.fn();
  const controller = createScreenController({ screen, defs, onAction });
  const pad = controller.registerPrivateMarkPart(address, (reference) => reference === mark);
  pad.capture(mark);
  expect(controller.store.get(address)).toBeUndefined();
  expect(controller.store.get("home/pad")).toBeUndefined();
  const unmount = controller.registerPart(address);
  expect(controller.act({ ...step, address: "home/pad" }, undefined, Symbol())).toMatchObject(unavailable);
  pad.capture(mark);
  expect(controller.store.get(address)).toBe(mark);
  expect(controller.store.get(catalog.privateMarkKey("home", "home/pad"))).toBe(true);
  expect(controller.store.get("home/pad")).toBeUndefined();
  expect(controller.store.get(catalog.privateMarkKey("home", "pad"))).toBeUndefined();
  expect(onAction).toHaveBeenCalledExactlyOnceWith(step);
  unmount();
  pad.unregister();
  controller.dispose();
});
