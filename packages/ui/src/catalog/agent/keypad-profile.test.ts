import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen } from "./index";
import type { Definition } from "../probes";
import { resolveTextKeypad } from "./keypad-profile";

const profile = { characters: "0123456789*#+", maxLength: 5 };
const publicPad: Definition = {
  meta: {
    id: "PublicPad",
    group: "input",
    purpose: "Enter text",
    pick: "Enter text",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local keypad",
    actions: { parts: { pad: ["type"] } },
  },
  props: z.strictObject({ value: z.string() }).meta({ keypadProfiles: { pad: profile } }),
  fallback: () => ({ value: "" }),
  examples: [],
  probes: [],
};

it("validates exact keypad characters and preserves draft edits, including non-BMP keys", () => {
  const unicode = { characters: "+3🟡", maxLength: 3 };
  expect(resolveTextKeypad({ append: "🟡" }, "+3", unicode)).toEqual({ value: "+3🟡" });
  expect(resolveTextKeypad({ backspace: true }, "+3🟡", unicode)).toEqual({ value: "+3" });
  expect(resolveTextKeypad({ clear: true }, "+3🟡", unicode)).toEqual({ value: "" });
  for (const bad of ["0000", "+3🟡3", { append: "+3" }, { clear: false }, { append: "3", clear: true }])
    expect(resolveTextKeypad(bad, "", unicode)).toMatchObject({ code: "invalid_value" });
});

it("reads a declared text profile and plans exact drafts without applying decimal limits", () => {
  const screen = {
    id: "home",
    components: [{ id: "dial", c: publicPad.meta.id, value: "+0" }],
  };
  const defs = { PublicPad: publicPad };
  const step = (value: unknown) => ({ address: "dial/pad", action: "type", value });
  expect(readScreen(screen, defs)).toContain('[dial/pad type = "+0"; chars "0123456789*#+"; length 5]');
  const result = planAct(screen, defs, {}, [
    step({ append: "*" }),
    step({ append: "#" }),
    step({ append: "0" }),
  ]);
  if (!result.ok) throw new Error(result.code);
  expect(result.values["home/dial/pad"]).toBe("+0*#0");
  expect(readScreen(screen, defs, result.values)).toContain(
    '[dial/pad type = "+0*#0"; chars "0123456789*#+"; length 5]',
  );
  expect(planAct(screen, defs, result.values, [step({ append: "1" })])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  expect(planAct(screen, defs, result.values, [step("00#")])).toMatchObject({
    ok: true,
    values: { "home/dial/pad": "00#" },
  });
});
