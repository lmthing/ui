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
  const {
    variants: _variants,
    variantParts: _parts,
    writeHints: _hints,
    ...plainHeader
  } = components.Header.meta;
  const { variants: _chatVariants, variantParts: _chatParts, ...plainBubbles } = components.Bubbles.meta;
  const {
    variants: _composerVariants,
    variantParts: _composerParts,
    writeHints: _composerHints,
    ...plainComposer
  } = components.Composer.meta;
  const withoutAxes = {
    ...components,
    Header: {
      ...components.Header,
      meta: plainHeader,
      props: z.strictObject({ title: text(28) }),
      examples: [{ title: "Chat" }],
    },
    Bubbles: {
      ...components.Bubbles,
      meta: plainBubbles,
      props: z.strictObject({
        messages: z
          .array(z.strictObject({ from: z.enum(["me", "them"]), text: text(120) }))
          .min(1)
          .max(6),
      }),
      examples: [{ messages: [{ from: "them", text: "Hello" }] }],
    },
    Composer: {
      ...components.Composer,
      meta: plainComposer,
      props: z.strictObject({ style: z.enum(["entry", "reply"]), hint: text(60) }),
      examples: [{ style: "reply", hint: "Reply" }],
    },
  };
  const caps = "one hero emphasis and one cover collection per screen";
  const plain = composePrompt(meta, "thread", cast, withoutAxes);
  expect(plain).not.toContain(variantVocabulary);
  expect(plain).not.toContain(caps);

  const prompt = composePrompt(meta, "thread", cast, components);
  expect(prompt.split(variantVocabulary)).toHaveLength(2);
  expect(prompt).toContain('At most one third of items per component get mark "highlight" (round down).');
  expect(prompt).toContain("Never infer an axis from the data alone.");
  expect(prompt).toContain(caps);
});

it("snapshots the layout guidance for grounded content and clear actions", async () => {
  const { browse, calendar, dashboard, detail, journal, onboarding, profile, tracker } = archetypes;
  const prompts = [
    composePrompt(dashboard.meta, "rings", cast, components),
    composePrompt(dashboard.meta, "charts", cast, components),
    composePrompt(profile.meta, "person", cast, components),
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
  const atBar = { clarity: 4.5, focus: 4, flow: 3.5, content: 4, structure: 4 };
  const lowMinimum = { clarity: 5, focus: 5, flow: 3, content: 5, structure: 5 };
  const lowAverage = { clarity: 4, focus: 4, flow: 3.5, content: 4, structure: 4 };
  it.each([
    {
      votes: [lowMinimum, atBar, atBar],
      status: "pass",
      score: "3/3",
      detail: "unstable: rubric passed 2/3",
    },
    { votes: [atBar, lowMinimum, lowAverage], status: "fail", score: "3/3", detail: "1/3 rated samples" },
    { votes: [atBar, null, atBar], status: "pass", score: "2/3", detail: "unstable: Expected a screen" },
    { votes: [lowAverage, null, atBar], status: "fail", score: "2/3", detail: "1/2 rated samples" },
    { votes: [null, atBar, null], status: "fail", score: "1/3", detail: "Expected a screen" },
  ])(
    "requires both majorities ($score mechanically valid; $detail)",
    async ({ votes, status, score, detail }) => {
      const screen = createRegistry().defaultLines("chat", "thread", cast);
      const rated: number[] = [];
      const [result] = await runComposeProbes({
        archetypes: [archetypes.chat.meta],
        defs: components,
        cast,
        rubric: true,
        callModel: async (prompt, sample, format, probe) => {
          if (format) return votes[sample] ? JSON.stringify({ ...screen, title: `Sample ${sample}` }) : "bad";
          const index = Number(probe.id.split("/").at(-1));
          expect(probe.id).toBe(`rubric/chat/thread//${index}`);
          expect(sample).toBe(0);
          expect(prompt).toContain(`"Sample ${index}"`);
          rated.push(index);
          return JSON.stringify(votes[index]);
        },
      });
      expect(rated).toEqual(votes.flatMap((vote, index) => (vote ? [index] : [])));
      expect(result).toMatchObject({ status, score, rubric: votes, detail: expect.stringContaining(detail) });
    },
  );
});
