import { expect, it } from "vitest";
import { actionTable, handlerFor } from "./table";
import { createScreenController } from "../index";
import { components } from "@lmthing/ui/catalog";
it("dispatches all existing action names and safely handles unknown names", () => {
  expect(Object.keys(actionTable)).toEqual([
    "press",
    "play",
    "pause",
    "seek",
    "select",
    "type",
    "set",
    "toggle",
    "check",
    "increment",
    "decrement",
    "start",
    "stop",
    "send",
    "dismiss",
    "swipe",
  ]);
  for (const name of Object.keys(actionTable)) expect(handlerFor(name)).toBe(actionTable[name]);
  expect(typeof handlerFor("toString")).toBe("function");
  const runtime = createScreenController({
    screen: { id: "test", components: [{ id: "c1", c: "Button", label: "Next" }] },
    defs: components,
  });
  expect(runtime.act({ address: "c1", action: "toString" })).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(runtime.store.snapshot()).toEqual({});
});
