import { expect, it, vi } from "vitest";
import { z } from "zod";
import { text, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { begin, confirm, def } from "./commands.fixture";

it("confirms a command offered by a screen-scoped record projection", () => {
  const contextual = {
    ...def,
    meta: {
      ...def.meta,
      actions: { ...def.meta.actions, when: { "begin.start": { allowed: true } } },
      recordRuntime: {
        kind: "permissions",
        project: ({ screen }) => ({ allowed: screen?.id === "home" }),
      },
    },
  } satisfies Definition;
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const controller = createScreenController({
    screen: { id: "home", components: [{ id: "control", c: contextual.meta.id }] },
    defs: { [contextual.meta.id]: contextual },
    hostCommands: { commands: { begin: { allows: () => true, run } } },
  });
  expect(controller.read()).toContain("[control/begin start");
  expect(controller.act(begin).ok).toBe(true);
  expect(run).not.toHaveBeenCalled();
  expect(controller.read()).toContain("[confirm/confirm press]");
  expect(controller.act(confirm).ok).toBe(true);
  expect(run).toHaveBeenCalledOnce();
});

const choices = {
  ...def,
  meta: {
    id: "ChoicesFixture",
    group: "input",
    purpose: "Check choices.",
    pick: "Check choices.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Choose rows.",
    items: { key: "rows", parts: ["root"] },
    actions: { items: { root: ["check"] } },
  },
  props: z.strictObject({ rows: z.array(z.strictObject({ label: text(20), checked: z.boolean() })).max(3) }),
} satisfies Definition;

it("uses the same enabled selection for the offer, execution and acknowledgement identity", async () => {
  const bound = {
    ...def,
    meta: {
      ...def.meta,
      confirmParts: [],
      selectionBinding: { component: choices.meta.id, check: "root", all: "all", requireSelection: true },
      hostCommands: {
        ...def.meta.hostCommands,
        identity: ({ props }) =>
          (props.$selection as { selected?: string[] } | undefined)?.selected?.join(","),
      },
    },
  } satisfies Definition;
  const run = vi.fn(() => ({ status: "accepted" as const }));
  const controller = createScreenController({
    screen: {
      id: "home",
      components: [
        {
          id: "options",
          c: choices.meta.id,
          rows: [
            { label: "First", checked: true },
            { label: "Second", checked: true },
          ],
        },
        { id: "control", c: bound.meta.id },
      ],
    },
    defs: { [choices.meta.id]: choices, [bound.meta.id]: bound },
    hostCommands: { commands: { begin: { allows: () => true, run } } },
  });
  controller.registerDisabledPart("options/r2");
  expect(controller.read()).toContain("[control/begin start");
  expect(controller.act(begin).ok).toBe(true);
  expect(run).toHaveBeenCalledOnce();
  await Promise.resolve();
  expect(controller.read()).toContain("control operation begin accepted");
  expect(controller.hostOperations("control")).toMatchObject([{ name: "begin", status: "accepted" }]);
});
