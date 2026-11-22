import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { mindWordsFor } from "../../lang";
const { ThoughtRecord } = components;
const { props, meta, fallback, examples, probes } = ThoughtRecord;
const blank = { distortions: examples[0]!.distortions.map((trap) => ({ ...trap, on: false })) };
const guided = props.parse(examples[1]);
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/t1/${part}`;
const read = (input: object, state?: StateName) =>
  readComponent(ThoughtRecord, input, "t1", state).join("\n");
const draw = (input: object, state: StateName = "filled") =>
  renderInstance("ThoughtRecord", input, state, theme, { component: "t1" });
const mount = (input: object = guided!, state: StateName = "filled", onAction = vi.fn()) =>
  createScreenController({
    screen: { id: "home", components: [{ ...input, id: "t1", c: "ThoughtRecord", state }] },
    defs: { ThoughtRecord },
    onAction,
    now: () => 1000,
  });
describe("ThoughtRecord schema", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    { distortions: [] },
    { distortions: Array(2).fill({ label: "Trap", on: true }) },
    { distortions: Array(9).fill({ label: "Trap", on: false }) },
    { distortions: Array(3).fill({ label: "a".repeat(21), on: false }) },
    { distortions: Array(3).fill({ label: "Trap", on: "yes" }) },
    { distortions: Array(3).fill({ label: "Trap", on: false, id: "r1" }) },
    { prompt: "a".repeat(81) },
    { situation: "a".repeat(201) },
    { thought: "a".repeat(201) },
    { reframe: "a".repeat(241) },
    { moodBefore: 0 },
    { moodAfter: 6 },
    { moodAfter: 2.5 },
    { moodAfter: "2" },
    { thought: "   " },
    { delta: 2 },
    { color: "red" },
    { detail: "short" },
  ])("rejects an invalid wire value", (patch) =>
    expect(props.safeParse({ ...guided, ...patch }).success).toBe(false),
  );
  it("accepts maximum lengths and only adds item IDs after parsing", () => {
    const parsed = props.parse({
      prompt: "a".repeat(80),
      situation: "a".repeat(200),
      thought: "a".repeat(200),
      reframe: "a".repeat(240),
      distortions: Array(8).fill({ label: "a".repeat(20), on: false }),
      moodBefore: 1,
      moodAfter: 5,
    });
    expect(parsed).toMatchObject({ surface: "card", detail: "full" });
    expect(parsed.distortions[0]).not.toHaveProperty("id");
    expect(stampItemIds(meta, parsed).distortions.at(-1)).toMatchObject({ id: "r8" });
    expectTypeOf<Props<typeof props, typeof meta>["distortions"][number]["id"]>().toBeString();
  });
});
describe("ThoughtRecord fallback and probes", () => {
  it("takes bounded labels and a prompt from the cast, or uses neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "record", fields: ["name", "note"] }],
      items: [{ id: "sample", type: "record", sample: true, name: "Known label", note: "A prompt" }],
    };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, name: 7, note: false }] };
    for (const sample of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: sample })).success).toBe(true);
    expect(fallback({ cast })).toMatchObject({
      prompt: "A prompt",
      distortions: [{ label: "Known label", on: false }, expect.anything(), expect.anything()],
    });
    expect(fallback({ cast: empty }).distortions.map(({ label }) => label)).toEqual(
      [0, 1, 2].map((index) => placeholderTitle(index)),
    );
  });
  it("keeps the Composer near miss and uses the pack's readiness", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Composer");
    expect(createRegistry({ packs: ["mind"] }).ids.includes(meta.id)).toBe(packReady("mind"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Composer" }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
    );
    expect(read(guided!)).toContain("[t1/save press");
  });
});
describe("ThoughtRecord states and parts", () => {
  it("draws named fields, controls and full mood readout", () => {
    const parts = addressedElements(draw(guided!));
    for (const name of ["situation", "thought", "reframe"])
      expect(parts.get(address(name))?.tag).toBe("textarea");
    for (const part of ["mood_before", "mood_after"])
      expect(parts.get(address(part))?.attributes).toContain('role="radiogroup"');
    expect(parts.get(address("r2/root"))?.attributes).toContain('aria-checked="true"');
    expect(parts.get(address("delta"))?.children[0]?.text).toEqual(["+2"]);
    expect(read(guided!)).toContain("Mood change: +2");
    expect(read({ ...guided, moodAfter: undefined })).not.toContain("Mood change");
  });
  it("hides full-only parts, text and actions in brief detail", () => {
    const input = { ...guided, detail: "brief" };
    const parts = addressedElements(draw(input));
    const controller = mount(input);
    for (const part of ["prompt", "situation", "mood_before", "mood_after", "delta"]) {
      expect(parts.has(address(part))).toBe(false);
      expect(controller.actionsAt(address(part))).toEqual([]);
    }
    expect(parts.has(address("r2/root"))).toBe(true);
    expect(read(input)).not.toContain(guided!.situation!);
    expect(read(input)).not.toContain("Mood change");
    expect(controller.act({ address: "t1/mood_before", action: "select", value: 3 }).ok).toBe(false);
  });
  it("shows a blank editor from empty input, skeletons while loading, and a private acknowledgement on success", () => {
    const empty = draw(guided, "empty");
    expect(empty).toContain(mindWordsFor().thoughtRecord.thoughtHint);
    expect(empty).not.toContain(guided!.thought!);
    expect(mount(blank!, "empty").actionsAt(address("thought"))).toEqual(["type"]);
    const loading = draw(guided!, "loading");
    expect(loading).toContain("aria-busy");
    expect(addressedElements(loading).has(address("thought"))).toBe(false);
    expect(mount(guided!, "loading").press("t1/save").ok).toBe(false);
    const success = addressedElements(draw(guided!, "success"));
    expect(success.get(address("success"))?.text).toEqual([mindWordsFor().thoughtRecord.saved]);
    expect(success.has(address("save"))).toBe(false);
    expect(mount(guided!, "success").press("t1/save").ok).toBe(false);
  });
});

describe("ThoughtRecord read and act", () => {
  it("edits a blank draft, projects independent ratings and traps, and enforces input bounds", () => {
    const controller = mount(blank!, "empty");
    const act = (part: string, action: "type" | "select", value: number | string) =>
      controller.act({ address: `t1/${part}`, action, value });
    expect(controller.press("t1/save").ok).toBe(false);
    expect(act("thought", "type", "a".repeat(201)).ok).toBe(false);
    expect(act("thought", "type", "a".repeat(200)).ok).toBe(true);
    expect(act("reframe", "type", "b".repeat(241)).ok).toBe(false);
    expect(act("reframe", "type", "b".repeat(240)).ok).toBe(true);
    for (const value of [0, 6, 2.5, "bad"]) expect(act("mood_before", "select", value).ok).toBe(false);
    expect(act("mood_before", "select", "2").ok).toBe(true);
    expect(act("mood_after", "select", 4).ok).toBe(true);
    expect(act("mood_after", "select", 3).ok).toBe(true);
    for (const item of ["r1", "r3", "r1"]) expect(controller.press(address(`${item}/root`)).ok).toBe(true);
    const live = controller.liveControls(meta, stampItemIds(meta, props.parse(blank)), "t1");
    expect(live).toMatchObject({
      moodBefore: 2,
      moodAfter: 3,
      distortions: [{ on: false }, { on: false }, { on: true }],
    });
    expect(controller.canPress(address("save"))).toBe(true);
  });
  it("keeps cancellation private and journals the current reflection once on confirmation", () => {
    const onAction = vi.fn();
    const controller = mount(guided, "filled", onAction);
    expect(controller.act({ address: "t1/mood_after", action: "select", value: 5 }).ok).toBe(true);
    expect(controller.read()).toContain("Mood change: +3");
    expect(controller.press("t1/save").ok).toBe(true);
    expect(controller.confirmation?.source).toBe(address("save"));
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ address: address("save") }));
    expect(controller.store.get("$record:thought_reflections:home")).toBeUndefined();
    expect(controller.press("t1/save").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    const { thought, reframe, prompt, situation } = guided;
    const reflection = {
      thought,
      reframe,
      prompt,
      situation,
      moodBefore: 2,
      moodAfter: 5,
      distortions: ["Mind reading"],
    };
    expect(controller.store.get("$record:thought_reflections:home")).toEqual([
      { instance: "t1", savedAt: 1000, reflection },
    ]);
    expect(controller.read()).toContain("ThoughtRecord (success)");
    expect(controller.read()).not.toContain(guided!.thought!);
    expect(controller.press("t1/save").ok).toBe(false);
  });
});
