import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { checkStep, selectionFixture } from "../../probes/fixtures";

const chapterList: Definition = {
  meta: {
    id: "ChaptersFixture",
    group: "content",
    purpose: "Jump to a chapter.",
    pick: "Show chapter marks.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Saved chapter marks.",
    drives: "Player",
    items: { key: "chapters", parts: ["root"] },
    actions: { items: { root: ["press"] } },
  },
  props: z.strictObject({ chapters: z.array(z.strictObject({ at: z.int() })) }),
  fallback: () => ({ chapters: [] }),
  examples: [],
  probes: [],
};

it("offers a driven seek only while the destination's bound selection permits a direct seek", () => {
  const { defs, tableEntry } = selectionFixture();
  const binding = { component: "Table", check: "pick", all: "all", requireSelection: true } as const;
  const Player = { ...components.Player, meta: { ...components.Player.meta, selectionBinding: binding } };
  const player = { c: "Player", id: "p1", media: "lib:fixture", title: "Recording", seconds: 30 };
  const driver = { c: chapterList.meta.id, id: "c1", chapters: [{ at: 12 }] };
  const screen = { id: "home", components: [driver, player, tableEntry] };
  const seek = vi.fn();
  const session = { play: vi.fn(), pause: vi.fn(), seek, dispose: vi.fn() };
  const runtime = createScreenController({
    screen,
    defs: { ChaptersFixture: chapterList, Player, Table: defs.Table },
    media: { open: () => session },
  });
  try {
    expect(runtime.canPress("c1/r1")).toBe(false);
    expect(runtime.press(checkStep.address).ok).toBe(true);
    expect(runtime.act({ address: "p1/scrubber", action: "seek", value: 20 }).ok).toBe(true);
    expect(runtime.read()).toContain("[c1/r1 press]");
    expect(runtime.press("c1/r1").ok).toBe(true);
    expect(seek.mock.calls).toEqual([[20], [12]]);
  } finally {
    runtime.dispose();
  }
});
