import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  sessionKey,
  sessionState,
  wordsFor,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Flashcard;
const { meta, props, examples, fallback, probes } = def;
const seed = props.parse(examples[0]);
const [first, second] = [seed.cards[0]!, seed.cards[1]!];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ ...seed, id: "f1", c: "Flashcard" as const }] };
const address = (part: string) => `home/f1/${part}`;
const controllerFor = () => createScreenController({ screen, defs: components, requireMounted: false });

function renderCard(state: StateName) {
  return renderInstance("Flashcard", seed, state, theme, { component: "f1" });
}

describe("Flashcard seed bounds", () => {
  it.each(examples)("accepts each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("trims authored copy and defaults to a centered card with a thumbnail", () => {
    const parsed = props.parse({ cards: [{ ...first, front: "  Cue  " }, second] });
    expect(parsed).toMatchObject({
      align: "center",
      surface: "card",
      media: "thumb",
      cards: [{ front: "Cue" }, second],
    });
  });
  // prettier-ignore
  it.each([
    {}, { cards: [] }, { cards: [first] }, { cards: Array(7).fill(first) },
    { ...seed, left: 2 }, { ...seed, flipped: true }, { ...seed, color: "#000" },
    { ...seed, surface: "glass" }, { ...seed, align: "end" }, { ...seed, media: "icon" }, { ...seed, density: "tiny" },
  ])("rejects invalid deck input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([
    { front: " " },
    { front: "x".repeat(81) },
    { back: "x".repeat(161) },
    { hint: "x".repeat(61) },
    { photo: "https://example.org/photo.jpg" },
    { due: "2030-01-01" },
    { id: "r1" },
  ])("rejects invalid card input %j", (patch) => {
    expect(props.safeParse({ cards: [{ ...first, ...patch }, second] }).success).toBe(false);
  });
  it("accepts exact text and deck limits", () => {
    const card = { front: "x".repeat(80), back: "x".repeat(160), hint: "x".repeat(60), photo: "local:1" };
    expect(props.safeParse({ cards: Array(6).fill(card) }).success).toBe(true);
  });
  // prettier-ignore
  it("validates optional audio as a host reference", () => {
    expect(props.safeParse({ style: "binary", cards: [{ ...first, audio: "local:3" }, second] }).success).toBe(true);
    expect(props.safeParse({ cards: [{ ...first, audio: "https://example.org/clip" }, second] }).success).toBe(false);
    expect(props.safeParse({ ...seed, style: "unknown" }).success).toBe(false);
  });
});

describe("Flashcard fallback and metadata", () => {
  it("keeps neutral fallback seeds and bounds cast inputs", () => {
    const empty: CastLike = { things: [], items: [] };
    const thing = { type: "term", fields: ["name", "detail"] };
    const item = { id: "one", type: "term", sample: true, name: "Lead", detail: "Loose" };
    const populated = { things: [thing], items: [item] };
    const malformed = { things: [thing], items: [{ ...item, name: "", detail: 123 }] };
    for (const cast of [empty, populated, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).cards).toEqual(
      [0, 1].map((index) => ({ front: placeholderTitle(index), back: wordsFor().placeholderDetail })),
    );
    expect(fallback({ cast: populated }).cards[0]).toEqual({ front: "Lead", back: "Loose" });
    const items = Array.from({ length: 8 }, (_, index) => ({
      ...item,
      id: `term_${index}`,
      name: "x".repeat(100),
    }));
    expect(props.parse(fallback({ cast: { things: [thing], items } })).cards).toHaveLength(6);
  });
  it("preserves the phone tier, pack gate, and choose, write and read probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("SwipeStack");
    expect(createRegistry({ packs: ["learning"] }).ids.includes("Flashcard")).toBe(packReady("learning"));
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "Flashcard",
      "SwipeStack",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "Flashcard" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "cover" } }),
        expect.objectContaining({ kind: "read", expect: { address: "f1/card", action: "flip" } }),
      ]),
    );
  });
});

describe("Flashcard parts, states and reading", () => {
  it("mounts only the current front and offers its flip as a named button", () => {
    const html = renderCard("filled");
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.get(address("card"))?.attributes).toContain('role="button"');
    expect(parts.get(address("card"))?.attributes).toContain('aria-label="Reveal answer"');
    expect(parts.get(address("front"))?.text).toContain(first.front);
    expect(parts.get(address("hint"))?.text).toContain(first.hint);
    expect(parts.has(address("photo"))).toBe(true);
    expect(parts.get(address("left"))?.text).toContain("2 cards left");
    expect(parts.has(address("back"))).toBe(false);
    for (const part of meta.session.ratings) expect(parts.has(address(part))).toBe(false);
    const read = readComponent(def, seed, "f1").join("\n");
    expect(read).toContain("2 cards left");
    expect(read).toContain(first.front);
    expect(read).toContain("[f1/card flip]");
    expect(read).not.toContain(first.back);
    expect(read).not.toContain(second.front);
  });
  it.each([
    ["loading", undefined],
    ["empty", "No cards due"],
    ["success", "Done for today"],
  ] as const)("renders %s without a face or action", (state, message) => {
    const html = renderCard(state);
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.get(address("message"))?.text?.join("")).toBe(message);
    expect(html).not.toContain('role="button"');
    expect(parts.has(address("front"))).toBe(false);
    expect(html).not.toContain(first.back);
    if (state !== "success") expect(readComponent(def, seed, "f1", state).join("\n")).not.toContain("[f1/");
  });
});

describe("Flashcard session", () => {
  it.each(meta.session.ratings)("allows %s only after flipping and records it in seed order", (rating) => {
    const controller = controllerFor();
    const flip = address("card"),
      rate = address(rating);
    expect(controller.press(rate).ok).toBe(false);
    expect(controller.press(flip).ok).toBe(true);
    expect(controller.press(flip).ok).toBe(false);
    const read = controller.read();
    expect(read).toContain(first.back);
    expect(read).not.toContain(first.front);
    expect(read).not.toContain(first.hint!);
    expect(read).not.toContain(second.front);
    for (const part of meta.session.ratings) expect(read).toContain(`[f1/${part} press]`);
    expect(controller.press(rate).ok).toBe(true);
    expect(controller.press(rate).ok).toBe(false);
    expect(controller.read()).toContain("1 card left");
    expect(controller.read()).toContain(second.front);
    expect(controller.read()).not.toContain(second.back);
    expect(controller.press(flip).ok).toBe(true);
    expect(controller.press(address("good")).ok).toBe(true);
    const stored = controller.store.get(address(sessionKey));
    expect(sessionState(meta, props.parse(seed), () => stored)).toMatchObject({
      complete: true,
      item: {},
      recall: { remaining: 0, ratings: [rating, "good"] },
    });
    expect(controller.read()).toContain("(success) Done for today");
    expect(controller.press(flip).ok).toBe(false);
    expect(controller.press(rate).ok).toBe(false);
    controller.dispose();
  });
  // prettier-ignore
  it("uses Good and Again as the two binary recall outcomes without shifting the session", () => {
    const binary = { ...screen.components[0]!, style: "binary" };
    const controller = createScreenController({
      screen: { id: "home", components: [binary] }, defs: components, requireMounted: false,
    });
    try {
      expect(controller.press(address("card")).ok).toBe(true);
      const text = controller.read();
      for (const word of ["Still learning", "Know", "[f1/again press]", "[f1/good press]"]) expect(text).toContain(word);
      for (const part of ["hard", "easy"]) expect(controller.press(address(part)).ok).toBe(false);
      expect(controller.press(address("again")).ok).toBe(true);
      expect(controller.read()).toContain(second.front);
      expect(controller.press(address("card")).ok).toBe(true);
      expect(controller.press(address("good")).ok).toBe(true);
      expect(controller.read()).toContain("(success) Done for today");
    } finally {
      controller.dispose();
    }
  });
});
