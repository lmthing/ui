import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  planAct,
  readComponent,
  readScreen,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../../test/render";
import { medicationLabels } from "../../copy";

const { props, meta, examples, fallback, probes } = components.Medication;
const dose = { name: "Vitamin D", dose: "1 tablet", time: "08:00" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Medication contract and boundaries", () => {
  it.each(examples)("accepts domain examples", (input) => expect(props.safeParse(input).success).toBe(true));
  it("trims text and applies due status", () => {
    expect(props.parse({ doses: [{ ...dose, name: "  Vitamin D  " }] })).toEqual({
      detail: "full",
      doses: [{ ...dose, status: "due", mark: "none" }],
    });
  });
  it.each([
    {},
    { doses: [] },
    { doses: Array.from({ length: 9 }, () => dose) },
    ...["", " ", "a".repeat(25)].map((name) => ({ doses: [{ ...dose, name }] })),
    ...["", "a".repeat(17)].map((value) => ({ doses: [{ ...dose, dose: value }] })),
    ...["24:00", "12:60", "8:00", "08:0", "bad"].map((time) => ({ doses: [{ ...dose, time }] })),
    { doses: [{ ...dose, status: "missed" }] },
    { doses: [{ ...dose, id: "r1" }] },
    { doses: [{ ...dose, color: "red" }] },
    { doses: [dose], pixels: 12 },
    ...[-1, 10001, 1.5, NaN, Infinity].flatMap((value) => [
      { doses: [{ ...dose, left: value }] },
      { doses: [dose], refillAt: value },
    ]),
  ])("rejects invalid or presentation input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact dense, text, clock and integer boundaries", () => {
    for (const time of ["00:00", "23:59"])
      for (const left of [0, 10000])
        expect(
          props.safeParse({
            doses: Array.from({ length: 8 }, () => ({
              name: "a".repeat(24),
              dose: "a".repeat(16),
              time,
              left,
            })),
            refillAt: left,
          }).success,
        ).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["doses"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("Medication fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "r1", type: "record", sample: true, title: "Morning" }],
    },
    { things: [], items: [{ id: "r1", type: "record", sample: true, name: 12 }] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `r${index}`,
        type: "record",
        sample: false,
        title: "x".repeat(100),
      })),
    },
  ];
  it.each(casts)("validates neutral, cast-backed and malformed fallback", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast titles or shared neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).doses.map((row) => row.name)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: casts[0]! }).doses[0]!.dose).toBe("Details");
    expect(fallback({ cast: casts[1]! }).doses[0]!.name).toBe("Morning");
    expect(fallback({ cast: casts[3]! }).doses).toHaveLength(2);
  });
  it("keeps the core-first near miss, dense limits, tier and all action probes", () => {
    expect(meta).toMatchObject({
      status: "ready",
      dense: true,
      weight: 3,
      tier: "phone",
      states: ["filled", "empty", "success", "error"],
      confirmParts: ["skip"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Checklist");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Checklist")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Medication" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "m1/r1/taken", action: "check" },
      { address: "m1/r1/skip", action: "press" },
    ]);
    expect(createRegistry({ packs: ["health"], includeDrafts: true }).resolve("m-e-d-i-c-a-t-i-o-n")).toBe(
      "Medication",
    );
  });
});

describe("Medication state, parts and read/act", () => {
  it.each(["due", "taken", "skipped"] as const)("only offers drawn actions for %s", (status) => {
    const input = { doses: [{ ...dose, status, left: 0 }], refillAt: 0 };
    const stamped = stampItemIds(meta, props.parse(input));
    expect(affordancesOf(meta, stamped, "m1").map(({ address, action }) => ({ address, action }))).toEqual(
      status === "due"
        ? [
            { address: "m1/r1/taken", action: "check" },
            { address: "m1/r1/skip", action: "press" },
          ]
        : [],
    );
    const html = renderInstance("Medication", input, "filled", theme, { component: "m1" });
    for (const part of ["root", "name", "dose", "time", "status", "left"])
      expect(html).toContain(`data-testid="home/m1/r1/${part}"`);
    if (status === "due") {
      expect(html).toContain("Mark taken");
      expect(elementAt(html, "home/m1/r1/taken").attributes).toContain('role="checkbox"');
      expect(elementAt(html, "home/m1/r1/skip").attributes).toContain('role="button"');
    } else {
      expect(html).not.toContain('data-testid="home/m1/r1/taken"');
      expect(html).not.toContain('data-testid="home/m1/r1/skip"');
    }
    expect(html).toContain("0 left");
    const read = readComponent(components.Medication, input, "m1").join("\n");
    expect(read).toContain("08:00");
    expect(read).toContain(medicationLabels[status]);
    expect(read).toContain("Low stock: Vitamin D");
    if (status === "due") expect(read).toContain("[m1/r1/skip press]");
    else expect(read).not.toContain("[m1/r1/skip press]");
  });
  it("renders neutral empty and completed success states, with no due or skip controls", () => {
    const empty = renderInstance("Medication", examples[0], "empty", theme);
    expect(empty).toContain("Nothing here yet");
    expect(empty).not.toContain('role="checkbox"');
    expect(
      renderInstance("Medication", { doses: [{ ...dose, status: "taken" }] }, "filled", theme),
    ).toContain(medicationLabels.success);
    expect(
      renderInstance("Medication", { doses: [{ ...dose, status: "skipped" }] }, "filled", theme),
    ).not.toContain(medicationLabels.success);
    for (const state of ["success", "error"] as const) {
      const offline = renderInstance("Medication", examples[0], state, theme);
      expect(offline).toContain("Dose logging unavailable");
      expect(offline).toContain("Due · Not logged");
      expect(offline).toContain("1 tablet");
      expect(offline).not.toContain(medicationLabels.success);
      expect(offline).not.toContain('role="checkbox"');
      expect(offline).not.toContain('data-testid="home/c1/r1/skip"');
      const read = readComponent(components.Medication, examples[0], "m1", state).join("\n");
      expect(read).toContain("Dose logging unavailable");
      expect(read).not.toContain(medicationLabels.success);
      expect(read).not.toContain("[m1/r1/taken check]");
    }
  });
});

describe("Medication dose acknowledgements", () => {
  const screen = { id: "home", components: [{ id: "m1", c: "Medication", ...examples[2] }] };
  const mark = { address: "m1/r2/taken", action: "check" };
  const skip = { address: "m1/r3/skip", action: "press" };
  it("commits only the chosen row, closes its actions, and never makes a skipped dose taken", () => {
    const taken = planAct(screen, components, {}, [mark]);
    expect(taken.ok).toBe(true);
    if (!taken.ok) return;
    const read = readScreen(screen, components, taken.values);
    expect(read).toContain("Vitamin D: 09:00 · 1 tablet · Logged as taken");
    expect(read).toContain("Magnesium: 20:00 · 1 capsule · Due");
    expect(read).toContain("4 left");
    expect(planAct(screen, components, taken.values, [mark])).toMatchObject({ ok: false });
    const skipped = planAct(screen, components, taken.values, [skip]);
    expect(skipped.ok).toBe(true);
    if (!skipped.ok) return;
    expect(readScreen(screen, components, skipped.values)).toContain(
      "Magnesium: 20:00 · 1 capsule · Skipped",
    );
    expect(readScreen(screen, components, skipped.values)).not.toContain(medicationLabels.success);
  });
  it("keeps an acknowledgement on stock refresh but never applies it to a changed dose", () => {
    const taken = planAct(screen, components, {}, [mark]);
    if (!taken.ok) throw new Error(taken.code);
    const refresh = (change: { left: number } | { dose: string }) => ({
      ...screen,
      components: screen.components.map((row) => ({
        ...row,
        doses: examples[2]!.doses.map((dose, index) => (index === 1 ? { ...dose, ...change } : dose)),
      })),
    });
    const stock = readScreen(refresh({ left: 3 }), components, taken.values);
    expect(stock).toContain("Vitamin D: 09:00 · 1 tablet · Logged as taken");
    expect(stock).toContain("3 left");
    expect(readScreen(refresh({ dose: "2 tablets" }), components, taken.values)).toContain(
      "Vitamin D: 09:00 · 2 tablets · Due",
    );
  });
});

describe("Medication ordered and optional parts", () => {
  it.each(meta.states)("stamps one component root for every example in %s", (state) => {
    for (const example of examples) {
      const html = renderInstance("Medication", example, state, theme);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    }
  });
  it("orders time groups without changing addresses and omits unknown stock or inactive refill", () => {
    const input = {
      doses: [
        { ...dose, time: "20:00" },
        { ...dose, time: "08:00" },
      ],
    };
    const html = renderInstance("Medication", input, "filled", theme);
    expect(html.indexOf('data-testid="home/c1/r2/root"')).toBeLessThan(
      html.indexOf('data-testid="home/c1/r1/root"'),
    );
    expect(html).not.toContain('data-testid="home/c1/refill"');
    expect(html).not.toContain('data-testid="home/c1/r1/left"');
    expect(
      renderInstance("Medication", { doses: [{ ...dose, left: 6 }], refillAt: 5 }, "filled", theme),
    ).not.toContain('data-testid="home/c1/refill"');
  });
});
