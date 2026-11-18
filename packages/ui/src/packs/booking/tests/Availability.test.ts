import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  availabilityDefaults,
  breakLine,
  components,
  planAct,
  readComponent,
  stampItemIds,
  weekdayNames,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";
import { createScreenController } from "@lmthing/ui/kit";

const { props, meta, examples, fallback, probes } = components.Availability;
const neutral = () => fallback({ cast: { things: [], items: [] } });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const stamped = (input: unknown) =>
  stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
const firstDay = (change: Record<string, unknown>) => {
  const input = neutral();
  return { days: input.days.map((day, index) => (index === 0 ? { ...day, ...change } : day)) };
};

describe("Availability schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { days: [] },
    { days: neutral().days.slice(1) },
    { days: [...neutral().days, neutral().days[0]] },
    { days: neutral().days.map(() => neutral().days[0]) },
    firstDay({ day: "Monday" }),
    firstDay({ on: "yes" }),
    firstDay({ from: "9:00" }),
    firstDay({ to: "24:00" }),
    firstDay({ from: "" }),
    firstDay({ from: "a".repeat(6) }),
    firstDay({ from: "12:60" }),
    firstDay({ from: "09:00:00" }),
    firstDay({ on: true, from: "17:00", to: "09:00" }),
    firstDay({ on: true, from: "09:00", to: "09:00" }),
    firstDay({ breakFrom: "12:00" }),
    firstDay({ breakTo: "13:00" }),
    firstDay({ breakFrom: "08:59", breakTo: "13:00" }),
    firstDay({ breakFrom: "12:00", breakTo: "17:01" }),
    firstDay({ breakFrom: "13:00", breakTo: "12:00" }),
    firstDay({ breakFrom: "12:00", breakTo: "12:00" }),
    firstDay({ breakFrom: "25:00", breakTo: "13:00" }),
    firstDay({ color: "#fff" }),
    firstDay({ pixels: 4 }),
    firstDay({ id: "r1" }),
    { ...neutral(), color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts the exact seven-day, clock and break boundaries, including shuffled days", () => {
    const input = firstDay({ on: true, from: "00:00", to: "23:59", breakFrom: "00:00", breakTo: "23:59" });
    expect(props.safeParse(input).success).toBe(true);
    expect(props.safeParse({ days: [...input.days].reverse() }).success).toBe(true);
    expect(props.safeParse(firstDay({ on: false, from: "17:00", to: "09:00" })).success).toBe(true);
  });
  it("keeps validator ids out of wire props and adds them only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["days"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(stamped(neutral()).days[0]!.id).toBe("r1");
  });
});

describe("Availability fallback and contract", () => {
  it.each([
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    },
    { things: [], items: [{ id: "bad", type: "thing", sample: false, name: 7 }] },
  ] satisfies CastLike[])("uses a valid neutral week for empty, matching and malformed casts", (cast) => {
    const input = fallback({ cast });
    expect(props.safeParse(input).success).toBe(true);
    expect(input.days).toHaveLength(7);
    expect(
      input.days.every(
        (day) => !day.on && day.from === availabilityDefaults.from && day.to === availabilityDefaults.to,
      ),
    ).toBe(true);
    expect(input.days.map((day) => day.day)).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });
  it("declares density, phone storage, one filled state, a core near miss and all editable reads", () => {
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3, states: ["filled"] });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Field");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Field")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Availability" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "a1/r1/toggle", action: "toggle" },
      { address: "a1/r1/from", action: "type" },
      { address: "a1/r1/to", action: "type" },
    ]);
  });
});

describe("Availability parts, filled state and read/act", () => {
  it.each([false, true])("draws all controls when working is %s and draws breaks only when present", (on) => {
    for (const withBreak of [false, true]) {
      const input = firstDay({ on, ...(withBreak ? { breakFrom: "12:00", breakTo: "13:00" } : {}) });
      const html = renderInstance("Availability", input, "filled", theme);
      const parsed = stamped(input);
      const offered = affordancesOf(meta, parsed, "a1");
      expect(offered).toHaveLength(21);
      for (const [index, day] of parsed.days.entries()) {
        const base = `home/c1/${day.id}`;
        expect(elementAt(html, `${base}/root`).attributes).toContain(`aria-label="${day.day}"`);
        expect(elementAt(html, `${base}/toggle`).attributes).toContain('role="switch"');
        expect(elementAt(html, `${base}/toggle`).attributes).toContain(`aria-checked="${day.on}"`);
        for (const part of ["from", "to"]) {
          expect(elementAt(html, `${base}/${part}`).attributes).toContain('role="textbox"');
          expect(styleAt(html, `${base}/${part}`)).toContain("min-width:44px");
          expect(styleAt(html, `${base}/${part}`)).toContain(`color:var(--${day.on ? "text" : "muted"})`);
          expect(offered).toContainEqual({
            address: `a1/${day.id}/${part}`,
            part,
            action: "type",
            detail: "",
          });
        }
        expect(html).toContain(weekdayNames[index]);
      }
      expect(html.includes("home/c1/r1/break")).toBe(withBreak);
      if (withBreak) expect(html).toContain(breakLine("12:00", "13:00"));
      const reading = readComponent(components.Availability, input, "a1").join("\n");
      expect(reading).toContain("Monday");
      for (const day of input.days) {
        expect(reading).toContain(day.from);
        expect(reading).toContain(day.to);
      }
      expect(reading).toContain(`[a1/r1/toggle toggle:${on ? "on" : "off"}]`);
    }
  });
});

describe("Availability identity and read/act", () => {
  it("uses the weekday identity, not array order, for names", () => {
    const input = { days: [...neutral().days].reverse() };
    const html = renderInstance("Availability", input, "filled", theme);
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('aria-label="sun"');
    expect(html).toContain("Sunday");
  });
  it("supports repeated switches and both time actions through the shared controller", () => {
    const input = examples[0]!;
    const screen = { id: "home", components: [{ id: "a1", c: "Availability", ...input }] };
    const defs = { Availability: components.Availability };
    const controller = createScreenController({ screen, defs });
    expect(controller.press("a1/r1/toggle").ok).toBe(true);
    expect(controller.store.get("home/a1/r1/toggle")).toBe(false);
    expect(controller.press("a1/r1/toggle").ok).toBe(true);
    expect(controller.store.get("home/a1/r1/toggle")).toBe(true);
    for (const [part, value] of [
      ["from", "10:00"],
      ["to", "16:00"],
    ]) {
      expect(controller.edit(`a1/r1/${part}`, value!).ok).toBe(true);
      expect(controller.read()).toContain(`a1/r1/${part} type = "${value}"`);
    }
    expect(
      planAct(screen, defs, {}, [{ address: "a1/r1/break", action: "type", value: "12:00" }]),
    ).toMatchObject({ ok: false, code: "not_actionable" });
    controller.dispose();
  });
});
