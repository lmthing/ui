import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../probes";
import type { Values } from "..";
import { credentialToggleOn, stageCredentialToggle } from ".";

const fixture: Definition = {
  meta: {
    id: "Fixture",
    group: "content",
    purpose: "Show an opaque test value.",
    pick: "A test fixture.",
    tier: "phone",
    realPath: "Test only.",
    weight: 1,
    region: "body",
    actions: { parts: { reveal: ["toggle"] }, credentialToggles: { reveal: "idValue" } },
  },
  props: z.strictObject({ idValue: z.string().trim() }),
  examples: [],
  probes: [],
  fallback: () => ({ idValue: "Test only" }),
};

it("binds a grant to the parsed credential and stages a fresh grant rather than toggling a stale one off", () => {
  const stage = (idValue: string, value?: boolean, action = "toggle") =>
    stageCredentialToggle(
      { id: "home", components: [{ id: "c1", c: "Fixture", idValue }] },
      { Fixture: fixture },
      next,
      { address: "c1/reveal", action, value },
    );
  const next: Values = { "home/c1/reveal": true };
  const target = "home/c1/reveal";
  expect(credentialToggleOn(next[target], "demoA")).toBe(false);
  expect(stage("  demoA ")).toBe(" = true");
  expect(credentialToggleOn(next[target], "demoA")).toBe(true);
  expect(stage("demoB", undefined, "press")).toBeUndefined();
  expect(credentialToggleOn(next[target], "demoA")).toBe(true);
  expect(stage("demoB")).toBe(" = true");
  expect(credentialToggleOn(next[target], "demoA")).toBe(false);
  expect(credentialToggleOn(next[target], "demoB")).toBe(true);
  expect(JSON.stringify(next)).toBe('{"home/c1/reveal":{}}');
  expect(stage("demoB", false)).toBe(" = false");
  expect(credentialToggleOn(next[target], "demoB")).toBe(false);
});
