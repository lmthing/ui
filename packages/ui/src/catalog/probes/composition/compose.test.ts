import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  archetypes,
  components,
  createRegistry,
  composePrompt,
  scoreComposition,
  runComposeProbes,
  variantVocabulary,
  itemVariantProps,
  variantProps,
  text,
} from "@lmthing/ui/catalog";
const cast = { things: [], items: [] };
it("adds the vocabulary once and the screen caps only for recipes with shared axes", () => {
  const meta = archetypes.chat.meta;
  expect(composePrompt(meta, "thread", cast, components)).not.toContain(variantVocabulary);
  const defs = {
    ...components,
    Header: {
      ...components.Header,
      meta: { ...components.Header.meta, variants: { align: ["start", "center"] } },
    },
  } as const;
  const prompt = composePrompt(meta, "thread", cast, defs);
  expect(prompt.split(variantVocabulary)).toHaveLength(2);
  expect(prompt).toContain('At most one third of items per component get mark "highlight" (round down).');
  expect(prompt).toContain("Never infer an axis from the data alone.");
  expect(prompt).toContain("one hero emphasis and one cover collection per screen");
});

it("snapshots the layout guidance for grounded content and clear actions", async () => {
  const { browse, calendar, dashboard, detail, journal, onboarding, tracker } = archetypes;
  const prompts = [
    composePrompt(dashboard.meta, "rings", cast, components),
    composePrompt(dashboard.meta, "charts", cast, components),
    composePrompt(browse.meta, "shelves", cast, components),
    composePrompt(tracker.meta, "timer", cast, components),
    composePrompt(detail.meta, "facts", cast, components),
    composePrompt(calendar.meta, "week", cast, components),
    composePrompt(tracker.meta, "scale", cast, components),
    composePrompt(journal.meta, "photos", cast, components),
    composePrompt(onboarding.meta, "single", cast, components),
    composePrompt(onboarding.meta, "steps", cast, components),
  ];
  const guidance = prompts
    .map((prompt) =>
      prompt
        .split("\n")
        .filter((line) => /^Layout[: ]/.test(line))
        .join("\n"),
    )
    .join("\n\n");
  await expect(`${guidance}\n`).toMatchFileSnapshot("../../../../test/snapshots/compose-layout-guidance.txt");
});

it("uses the effective List trail for toggle recipes and respects row overrides", () => {
  const meta = archetypes.settings.meta;
  const trail = { trail: ["chevron", "toggle"] } as const;
  const defs = {
    ...components,
    List: {
      ...components.List,
      meta: {
        ...components.List.meta,
        variants: trail,
        items: { ...components.List.meta.items, variants: trail },
      },
      props: z.strictObject({
        ...variantProps(trail),
        style: z.string().optional(),
        rows: z.array(
          z.strictObject({
            title: text(28),
            goto: z.string().optional(),
            value: z.string().optional(),
            ...itemVariantProps(trail, { inheritTrail: true }),
          }),
        ),
      }),
    },
  };
  expect(composePrompt(meta, "simple", cast, defs)).toContain("can inherit the List trail");
  const screen = createRegistry().defaultLines("settings", "simple", cast);
  const reply = (row: { title: string; trail?: string }) =>
    JSON.stringify({
      ...screen,
      components: screen.components.map((entry) =>
        entry.c === "List" ? { id: entry.id, c: "List", trail: "toggle", rows: [row] } : entry,
      ),
    });
  expect(scoreComposition(reply({ title: "Alerts" }), meta, "simple", defs).issues).toEqual([]);
  expect(
    scoreComposition(reply({ title: "Alerts", trail: "chevron" }), meta, "simple", defs).issues,
  ).toContain("Missing required slot2: List:toggle");
});

describe("composition scoring", () => {
  it("accepts a valid default and rejects missing slots/invalid component props", () => {
    const meta = archetypes.chat.meta,
      screen = createRegistry().defaultLines("chat", "thread", cast);
    expect(scoreComposition(JSON.stringify(screen), meta, "thread", components).issues).toEqual([]);
    expect(
      scoreComposition(
        JSON.stringify({ ...screen, components: screen.components.slice(0, 2) }),
        meta,
        "thread",
        components,
      ).issues.length,
    ).toBeGreaterThan(0);
    expect(scoreComposition("invalid JSON", meta, "thread", components).issues.length).toBeGreaterThan(0);
  });
  it("scores independent samples by majority and enforces the rubric threshold", async () => {
    const screen = JSON.stringify(createRegistry().defaultLines("chat", "thread", cast));
    const result = await runComposeProbes({
      archetypes: [archetypes.chat.meta],
      defs: components,
      cast,
      samples: 3,
      rubric: true,
      callModel: async (prompt, sample) =>
        prompt.startsWith("Evaluate")
          ? JSON.stringify({ clarity: 5, focus: 4, flow: 4, content: 4, structure: 4 })
          : sample === 2
            ? "bad"
            : screen,
    });
    expect(result[0]).toMatchObject({ status: "pass", score: "2/3" });
    const failed = await runComposeProbes({
      archetypes: [archetypes.chat.meta],
      defs: components,
      cast,
      rubric: true,
      callModel: async (prompt) =>
        prompt.startsWith("Evaluate")
          ? JSON.stringify({ clarity: 5, focus: 4, flow: 2, content: 4, structure: 4 })
          : screen,
    });
    expect(failed[0]?.status).toBe("fail");
  });
});
