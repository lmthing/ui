import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.ClientCard;
const client = { name: "Alex Morgan", photo: "local:1", tags: [], phone: false, address: false };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: "filled" | "loading" = "filled") =>
  renderInstance("ClientCard", input, state, theme);

describe("ClientCard contract and boundaries", () => {
  it.each(examples)("accepts every domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims bounded text and keeps view props strictly typed", () => {
    expect(props.parse({ ...client, name: " Alex Morgan ", tags: [" Regular "] })).toMatchObject({
      ...client,
      tags: ["Regular"],
    });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["name"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it.each([
    {},
    ...["", " ", "x".repeat(29)].map((name) => ({ ...client, name })),
    ...["", " ", "x".repeat(37)].map((next) => ({ ...client, next })),
    ...["", " ", "x".repeat(13)].map((tag) => ({ ...client, tags: [tag] })),
    { ...client, tags: Array.from({ length: 4 }, () => "New") },
    ...["2025-02-29", "2024-04-31", "2025-13-01", "2025-00-01", "03/04/2025"].map((since) => ({
      ...client,
      since,
    })),
    ...["https://example.org/photo.png", "local:0", `lib:${"x".repeat(61)}`].map((photo) => ({
      ...client,
      photo,
    })),
    { ...client, phone: "yes" },
    { ...client, address: 1 },
    { ...client, tags: undefined },
    { ...client, photo: undefined },
    { ...client, phone: undefined },
    { ...client, address: undefined },
    { ...client, color: "red" },
    { ...client, pixels: 12 },
    { ...client, id: "c1" },
    { ...client, style: "row" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact limits, empty tags and both reference forms", () => {
    expect(
      props.safeParse({
        ...client,
        name: "x".repeat(28),
        next: "x".repeat(36),
        since: "2024-02-29",
        photo: `lib:${"x".repeat(60)}`,
        tags: Array.from({ length: 3 }, () => "x".repeat(12)),
      }).success,
    ).toBe(true);
    expect(props.safeParse(client).success).toBe(true);
  });
});
describe("ClientCard fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "client", fields: ["name", "detail"] }],
      items: [{ id: "alex", type: "client", sample: true, name: "Alex Morgan", detail: "Friday 09:00" }],
    },
    {
      things: [],
      items: [
        { id: "a", type: "client", sample: true, title: "Alex" },
        { id: "b", type: "other", sample: true, name: "Other" },
      ],
    },
    {
      things: [{ type: "client", fields: ["name", "detail"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `c_${index}`,
        type: "client",
        sample: false,
        name: "x".repeat(80),
        detail: "y".repeat(80),
      })),
    },
    { things: [], items: [{ id: "a", type: "client", sample: true, name: 4 }] },
  ];
  it.each(casts)("validates empty, full, mixed, long and malformed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast fields and neutral placeholders without inventing contact access", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({ ...client, name: "Item one", next: undefined });
    expect(fallback({ cast: casts[1]! })).toMatchObject({ name: "Alex Morgan", next: "Friday 09:00" });
    expect(fallback({ cast: casts[2]! }).name).toBe("Alex");
    expect(fallback({ cast: casts[3]! }).name).toHaveLength(28);
    expect(fallback({ cast: casts[3]! }).next).toHaveLength(36);
    expect(fallback({ cast: casts[4]! }).name).toBe("Item one");
  });
});
describe("ClientCard states and parts", () => {
  it.each([false, true])("draws only available contact controls with phone=%s", (phone) => {
    for (const address of [false, true]) {
      const html = draw({ ...client, phone, address });
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      for (const part of ["photo", "name", "message"])
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain("data-testid");
      expect(elementAt(html, "home/c1/message").attributes).toContain('role="button"');
      for (const [part, present] of [
        ["call", phone],
        ["directions", address],
      ] as const) {
        expect(html.includes(`data-testid="home/c1/${part}"`)).toBe(present);
        if (present) expect(elementAt(html, `home/c1/${part}`).attributes).toContain('role="button"');
      }
      for (const part of ["since", "next", "tags"])
        expect(html).not.toContain(`data-testid="home/c1/${part}"`);
      expect(html).not.toContain('role="checkbox"');
    }
  });
  it("draws all optional summary parts and tags as static text", () => {
    const html = draw(examples[0]);
    for (const part of meta.parts.filter((part) => !["company", "balance", "email"].includes(part)))
      expect(elementAt(html, `home/c1/${part}`).attributes).toContain("data-testid");
    for (const text of ["Client since 3 Apr 2025", "Next: Plant care", "Regular · Key holder"])
      expect(html).toContain(text);
    expect(html).not.toContain('role="checkbox"');
  });
  it.each([false, true])("keeps loading shaped and non-actionable with phone=%s", (phone) => {
    for (const address of [false, true]) {
      const input = { ...examples[0], phone, address };
      const html = draw(input, "loading");
      expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
      expect(html).toContain("Loading");
      expect(html).not.toContain('role="button"');
      expect(html).toMatch(/aria-hidden="true"[^]*?Anna Patel/);
      expect(readComponent(components.ClientCard, input, "c1", "loading")).toEqual([
        "c1 ClientCard (loading)",
      ]);
    }
  });
});
describe("ClientCard read/act and core-first probes", () => {
  it.each([false, true])("offers only drawn actions and service-tier marks with phone=%s", (phone) => {
    for (const address of [false, true]) {
      const input = props.parse({ ...client, phone, address });
      expect(affordancesOf(meta, input, "c1")).toEqual([
        ...(phone ? [{ address: "c1/call", part: "call", action: "press", detail: "" }] : []),
        { address: "c1/message", part: "message", action: "press", detail: "" },
        ...(address ? [{ address: "c1/directions", part: "directions", action: "press", detail: "" }] : []),
      ]);
      const reading = readComponent(components.ClientCard, input, "c1").join("\n");
      for (const part of ["call", "message", "directions"] as const)
        expect(reading.includes(`[c1/${part} press !needs-service]`)).toBe(
          part === "message" || (part === "call" ? phone : address),
        );
    }
  });
  it("reads every displayed label and optional detail", () => {
    const reading = readComponent(components.ClientCard, examples[0], "c1").join("\n");
    for (const text of [
      "Anna Patel",
      "Client since 3 Apr 2025",
      "Next: Plant care · Friday 09:00",
      "Regular · Key holder",
      ...["Call", "Message", "Directions"],
    ])
      expect(reading).toContain(text);
    expect(meta.partTiers).toEqual({
      call: "service",
      message: "service",
      directions: "service",
      email: "service",
    });
  });
  it("preserves metadata, core near miss, probes and the pack readiness gate", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.weight).toBe(2);
    expect(meta.states).toEqual(["filled", "loading"]);
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Profile");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Profile")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "ClientCard" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      expect: { address: "c1/call", action: "press" },
    });
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).resolve("client-card")).toBe(
      "ClientCard",
    );
  });
});
