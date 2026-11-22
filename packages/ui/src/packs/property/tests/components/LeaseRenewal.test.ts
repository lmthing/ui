import { describe, expect, it, vi } from "vitest";
import {
  atDeviceTime,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { LeaseRenewal: def } = components;
const { meta, examples, props, fallback, probes } = def;
const [offer, summary] = examples;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const before = Date.parse("2028-12-15T23:59:59.999Z");
const after = before + 1;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance(meta.id, input, state, theme, { component: "l1" });
const read = (input: unknown, state: StateName = "filled", now = before) =>
  readComponent(def, input, "l1", state, {}, undefined, atDeviceTime(undefined, now)).join("\n");
const screen = (input: object = offer!) => ({ id: "home", components: [{ ...input, id: "l1", c: meta.id }] });
const open = (input?: object, now = () => before) =>
  createScreenController({ screen: screen(input), defs: components, now });
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };

describe("LeaseRenewal contract and fallback", () => {
  it.each(examples)("parses each property example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  // prettier-ignore
  it.each([
    { unknown: true }, { color: "red" }, { renewalRef: "Not a slug" }, { unitRef: "x".repeat(33) },
    { unit: "x".repeat(33) }, { tenant: "x".repeat(25) }, { currentRent: 0 }, { proposedRent: Infinity },
    { deadline: "2028-02-30" }, { options: [] }, { options: Array(5).fill({ label: "A", months: 0 }) },
    { options: [{ label: "x".repeat(17), months: 0 }] }, { options: [{ label: "A", months: 37 }] },
    { options: [{ label: "A", months: 1.5 }] }, { options: [{ label: "A", months: 0, rent: -1 }] },
    { selectedOption: 3 }, { selectedOption: -1 }, { selectedOption: 1.5 }, { status: "saved" },
    { counterNote: "x".repeat(121) }, { style: "list" }, { detail: "minimal" },
  ])("rejects invalid field %o", (patch) => expect(props.safeParse({ ...offer, ...patch }).success).toBe(false));
  it("accepts exact bounds and keeps readiness tied to pack readiness", () => {
    const options = Array.from({ length: 4 }, () => ({ label: "n".repeat(16), months: 36 }));
    expect(
      props.safeParse({ ...offer, options, selectedOption: 3, counterNote: "n".repeat(120) }).success,
    ).toBe(true);
    expect(createRegistry({ packs: ["property"] }).ids.includes(meta.id)).toBe(packReady("property"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: meta.id }),
        expect.objectContaining({ kind: "choose", expect: "Choice" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "l1/accept", action: "press" } }),
      ]),
    );
  });
  it("uses cast-derived labels and neutral placeholders otherwise", () => {
    for (const [label, title] of [
      ["Example", "Example"],
      [22, placeholderTitle(0)],
    ] as const) {
      const cast = {
        things: [{ type: "item", fields: ["label"] }],
        items: [{ id: "one", type: "item", sample: true, label }],
      };
      expect(props.parse(fallback({ cast }))).toMatchObject({
        unit: title,
        tenant: title,
        options: [{ label: title }],
      });
    }
    const empty = fallback({ cast: { things: [], items: [] } });
    expect(props.parse(empty)).toMatchObject({ selectedOption: 0, unit: placeholderTitle(0) });
  });
});

describe("LeaseRenewal states and parts", () => {
  it("keeps finish addresses, hides only explanations in brief and renders a read-only summary", () => {
    const addresses = (input: unknown) => [...addressedElements(render(input)).keys()];
    const filled = addresses(offer);
    expect(filled).toEqual(
      expect.arrayContaining([
        "home/l1/proposed_rent",
        "home/l1/change",
        "home/l1/deadline",
        "home/l1/r1/root",
        "home/l1/r1/sub",
        "home/l1/r2/value",
        "home/l1/note",
        "home/l1/accept",
        "home/l1/counter",
        "home/l1/decline",
      ]),
    );
    expect(addresses({ ...offer })).toEqual(filled);
    expect(addresses({ ...offer, detail: "brief" })).toEqual(filled.filter((part) => !part.endsWith("/sub")));
    expect(addresses(summary)).toContain("home/l1/selected_term");
    expect(read(summary)).toContain("Selected term · 12 months");
    expect(read(summary)).not.toMatch(/\[l1\//);
    expect(read({ ...offer, detail: "brief" })).not.toContain("Fixed for");
  });
  it.each([
    ["loading", 'aria-busy="true"'],
    ["success", "Response recorded"],
  ] as const)("uses a nonactionable %s state with the expected copy", (state, expected) => {
    expect(render(offer, state)).toContain(expected);
    expect(read(offer, state)).not.toMatch(/\[l1\//);
  });
  it("keeps the recorded term on success and shows the offer on a save error", () => {
    const saved = { ...offer, selectedOption: 1, status: "accepted" };
    expect(render(saved, "success")).toContain("Selected term · 6 months");
    expect(read(saved, "success")).toContain("Selected term · 6 months");
    const failure = render(offer, "error");
    expect(failure).toContain("Couldn’t save the response");
    expect(addressedElements(failure).has("home/l1/r1/root")).toBe(true);
    expect(read(offer, "error")).not.toMatch(/\[l1\//);
    expect(read(offer, "error", after)).not.toMatch(/\[l1\//);
    const controller = open({ ...offer, state: "error" });
    expect(controller.press("l1/r2").ok).toBe(false);
    expect(controller.press("l1/accept").ok).toBe(false);
    controller.dispose();
  });
});

describe("LeaseRenewal read and act", () => {
  it("selects the addressed term and compares its rent, not the default proposal", () => {
    const controller = open();
    expect(controller.read()).toContain("+$50 (+3.6%)");
    expect(controller.read()).toContain("[l1/accept press !needs-people]");
    expect(controller.read()).toContain("[l1/r2 select");
    expect(controller.act({ address: "l1/r2", action: "select", value: 0 }).ok).toBe(false);
    expect(controller.press("l1/r2").ok).toBe(true);
    expect(controller.read()).toContain("+$100 (+7.1%)");
    expect(controller.read()).toContain("r2 · 6 months · Selected · $1,500 · Fixed for 6 months");
    controller.dispose();
  });
  it.each([
    ["accept", "Accepted"],
    ["decline", "Declined"],
  ] as const)("only records %s after confirmation and then locks the response", (action, outcome) => {
    const controller = open();
    expect(controller.press("l1/r3").ok).toBe(true);
    expect(controller.press(`l1/${action}`).ok).toBe(true);
    expect(controller.act(cancel).ok).toBe(true);
    expect(controller.read()).toContain("Awaiting response");
    expect(controller.press(`l1/${action}`).ok).toBe(true);
    expect(controller.act(confirm).ok).toBe(true);
    expect(controller.read()).toContain(outcome);
    expect(controller.read()).toContain("+$150 (+10.7%)");
    expect(controller.press("l1/r1").ok).toBe(false);
    expect(controller.press("l1/counter").ok).toBe(false);
    expect(controller.act({ address: "l1/note", action: "type", value: "Too late" }).ok).toBe(false);
    controller.dispose();
  });
  it("requires a nonblank note to counter and refuses a response after the inclusive deadline", () => {
    let now = before;
    const controller = open({ ...offer, counterNote: undefined }, () => now);
    expect(controller.press("l1/counter").ok).toBe(false);
    expect(controller.edit("l1/note", " ".repeat(4)).ok).toBe(true);
    expect(controller.press("l1/counter").ok).toBe(false);
    expect(controller.edit("l1/note", "x".repeat(121)).ok).toBe(false);
    expect(controller.edit("l1/note", "Please keep the existing rent.").ok).toBe(true);
    expect(controller.press("l1/counter").ok).toBe(true);
    expect(controller.read()).toContain("Countered");
    controller.dispose();

    const expiring = open(offer, () => now);
    expect(expiring.press("l1/accept").ok).toBe(true);
    now = after;
    expect(expiring.act(confirm).ok).toBe(false);
    expect(expiring.press("l1/r2").ok).toBe(false);
    expect(expiring.read()).toContain("The response deadline has passed");
    expiring.dispose();
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(after);
      expect(render(offer)).toContain("The response deadline has passed");
    } finally {
      vi.useRealTimers();
    }
  });
});
