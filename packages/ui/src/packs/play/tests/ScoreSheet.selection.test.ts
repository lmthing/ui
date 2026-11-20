import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";

it("offers visible round labels while persisting the original round keys", () => {
  const { ScoreSheet } = components;
  const sheet = {
    id: "s1",
    c: "ScoreSheet",
    ...ScoreSheet.examples[1]!,
    overflow: "page",
    rounds: [
      { label: "First hand", points: [-2, 5] },
      { label: "Second hand", points: [null, null] },
    ],
  };
  const runtime = createScreenController({
    defs: { ScoreSheet },
    screen: { id: "home", components: [sheet] },
  });
  const select = (value: string) => runtime.act({ address: "s1/root", action: "select", value });
  const choices = 'choices ["First hand","Second hand"]';
  try {
    expect(runtime.read()).toContain(`[s1 select = "First hand"; ${choices}]`);
    expect(select("Second hand")).toMatchObject({ ok: true });
    expect(runtime.store.get("home/s1/$selectedRound")).toBe("2");
    expect(runtime.snapshotScreen().components[0]).toMatchObject({
      selectedRound: "2",
      rounds: sheet.rounds,
    });
    expect(runtime.read()).toContain(`[s1 select = "Second hand"; ${choices}]`);
    expect(runtime.read()).toContain("[s1/r3/score set");
    expect(runtime.read()).not.toContain("[s1/r1/score set");
    expect(select("Third hand")).toMatchObject({ ok: false, code: "invalid_value" });
    expect(select("1")).toMatchObject({ ok: true });
    expect(runtime.snapshotScreen().components[0]).toMatchObject({ selectedRound: "1" });
  } finally {
    runtime.dispose();
  }
});
