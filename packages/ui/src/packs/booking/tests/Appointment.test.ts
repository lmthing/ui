import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  appointmentLabels,
  components,
  createRegistry,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Appointment;
const { service, date, time, minutes, status, goto } = examples[0]!;
const base = { service, date, time, minutes, status, goto };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
describe("Appointment schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults the card and trims text without accepting runtime props", () => {
    const parsed = props.parse({ ...base, service: ` ${service} ` });
    expect(parsed).toMatchObject({ service, style: "card", cancel: {} });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
  it.each([
    { service: "" },
    { service: "   " },
    { service: "a".repeat(29) },
    { with: "a".repeat(25) },
    { place: "a".repeat(41) },
    { style: "summary", policy: "a".repeat(101) },
    { policy: "Only in a summary" },
    { date: "2026-02-29" },
    { date: "20 Nov 2026" },
    { time: "24:00" },
    { time: "09:60" },
    { time: "9:00" },
    { minutes: 4 },
    { minutes: 601 },
    { minutes: 30.5 },
    { price: -1 },
    { price: Infinity },
    { status: "booked" },
    { style: "plain" },
    { goto: "Bad ID" },
    { goto: "a".repeat(65) },
    { color: "red" },
    { cancel: {} },
  ])("rejects invalid and unknown input", (invalid) =>
    expect(props.safeParse({ ...base, ...invalid }).success).toBe(false),
  );
});
describe("Appointment boundaries", () => {
  it("accepts exact text, date, time, duration, money and target boundaries", () => {
    expect(props.safeParse({}).success).toBe(false);
    for (const minutes of [5, 600])
      for (const price of [0, Number.MAX_VALUE]) {
        expect(
          props.safeParse({
            ...base,
            service: "a".repeat(28),
            with: "a".repeat(24),
            place: "a".repeat(40),
            style: "summary",
            policy: "a".repeat(100),
            date: "9999-12-31",
            time: "23:59",
            minutes,
            price,
            goto: "a".repeat(64),
          }).success,
        ).toBe(true);
      }
    expect(props.safeParse({ ...base, date: "2024-02-29", time: "00:00" }).success).toBe(true);
  });
});
describe("Appointment fallback and metadata", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    },
    { things: [], items: [{ id: "bad", type: "thing", sample: false, name: 7 }] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "x".repeat(80) }],
    },
  ];
  it.each(casts)("validates empty, matching, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses only cast titles or neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).service).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).service).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).service).toBe("Item one");
  });
  it("keeps the core near miss, probe shapes, tier, confirmation and pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", confirmParts: ["cancel"] });
    expect(meta.pick).toContain("Card");
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Card")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Appointment" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry().ids).not.toContain("Appointment");
    expect(createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toContain("Appointment");
  });
});
describe("Appointment states, parts and read/act", () => {
  it.each(["card", "summary"] as const)("draws and offers only %s actions for every status", (style) => {
    for (const status of ["confirmed", "pending", "cancelled", "done"] as const) {
      const input = { ...base, style, status };
      const html = renderInstance("Appointment", input, "filled", theme);
      const offered = affordancesOf(meta, props.parse(input), "a1");
      expect(offered).toEqual([
        { address: "a1", part: "root", action: "press", detail: "→time" },
        ...(style === "card"
          ? [
              { address: "a1/reschedule", part: "reschedule", action: "press", detail: "→time" },
              { address: "a1/cancel", part: "cancel", action: "press", detail: "" },
            ]
          : [{ address: "a1/edit", part: "edit", action: "press", detail: "→time" }]),
      ]);
      for (const action of offered)
        expect(elementAt(html, `home/c1/${action.part}`).attributes).toMatch(/role="(?:button|link)"/);
      expect(html.includes('data-testid="home/c1/status"')).toBe(style === "card");
      const reading = readComponent(components.Appointment, input, "a1").join("\n");
      for (const text of ["20 Nov 2026", "2026-11-20", "09:00", "30 min"]) expect(reading).toContain(text);
      expect(reading.includes(appointmentLabels[status])).toBe(style === "card");
    }
  });
  it("draws every optional detail, including a zero price, and omits absent parts", () => {
    const minimal = renderInstance("Appointment", base, "filled", theme);
    for (const part of ["with", "place", "price", "policy"]) expect(minimal).not.toContain(`home/c1/${part}`);
    const input = { ...base, ...examples[1]!, place: "Park", price: 0 };
    const html = renderInstance("Appointment", input, "filled", theme);
    const reading = readComponent(components.Appointment, input, "a1").join("\n");
    for (const part of ["service", "date", "time", "minutes", "with", "place", "price", "policy"])
      expect(html).toContain(`home/c1/${part}`);
    for (const text of ["Sam", "Park", "$0", props.parse(input).policy!]) expect(reading).toContain(text);
  });
});
describe("Appointment state and cancellation", () => {
  it("renders loading without live parts and success with the booked badge", () => {
    for (const style of ["card", "summary"]) {
      const input = { ...base, style };
      const loading = renderInstance("Appointment", input, "loading", theme);
      expect(loading).toContain("Loading");
      const part = style === "card" ? "reschedule" : "edit";
      expect(elementAt(loading, `home/c1/${part}`).attributes).toContain('aria-disabled="true"');
      expect(readComponent(components.Appointment, input, "a1", "loading")).toEqual([
        `a1 Appointment${style === "summary" ? "[summary]" : ""} (loading)`,
      ]);
      const success = renderInstance("Appointment", input, "success", theme);
      expect(success.includes(appointmentLabels.booked)).toBe(style === "card");
    }
  });
  it("preserves exact extreme prices in the reading while rendering a compact amount", () => {
    const input = { ...base, price: Number.MAX_VALUE };
    expect(renderInstance("Appointment", input, "filled", theme)).toContain("$1.8E308");
    expect(readComponent(components.Appointment, input, "a1").join("\n")).toContain(String(Number.MAX_VALUE));
  });
  it("defers cancellation, dismisses safely, confirms once, and never reschedules on cancel", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "a1", c: "Appointment", ...base }] },
      defs: components,
      onAction,
      onLink,
    });
    expect(runtime.press("a1/cancel")).toMatchObject({ ok: true });
    expect(runtime.confirmation?.source).toBe("home/a1/cancel");
    expect(onAction).not.toHaveBeenCalled();
    runtime.press("confirm/cancel");
    expect(onAction).not.toHaveBeenCalled();
    runtime.press("a1/cancel");
    runtime.press("confirm/confirm");
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/a1/cancel", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
    expect(runtime.press("confirm/confirm")).toMatchObject({ ok: false });
    runtime.press("a1/reschedule");
    expect(onLink).toHaveBeenCalledExactlyOnceWith("time", "home/a1/reschedule");
    runtime.dispose();
  });
  it("routes summary editing and rejects hidden actions", () => {
    const onLink = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "a1", c: "Appointment", ...base, style: "summary" }] },
      defs: components,
      onLink,
    });
    expect(runtime.press("a1/cancel")).toMatchObject({ ok: false });
    expect(runtime.press("a1/reschedule")).toMatchObject({ ok: false });
    expect(runtime.press("a1/edit")).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledExactlyOnceWith("time", "home/a1/edit");
    runtime.dispose();
  });
});
