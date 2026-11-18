import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta, examples, fallback, probes } = components.People;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("People schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and derives root presence without adding optional inputs", () => {
    expect(props.parse({ members: [{ name: " Anna " }] })).toEqual({
      style: "rows",
      members: [{ name: "Anna", root: undefined }],
    });
    expect(props.parse({ members: [{ name: " Anna ", role: " Owner ", goto: "anna" }] })).toEqual({
      style: "rows",
      members: [{ name: "Anna", role: "Owner", goto: "anna", root: "anna" }],
    });
  });
  it.each([
    { style: "stack", more: 0, members: [{ name: "Anna" }] },
    { style: "grid", members: [{ name: "Anna" }] },
    {},
    { members: [] },
    { members: Array.from({ length: 7 }, () => ({ name: "Anna" })) },
    { members: [{ name: "" }] },
    { members: [{ name: " ".repeat(4) }] },
    { members: [{ name: 4 }] },
    { members: [{ name: "a".repeat(25) }] },
    { members: [{ name: "Anna", role: "" }] },
    { members: [{ name: "Anna", role: " " }] },
    { members: [{ name: "Anna", role: 4 }] },
    { members: [{ name: "Anna", role: "a".repeat(25) }] },
    { members: [{ name: "Anna", photo: "https://example.org/image.png" }] },
    { members: [{ name: "Anna", photo: `lib:${"a".repeat(61)}` }] },
    { members: [{ name: "Anna", photo: "local:person" }] },
    { members: [{ name: "Anna", goto: "Bad ID" }] },
    { members: [{ name: "Anna", goto: "a".repeat(65) }] },
    { members: [{ name: "Anna", id: "r1" }] },
    { members: [{ name: "Anna", root: "anna" }] },
    { members: [{ name: "Anna", pixels: 4 }] },
    { members: [{ name: "Anna", color: "#ffffff" }] },
    { members: [{ name: "Anna" }], style: "grid" },
    { members: [{ name: "Anna" }], color: "red" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths, count and both photo reference forms", () => {
    const member = {
      name: "a".repeat(24),
      role: "a".repeat(24),
      photo: `lib:${"a".repeat(60)}`,
      goto: "a".repeat(64),
    };
    expect(props.safeParse({ members: Array.from({ length: 6 }, () => member) }).success).toBe(true);
    expect(props.safeParse({ members: [{ name: "Anna", photo: "local:1" }] }).success).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type Member = Props<typeof props, typeof meta>["members"][number];
    expectTypeOf<Member["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Member["name"]>().toEqualTypeOf<string>();
    expectTypeOf<Member["role"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Member>().not.toBeAny();
    expectTypeOf<Member>().not.toHaveProperty("color");
  });
});

const casts: CastLike[] = [
  { things: [], items: [] },
  {
    things: [{ type: "person", fields: ["name", "role"] }],
    items: [{ id: "anna", type: "person", sample: true, name: "Anna", role: "Owner" }],
  },
  {
    things: [],
    items: [
      { id: "anna", type: "person", sample: true, title: "Anna" },
      { id: "other", type: "other", sample: true, name: "Not included" },
    ],
  },
  {
    things: [{ type: "person", fields: ["summary", "detail", "name"] }],
    items: [
      { id: "one", type: "person", sample: false, name: "Not first", summary: " First ", detail: " Second " },
    ],
  },
  {
    things: [{ type: "person", fields: ["name", "role"] }],
    items: Array.from({ length: 8 }, (_, index) => ({
      id: `person_${index}`,
      type: "person",
      sample: false,
      name: "x".repeat(80),
      role: "y".repeat(80),
    })),
  },
  { things: [], items: [{ id: "one", type: "person", sample: true, name: 4 }] },
];

describe("People fallback and metadata", () => {
  it("validates empty, full, mixed and malformed casts using shared fields and placeholders", () => {
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).members).toEqual(
      [0, 1, 2].map((index) => ({ name: placeholderTitle(index) })),
    );
    expect(fallback({ cast: casts[1]! }).members).toEqual([{ name: "Anna", role: "Owner" }]);
    expect(fallback({ cast: casts[2]! }).members).toEqual([{ name: "Anna" }]);
    expect(fallback({ cast: casts[3]! }).members).toEqual([{ name: "First", role: "Second" }]);
    expect(fallback({ cast: casts[4]! }).members).toEqual(
      Array.from({ length: 3 }, () => ({ name: "x".repeat(24), role: "y".repeat(24) })),
    );
    expect(fallback({ cast: casts[5]! })).toEqual(fallback({ cast: casts[0]! }));
  });
  it("has the contract metadata and well-formed choose, write and read probes", () => {
    expect(meta).toMatchObject({ id: "People", group: "content", region: "body", weight: 2, tier: "people" });
    expect(meta.items).toEqual({ key: "members", parts: ["root", "photo", "name", "role"] });
    expect(meta.parts).toEqual(["root", "more"]);
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.actions).toEqual({ items: { root: ["press"] } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const id of ["List", "Profile"]) expect(meta.pick).toContain(id);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "People")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Profile")).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "People" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 1,
      task: "Open Anna",
      expect: { address: "p1/r1", action: "press" },
    });
  });
  it("builds a data-only registry with case and separator tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("People");
    expect(registry.schema("People")).toBe(props);
    expect(registry.resolve("p-e-o-p-l-e")).toBe("People");
    expect(registry.resolve("p-e-o-p-l-e")).toBe("People");
  });
});

describe("People view and actions", () => {
  it("draws optional roles and round photos, and offers only linked member roots", () => {
    for (const role of [undefined, "Owner"]) {
      for (const photo of [undefined, "lib:people", "local:1"]) {
        for (const goto of [undefined, "anna", "back", "person_details"]) {
          const input = { members: [{ name: "Anna", role, photo, goto }] };
          const parsed = stampItemIds(meta, props.parse(input));
          expect(affordancesOf(meta, parsed, "p1")).toEqual(
            goto ? [{ address: "p1/r1", part: "root", action: "press", detail: `→${goto}` }] : [],
          );
          const html = renderInstance("People", input, "filled", theme);
          for (const part of ["root", "photo", "name"])
            expect(html.match(new RegExp(`data-testid="home/c1/r1/${part}"`, "g"))).toHaveLength(1);
          expect(html.includes('data-testid="home/c1/r1/role"')).toBe(Boolean(role));
          expect(html.includes('role="img"')).toBe(Boolean(photo));
          expect(html.includes('role="link"')).toBe(Boolean(goto));
          if (photo) expect(html).toContain('aria-label="Anna"');
          const read = readComponent(components.People, input, "p1").join("\n");
          expect(read).toContain('"Anna"');
          expect(read.includes(" press")).toBe(Boolean(goto));
          if (goto) expect(read).toContain(`[p1/r1 press→${goto} !needs-people]`);
          if (role) expect(read).toContain('"Owner"');
        }
      }
    }
  });
  it("hides stale members and links in the shared empty state", () => {
    const input = examples[1]!;
    const html = renderInstance("People", input, "empty", theme, "person");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain(emptyLine("person"));
    expect(html).not.toContain("Anna");
    expect(html).not.toContain("Clover");
    expect(html).not.toContain('role="link"');
    expect(html).not.toContain('data-testid="home/c1/r1/');
    expect(readComponent(components.People, input, "p1", "empty")).toEqual(["p1 People (empty)"]);
  });
});

describe("People stack", () => {
  it("makes a count of more people a stack that does not open anyone", () => {
    const parsed = props.parse({ more: 2, members: [{ name: "Anna", goto: "anna" }] });
    expect(parsed.style).toBe("stack");
    expect(parsed.members).toEqual([{ name: "Anna" }]);
    expect(affordancesOf(meta, parsed, "p1")).toEqual([]);
    expect(props.parse({ style: "stack", members: [{ name: "Ben", goto: "ben" }] }).members).toEqual([
      { name: "Ben" },
    ]);
  });
  it("draws overlapping avatars, one addressable item each, and a count of the rest", () => {
    const input = examples[2]!;
    const parsed = props.parse(input);
    const reads = readComponent(components.People, input, "p1").join("\n");
    expect(reads).toContain("+3");
    expect(affordancesOf(meta, parsed, "p1")).toEqual([]);
    const html = renderInstance("People", input, "filled", theme);
    for (const index of [1, 2, 3]) expect(html).toContain(`data-testid="home/c1/r${index}/root"`);
    expect(html).not.toContain('data-testid="home/c1/r4/root"');
    expect(html).toContain('data-testid="home/c1/more"');
    expect(html).toContain("+3");
  });
});
