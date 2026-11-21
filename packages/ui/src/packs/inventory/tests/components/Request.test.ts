import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  wordsFor,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { Request } from "../../components";

const def = components.Request;
const { meta, props, examples, fallback, probes, bindRequest } = Request;
const repair = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const at = (part: string) => `home/r1/${part}`;
const row = { time: "x".repeat(12), text: "y".repeat(36) };
const select = (value: string) => ({ address: "r1/status", action: "select", value });
const type = (value: string) => ({ address: "r1/update", action: "type", value });
const screen = (state: StateName) => ({
  id: "home",
  components: [{ ...repair, id: "r1", c: meta.id, state }],
});
const render = (input: unknown, state: StateName = "filled") =>
  addressedElements(renderInstance("Request", input, state, theme, { component: "r1" }));

describe("Request schema", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });

  it("trims text, applies default variants, accepts the exact bounds and stamps view-only ids", () => {
    expect(
      props.parse({
        ...repair,
        title: ` ${"x".repeat(32)} `,
        where: "x".repeat(24),
        who: "x".repeat(20),
        updates: Array.from({ length: 4 }, () => row),
      }),
    ).toMatchObject({ title: "x".repeat(32), media: "thumb", surface: "card" });
    expect(props.safeParse({ ...repair, updates: [] }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["updates"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { ...repair, title: " " },
    { ...repair, title: "x".repeat(33) },
    { ...repair, where: "x".repeat(25) },
    { ...repair, who: "x".repeat(21) },
    { ...repair, photo: "https://example.com/tap.png" },
    { ...repair, priority: "critical" },
    { ...repair, status: "triage" },
    { ...repair, updates: Array.from({ length: 5 }, () => row) },
    { ...repair, updates: [{ ...row, id: "r1" }] },
    { ...repair, updates: [{ ...row, time: "x".repeat(13) }] },
    { ...repair, updates: [{ ...row, text: "x".repeat(37) }] },
    { ...repair, update: "not a wire prop" },
    { ...repair, may_change_status: true },
    { ...repair, color: "red" },
    { ...repair, media: "cover" },
  ])("rejects invalid wire input: %j", (value) => {
    expect(props.safeParse(value).success).toBe(false);
  });
});

describe("Request fallback and metadata", () => {
  it("uses bounded cast fields and shared placeholders", () => {
    const things = [{ type: "report", fields: ["name", "location"] }];
    const sample = { id: "fault", type: "report", sample: true, name: "Leaking tap", location: "Patio" };
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things, items: [sample] },
      { things, items: [{ ...sample, name: 3, location: false }] },
      { things, items: [{ ...sample, name: "x".repeat(80), location: "y".repeat(80) }] },
    ];
    const [empty, valid, malformed, long] = casts.map((cast) =>
      props.parse(fallback({ cast, lang: "en-GB" })),
    );
    expect(empty).toMatchObject({
      title: placeholderTitle(0, "en-GB"),
      where: wordsFor("en-GB").placeholderLabel,
      priority: "normal",
      status: "new",
      updates: [],
    });
    expect(valid).toMatchObject({ title: sample.name, where: sample.location });
    expect(malformed).toEqual(empty);
    expect(long).toMatchObject({ title: "x".repeat(32), where: "y".repeat(24) });
  });

  it("preserves the core-first probes, people tier and pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", weight: 2, tier: "people", states: ["filled", "success"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Timeline");
    expect(partTierAt(meta, {}, "status")).toBe("people");
    expect(partTierAt(meta, {}, "update")).toBe("people");
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Request")).toBe(packReady("inventory"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Request" }),
        expect.objectContaining({ kind: "choose", expect: "Timeline" }),
        expect.objectContaining({ kind: "write", expect: "Request" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/status", action: "select" } }),
      ]),
    );
  });
});

describe("Request states and parts", () => {
  it("draws the summary and each update at its own address, with an editable status and text field", () => {
    const parts = render({
      ...repair,
      updates: [...repair.updates, { time: "Tuesday", text: "Repair booked." }],
    });
    const updates = ["r1", "r2"].flatMap((id) => meta.items.parts.map((part) => at(`${id}/${part}`)));
    expect([...parts.keys()].sort()).toEqual([...meta.parts.map(at), ...updates].sort());
    expect(parts.get(at("priority"))?.text).toEqual(["Urgent"]);
    expect(parts.get(at("who"))?.text).toEqual(["Assigned to Ana"]);
    expect(parts.get(at("r1/time"))?.text).toEqual(["09:15"]);
    expect(parts.get(at("r2/text"))?.text).toEqual(["Repair booked."]);
    expect(parts.get(at("status"))?.attributes).toContain('role="radiogroup"');
    expect(parts.get(at("update"))?.attributes).toContain('role="textbox"');
  });

  it("only omits missing photo, person and history, and only hides the photo with media none", () => {
    const minimal = { ...examples[1]!, updates: [] };
    const absent = ["photo", "who", "updates"];
    expect([...render(minimal).keys()].sort()).toEqual(
      meta.parts
        .filter((p) => !absent.includes(p))
        .map(at)
        .sort(),
    );
    expect([...render({ ...repair, media: "none" }).keys()]).toEqual(
      [...render(repair).keys()].filter((address) => address !== at("photo")),
    );
  });

  it("shows the fixed summary and history but no controls on success", () => {
    const parts = render(repair, "success");
    expect(parts.get(at("status"))?.text).toEqual(["Fixed"]);
    expect(parts.get(at("status"))?.attributes).not.toContain("radiogroup");
    expect(parts.has(at("r1/text"))).toBe(true);
    expect(parts.has(at("update"))).toBe(false);
  });
});

describe("Request read and act", () => {
  it("changes the current status and types a bounded update, without confirming either action", () => {
    const onAction = vi.fn();
    const controller = createScreenController({ screen: screen("filled"), defs: { Request: def }, onAction });
    expect(controller.read()).toContain(
      '[r1/status select = "New"; choices ["New","Booked","Fixed"] !needs-people]',
    );
    expect(controller.read()).toContain("[r1/update type !needs-people]");
    expect(controller.act(select("invalid")).ok).toBe(false);
    expect(controller.act(select("booked")).ok).toBe(true);
    expect(controller.read()).toContain('[r1/status select = "Booked"');
    expect(controller.act(type("x".repeat(37))).ok).toBe(false);
    expect(controller.act(type("x".repeat(36))).ok).toBe(true);
    expect(controller.read()).toContain(`[r1/update type = "${"x".repeat(36)}"`);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(controller.confirmation).toBeUndefined();
  });

  it.each([false, true])("only the landlord may select status (mounted = %s)", (mounted) => {
    let landlord = false;
    const defs = { Request: bindRequest((id) => id === "r1" && landlord) };
    const host = mounted
      ? createScreenController({ screen: screen("filled"), defs })
      : createAgentAccess({ current: () => screen("filled"), defs, store: createInteractionStore() });
    expect(host.read()).toContain("New");
    expect(host.read()).not.toContain("Booked");
    expect(host.read()).not.toContain("r1/status select");
    expect(host.act(select("booked")).ok).toBe(false);
    expect(host.act(type("Tap still leaking.")).ok).toBe(true);
    landlord = true;
    expect(host.act(select("booked")).ok).toBe(true);
  });

  it("reads the completed summary and rejects both actions on success", () => {
    const controller = createScreenController({ screen: screen("success"), defs: { Request: def } });
    expect(controller.read()).toContain("Request (success)");
    expect(controller.read()).toContain("Fixed");
    expect(controller.read()).toContain(repair.updates[0]!.text);
    expect(controller.read()).not.toMatch(/r1\/(status|update)/);
    expect(controller.act(select("new")).ok).toBe(false);
    expect(controller.act(type("New note")).ok).toBe(false);
  });
});
