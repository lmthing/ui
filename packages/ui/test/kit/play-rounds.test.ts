import { expect, it } from "vitest";
import { z } from "zod";
import { sessionState, text, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

const def = {
  meta: {
    id: "HandoffFixture",
    group: "content",
    purpose: "Pass a private entry between readers.",
    pick: "Fixture for a private handoff.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Veil the entry before handing off.",
    session: {
      kind: "rounds",
      items: "rows",
      hidden: ["secret"],
      reveal: "show",
      hide: "veil",
      restart: "reset",
    },
    actions: { parts: { show: ["press"], veil: ["press"], reset: ["press"] } },
    confirmParts: ["reset"],
    successActions: ["reset.press"],
    read: ({ rows, $session }) => [JSON.stringify(rows), JSON.stringify($session)],
  },
  props: z.strictObject({ rows: z.array(z.strictObject({ name: text(12), secret: text(24) })) }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const rows = [
  { name: "First", secret: "Secret alpha" },
  { name: "Second", secret: "Secret beta" },
];
const press = (part: string) => ({ address: `handoff/${part}`, action: "press" });

it("veils the next participant, hides both secrets from reading, and restarts only after confirmation", () => {
  const controller = createScreenController({
    screen: { id: "s", components: [{ id: "handoff", c: def.meta.id, rows }] },
    defs: { [def.meta.id]: def },
  });
  const read = (name?: string) => {
    const reading = controller.read();
    expect(reading).not.toMatch(/Secret alpha|Secret beta/);
    if (name) expect(reading).toContain(name);
    return reading;
  };
  const current = () => sessionState(def.meta, { rows }, (part) => controller.store.get(`s/handoff/${part}`));
  expect(read("First")).not.toContain("Second");
  expect(controller.act([press("show"), press("veil"), press("veil")])).toMatchObject({ ok: false, at: 2 });
  expect(current()).toMatchObject({ index: 0, revealed: false });
  expect(controller.act(press("show")).ok).toBe(true);
  expect(current()).toMatchObject({ item: rows[0], complete: false });
  expect(read("First")).toContain("[handoff/veil press]");
  expect(controller.act(press("veil")).ok).toBe(true);
  expect(current()).toMatchObject({ index: 1, item: { name: "Second" }, revealed: false });
  expect(read("Second")).not.toContain("First");
  expect(controller.act(press("show")).ok).toBe(true);
  expect(read("Second")).not.toContain("(success)");
  expect(controller.act(press("veil")).ok).toBe(true);
  expect(read()).toContain("(success)");
  expect(current()).toMatchObject({ index: 1, item: {}, revealed: false, complete: true });
  expect(controller.act(press("show")).ok).toBe(false);
  expect(controller.act(press("reset")).ok).toBe(true);
  expect(controller.press("confirm/cancel").ok).toBe(true);
  expect(read()).toContain("(success)");
  expect(controller.act([press("reset"), { address: "confirm/confirm", action: "press" }]).ok).toBe(true);
  expect(read("First")).not.toContain("(success)");
});
