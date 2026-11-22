import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.ServiceMenu;
const service = { name: "Consultation", minutes: 30, goto: "time" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: "filled" | "empty" | "loading" = "filled") =>
  renderInstance("ServiceMenu", input, state, theme);

describe("ServiceMenu contract and boundaries", () => {
  it.each(examples)("accepts every domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to rows and trims names", () => {
    expect(props.parse({ services: [{ ...service, name: " Consultation " }] })).toEqual({
      detail: "full",
      lead: "thumb",
      services: [{ ...service, capacity: 1, tone: "neutral", mark: "none" }],
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["services"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
  it.each([
    {},
    { services: [] },
    { services: Array.from({ length: 13 }, () => service) },
    ...["", " ", "x".repeat(29)].map((name) => ({ services: [{ ...service, name }] })),
    ...[4, 601, 5.5, NaN, Infinity].map((minutes) => ({ services: [{ ...service, minutes }] })),
    ...[-1, NaN, Infinity].map((price) => ({ services: [{ ...service, price }] })),
    ...[
      { sub: "x".repeat(61) },
      { group: "x".repeat(21) },
      { sub: "" },
      { group: " " },
      { photo: "https://example.org/photo.png" },
      { photo: `lib:${"x".repeat(61)}` },
      { goto: "Bad ID" },
      { goto: "x".repeat(65) },
      { goto: undefined },
      { id: "r1" },
      { color: "red" },
    ].map((fields) => ({ services: [{ ...service, ...fields }] })),
    { services: [service], style: "grid" },
    { services: [service], pixels: 12 },
  ])("rejects invalid or unbounded input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact text, count, duration and photo bounds, and a zero or fractional price", () => {
    const row = {
      name: "x".repeat(28),
      sub: "x".repeat(60),
      group: "x".repeat(20),
      minutes: 600,
      price: 0,
      photo: `lib:${"x".repeat(60)}`,
      goto: "x".repeat(64),
    };
    expect(props.safeParse({ services: Array.from({ length: 12 }, () => row) }).success).toBe(true);
    expect(
      props.safeParse({ services: [{ ...service, minutes: 5, price: 12.5, photo: "local:1" }] }).success,
    ).toBe(true);
  });
});

describe("ServiceMenu fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "service", fields: ["name", "description"] }],
      items: [
        { id: "visit", type: "service", sample: true, name: "Consultation", description: "An initial visit" },
      ],
    },
    {
      things: [],
      items: [
        { id: "a", type: "service", sample: true, title: "Consultation" },
        { id: "b", type: "other", sample: true, name: "Other" },
      ],
    },
    {
      things: [{ type: "service", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `s_${index}`,
        type: "service",
        sample: false,
        name: "x".repeat(80),
        description: "y".repeat(80),
      })),
    },
    { things: [], items: [{ id: "a", type: "service", sample: true, name: 4 }] },
  ];
  it.each(casts)("validates empty, full, mixed, long and malformed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses only cast helpers and neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).services[0]?.name).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).services[0]?.name).toBe("Consultation");
    expect(fallback({ cast: casts[1]! }).services[0]?.sub).toBe("An initial visit");
    expect(fallback({ cast: casts[2]! }).services).toHaveLength(1);
    expect(fallback({ cast: casts[3]! }).services).toHaveLength(3);
    expect(fallback({ cast: casts[4]! }).services[0]?.name).toBe("Item one");
  });
});

describe("ServiceMenu states and parts", () => {
  it.each([undefined, "cards"] as const)("draws optional parts and one link per service in %s", (style) => {
    const input = {
      style,
      services: [
        { ...service, group: "Visits", photo: "lib:plants", price: 0, sub: "An initial visit" },
        { ...service, name: "Follow up", group: "Visits", price: 12.5 },
        { ...service, name: "Advice", group: "Advice" },
        service,
        { ...service, group: "Visits" },
      ],
    };
    const html = draw(input);
    for (const part of ["name", "minutes", "price", "sub", "group", "photo"])
      expect(elementAt(html, `home/c1/r1/${part}`).attributes).toContain("data-testid");
    expect(elementAt(html, "home/c1/r1/root").attributes).toContain('role="link"');
    expect(html).not.toContain('data-testid="home/c1/r2/group"');
    expect(html).toContain('data-testid="home/c1/r3/group"');
    expect(html).toContain('data-testid="home/c1/r5/group"');
    for (const part of ["price", "sub", "group", "photo"])
      expect(html).not.toContain(`data-testid="home/c1/r4/${part}"`);
  });
  it("renders all twelve dense services, including maximum duration and long text", () => {
    const html = draw({
      services: Array.from({ length: 12 }, (_, index) => ({
        ...service,
        name: "Initial consultation session",
        minutes: index ? 600 : 5,
        sub: "Discuss the next steps and choose a suitable follow up visit",
      })),
    });
    expect(html.match(/data-testid="home\/c1\/r\d+\/root"/g)).toHaveLength(12);
  });
  it.each([undefined, "cards"] as const)("keeps %s empty/loading non-actionable", (style) => {
    const input = { ...examples[0], style };
    for (const state of ["empty", "loading"] as const) {
      const html = draw(input, state);
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).not.toContain('role="link"');
      expect(html).toContain(state === "empty" ? "Nothing here yet" : "Loading");
      expect(readComponent(components.ServiceMenu, input, "s1", state)).toEqual([
        `s1 ServiceMenu${style === "cards" ? "[cards]" : ""} (${state})`,
      ]);
    }
  });
});

describe("ServiceMenu read/act and core-first probes", () => {
  it("offers exactly one phone-tier booking action per item, including fallback destinations", () => {
    for (const goto of ["time", "details", "back", "service_details"]) {
      const input = props.parse({ services: [{ ...service, goto }] });
      expect(affordancesOf(meta, stampItemIds(meta, input), "s1")).toEqual([
        { address: "s1/r1", part: "root", action: "press", detail: `→${goto}` },
      ]);
      const reading = readComponent(components.ServiceMenu, input, "s1").join("\n");
      expect(reading).toContain(`[s1/r1 press→${goto}]`);
    }
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3 });
  });
  it("reads the exact durations, formatted prices and booking cue", () => {
    const reading = readComponent(
      components.ServiceMenu,
      {
        services: [{ ...service, minutes: 5, price: 0 }, { ...service, minutes: 600, price: 12.5 }, service],
      },
      "s1",
    ).join("\n");
    for (const text of ["5 min", "600 min", "30 min", "$0", "$12.50", "Book"])
      expect(reading).toContain(text);
  });
  it("keeps purpose, near miss, writer and reader probes, and incomplete packs out of live prompts", () => {
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("List");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "ServiceMenu" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "s1/r1", action: "press" },
    });
    expect(createRegistry().ids).not.toContain("ServiceMenu");
    expect(createRegistry({ packs: ["booking"], includeDrafts: true }).ids).toContain("ServiceMenu");
  });
});
