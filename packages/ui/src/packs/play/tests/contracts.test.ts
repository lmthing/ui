import { selectedIds } from "../../../../scripts/build";
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Definition,
} from "@lmthing/ui/catalog";

const ids = ["ScoreSheet", "Dice", "Spinner", "Trivia", "TurnOrder", "TeamPicker"] as const;
const defs = components as Record<string, Definition>;
const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "person", fields: ["name", "detail"] }],
    items: [
      { id: "anna", type: "person", sample: true, name: "Anna", detail: "First player" },
      { id: "ben", type: "person", sample: true, name: "Ben", detail: "Second player" },
    ],
  },
  { things: [], items: [{ id: "bad", type: "person", sample: true, name: 4 }] },
  {
    things: [{ type: "person", fields: ["name"] }],
    items: Array.from({ length: 13 }, (_, index) => ({
      id: `person_${index}`,
      type: "person",
      sample: false,
      name: "a".repeat(180),
    })),
  },
];
describe("play contracts", () => {
  it.each(selectedIds(ids))("validates %s examples, fallbacks, strict props and probe shapes", (id) => {
    const def = defs[id]!;
    expect(def.examples.length).toBeGreaterThanOrEqual(2);
    for (const example of def.examples) {
      expect(def.props.safeParse(example).success).toBe(true);
      expect(def.props.safeParse({ ...(example as object), colour: "red" }).success).toBe(false);
      expect(def.props.safeParse({ ...(example as object), style: "unknown" }).success).toBe(false);
    }
    for (const cast of casts) expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
    expect(def.meta.tier).toBe("phone");
    expect(def.meta.realPath).not.toBe("");
    expect(def.meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(def.probes.filter((probe) => probe.kind === "choose").length).toBeGreaterThanOrEqual(2);
    expect(
      def.probes.some(
        (probe) =>
          probe.kind === "choose" &&
          probe.expect !== id &&
          !(probe.expect in defs && ids.includes(probe.expect as (typeof ids)[number])),
      ),
    ).toBe(true);
    expect(def.probes.some((probe) => probe.kind === "write" && probe.expect === id)).toBe(true);
    expect(def.probes.some((probe) => probe.kind === "read")).toBe(true);
    if (def.meta.status === "draft") expect(def).not.toHaveProperty(id);
  });
  it("uses neutral empty-cast placeholders", () => {
    const cast = casts[0]!;
    expect(components.ScoreSheet.fallback({ cast }).players[0]?.name).toBe(placeholderTitle(0));
    expect(components.Spinner.fallback({ cast }).options[0]?.label).toBe(placeholderTitle(0));
    expect(components.Trivia.fallback({ cast }).questions[0]?.question).toBe(placeholderTitle(0));
    expect(components.TurnOrder.fallback({ cast }).players[0]?.name).toBe(placeholderTitle(0));
    expect(components.TeamPicker.fallback({ cast }).teams[0]?.label).toBe(placeholderTitle(0));
  });
  it("addresses score cells, sharing risk and destructive confirmation", () => {
    const lines = readComponent(components.ScoreSheet, components.ScoreSheet.examples[0], "s1").join("\n");
    expect(lines).toContain("[s1/r1/score set");
    expect(lines).toContain("[s1/share press !needs-people]");
    expect(components.ScoreSheet.meta.confirmParts).toEqual(["reset"]);
    expect(components.Spinner.meta.confirmParts).toEqual(["reset"]);
    expect(components.Trivia.meta.confirmParts).toEqual(["restart"]);
    expect(components.TurnOrder.meta.confirmParts).toEqual(["restart"]);
    expect(components.TeamPicker.meta.confirmParts).toEqual(["remake"]);
  });
  it("omits unrevealed trivia answers, explanations and later questions from reads", () => {
    const input = components.Trivia.props.parse(components.Trivia.examples[0]);
    const lines = readComponent(components.Trivia, input, "t1").join("\n");
    expect(lines).toContain(input.questions[0]!.question);
    expect(lines).not.toContain(input.questions[0]!.answer);
    expect(lines).not.toContain(input.questions[0]!.explain!);
    expect(lines).not.toContain(input.questions[1]!.question);
    expect(lines).toContain("[t1/reveal press]");
  });
});

it.each(selectedIds(ids))("retains every declared %s action in its example readings", (id) => {
  const def = defs[id]!;
  for (const example of def.examples) {
    const input = stampItemIds(def.meta, def.props.parse(example));
    const read = readComponent(def, example, "c1").join("\n");
    for (const action of affordancesOf(def.meta, input, "c1"))
      expect(read).toContain(`[${action.address} ${action.action}`);
  }
});
