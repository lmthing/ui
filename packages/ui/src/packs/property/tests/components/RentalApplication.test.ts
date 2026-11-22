import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  planAct,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { RentalApplication: def } = components;
const { examples, fallback, props, probes, meta } = def;
const [application, summary] = examples;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance(
    "RentalApplication",
    input,
    state,
    { preset: "calm", mode: "light", accent: "moss" },
    { component: "r1" },
  );
const read = (input: unknown, state: StateName = "filled") =>
  readComponent(def, input, "r1", state).join("\n");
const screen = (input: object = application!) => ({
  id: "home",
  components: [{ ...input, id: "r1", c: meta.id }],
});
const open = (input?: object) => createScreenController({ screen: screen(input), defs: components });
const accept = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };

describe("RentalApplication contract", () => {
  it.each(examples)("parses a property example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  // prettier-ignore
  it.each([
    { unknown: true }, { color: "red" }, { unit: "x".repeat(33) }, { applicationRef: "Mixed Case" },
    { unitRef: "x".repeat(33) }, { moveIn: "2027-02-29" }, { monthlyRent: 0 }, { monthlyRent: Infinity },
    { applicants: [] }, { applicants: Array(5).fill({ name: "A", monthlyIncome: 0 }) },
    { applicants: [{ name: "x".repeat(25), monthlyIncome: 0 }] },
    { applicants: [{ name: "A", monthlyIncome: -1 }] },
    { checks: [] }, { checks: Array(5).fill({ kind: "credit", status: "pending" }) },
    { checks: [application!.checks[0], application!.checks[0]] },
    { checks: [{ kind: "credit", status: "unknown" }] },
    { checks: [{ kind: "income", status: "pending", note: "a".repeat(61) }] },
    { checks: [{ kind: "income", status: "pending", goto: "invalid screen" }] },
    { note: "x".repeat(121) }, { decision: "unknown" }, { detail: "hidden" },
  ])("rejects invalid fields %o", (fields) => expect(props.safeParse({ ...application, ...fields }).success).toBe(false));
  it("allows the maximum row counts and preserves the pack gate", () => {
    const applicants = Array.from({ length: 4 }, () => ({ name: "a".repeat(24), monthlyIncome: 0 }));
    expect(props.safeParse({ ...application, applicants, note: "x".repeat(120) }).success).toBe(true);
    expect(createRegistry({ packs: ["property"] }).ids.includes(meta.id)).toBe(packReady("property"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: meta.id }),
        expect.objectContaining({ kind: "choose", expect: "KeyValue" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/waitlist", action: "press" } }),
      ]),
    );
  });
});

describe("RentalApplication fallback", () => {
  it("uses only matching cast or neutral placeholders", () => {
    for (const [label, title] of [
      ["Sample", "Sample"],
      [7, placeholderTitle(0)],
    ] as const) {
      const cast = {
        things: [{ type: "item", fields: ["label"] }],
        items: [{ id: "one", type: "item", sample: true, label }],
      };
      expect(props.parse(fallback({ cast }))).toMatchObject({ unit: title, applicants: [{ name: title }] });
    }
    const empty = fallback({ cast: { things: [], items: [] } });
    expect(props.parse(empty)).toMatchObject({ unit: placeholderTitle(0), decision: "pending" });
  });
});

describe("RentalApplication drawn states and addresses", () => {
  it("retains finish addresses and omits the notes and decision controls in brief", () => {
    const addresses = (input: unknown) => [...addressedElements(render(input)).keys()];
    const full = addresses(application);
    expect(addresses({ ...application, density: "compact", surface: "outlined" })).toEqual(full);
    expect(full).toEqual(
      expect.arrayContaining([
        "home/r1/root",
        "home/r1/unit",
        "home/r1/ratio",
        "home/r1/r1/root",
        "home/r1/r1/status",
        "home/r1/r3/check_note",
        "home/r1/note",
        "home/r1/waitlist",
        "home/r1/approve",
        "home/r1/decline",
      ]),
    );
    const brief = { ...application, detail: "brief" };
    expect(addresses(brief)).toEqual(
      full.filter((part) => !/\/(check_note|note|waitlist|approve|decline)$/.test(part)),
    );
    expect(read(brief)).not.toContain("Waiting for the previous landlord.");
    expect(read(brief)).not.toContain("Flexible on the move-in date.");
  });
  it.each([
    ["empty", "No application loaded"],
    ["loading", 'aria-busy="true"'],
    ["success", "Decision saved"],
    ["error", "Screening verification failed"],
  ] as const)("draws the %s state without actions", (state, message) => {
    expect(render(application, state)).toContain(message);
    expect(read(application, state)).not.toMatch(/\[(r1|r1\/[^ ]+) (type|press)/);
  });
});

describe("RentalApplication read and act", () => {
  it("reads the same computed totals shown and opens only a linked check", () => {
    for (const value of ["3.5×", "$4,900", "$1,400", "Noor Desai", "Sam Ortiz"]) {
      expect(read(application)).toContain(value);
      expect(render(application)).toContain(value);
    }
    expect(read(application)).toContain("[r1/r1 press→credit_details]");
    expect(read(application)).not.toContain("[r1/r2 press");
    expect(planAct(screen(), components, {}, [{ address: "r1/r1", action: "press" }])).toMatchObject({
      ok: true,
      links: [{ goto: "credit_details" }],
    });
    expect(planAct(screen(), components, {}, [{ address: "r1/r2", action: "press" }]).ok).toBe(false);
    expect(open(summary).press("r1/approve").ok).toBe(false);
  });
  it.each([
    ["approve", "Approved"],
    ["decline", "Declined"],
  ] as const)("waitlists once and stages %s until confirmed", (action, outcome) => {
    const controller = open({ ...application!, note: undefined });
    const note = { address: "r1/note", action: "type" };
    expect(controller.act({ ...note, value: "x".repeat(121) }).ok).toBe(false);
    expect(controller.act({ ...note, value: "Ready for review" }).ok).toBe(true);
    expect(controller.press("r1/waitlist").ok).toBe(true);
    expect(controller.read()).toMatch(/Waitlisted.*Ready for review/);
    expect(controller.press("r1/waitlist").ok).toBe(false);
    expect(controller.press(`r1/${action}`).ok).toBe(true);
    expect(controller.act(cancel).ok).toBe(true);
    expect(controller.read()).toContain("Waitlisted");
    expect(controller.press(`r1/${action}`).ok).toBe(true);
    expect(controller.act(accept).ok).toBe(true);
    expect(controller.read()).toContain(outcome);
    expect(controller.press(`r1/${action}`).ok).toBe(false);
    expect(controller.act({ ...note, value: "Too late" }).ok).toBe(false);
    controller.dispose();
  });
});
