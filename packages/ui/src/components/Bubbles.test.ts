import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  placeholderDetail,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../test/render";
const { props, meta, examples, fallback, probes } = components.Bubbles;
const message = { from: "them", text: "More details" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Bubbles schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text without inventing a sender or optional name", () => {
    expect(props.parse({ messages: [{ from: "me", text: " Reply " }], with: " Someone " })).toEqual({
      messages: [{ from: "me", text: "Reply" }],
      with: "Someone",
      detail: "full",
    });
    expect(props.parse({ messages: [message] })).not.toHaveProperty("with");
  });
  it.each([
    {},
    { messages: [] },
    { messages: Array.from({ length: 7 }, () => message) },
    { messages: [{ text: "Details" }] },
    { messages: [{ from: "other", text: "Details" }] },
    { messages: [{ ...message, text: "" }] },
    { messages: [{ ...message, text: " ".repeat(4) }] },
    { messages: [{ ...message, text: "a".repeat(121) }] },
    { messages: [{ ...message, text: 4 }] },
    { messages: [{ ...message, id: "m1" }] },
    { messages: [{ ...message, goto: "next" }] },
    { messages: [{ ...message, color: "#ff0000" }] },
    { messages: [message], with: "" },
    { messages: [message], with: " ".repeat(4) },
    { messages: [message], with: "a".repeat(25) },
    { messages: [message], with: 4 },
    { messages: [message], color: "red" },
    { messages: [message], pixels: 4 },
    { messages: [message], style: "chat" },
    { messages: [message], detail: "short" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts exact maximum lengths and both senders at the item bounds", () => {
    for (const count of [1, 6])
      for (const from of ["me", "them"])
        expect(
          props.safeParse({
            messages: Array.from({ length: count }, () => ({ from, text: "a".repeat(120) })),
            with: "a".repeat(24),
          }).success,
        ).toBe(true);
  });
  it("adds validator item ids only to view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["messages"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps["messages"][number]["from"]>().toEqualTypeOf<"me" | "them">();
    expectTypeOf<ViewProps["with"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
});

describe("Bubbles fallback", () => {
  it("uses only the first item's declared detail, or the neutral placeholder", () => {
    // prettier-ignore
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [{ id: "first", type: "entry", sample: true, detail: "More details", heading: "First" }],
      },
      { things: [{ type: "other", fields: ["name"] }],
        items: [{ id: "first", type: "entry", sample: true, heading: "First", detail: "Mixed detail" }],
      },
      { things: [{ type: "entry", fields: ["heading", "detail"] }],
        items: [{ id: "first", type: "entry", sample: false, heading: "First", detail: "y".repeat(160) }],
      },
      { things: [], items: [
        { id: "first", type: "entry", sample: true, heading: 4, detail: " " },
        { id: "second", type: "entry", sample: true, heading: "Second", detail: "Not the first" },
      ] },
      { things: [{ type: "entry", fields: ["heading"] }],
        items: [{ id: "first", type: "entry", sample: true, heading: "Title only" }] },
    ];
    // prettier-ignore
    const expected = [placeholderDetail, "More details", "Mixed detail", "y".repeat(120), placeholderDetail, placeholderDetail];
    casts.forEach((cast, index) => {
      const result = fallback({ cast });
      expect(props.parse(result)).toEqual({
        detail: "full",
        messages: [{ from: "them", text: expected[index] }],
      });
    });
  });
});
// prettier-ignore
it("clips the detail on a word boundary using the first item's own thing", () => {
  const cast: CastLike = {
    things: [{ type: "other", fields: ["name"] }, { type: "entry", fields: ["heading", "detail"] }],
    items: [{ id: "first", type: "entry", sample: true, detail: `${"a".repeat(115)} longerword`, heading: "First" }],
  };
  expect(fallback({ cast }).messages[0]?.text).toBe("a".repeat(115));
});

describe("Bubbles metadata and probes", () => {
  it("has the exact contract and well-formed choose and write probes", () => {
    expect(meta).toMatchObject({
      id: "Bubbles",
      group: "content",
      region: "body",
      weight: 2,
      tier: "people",
      items: { key: "messages" },
      parts: ["root", "with", "broadcast"],
      states: ["filled", "empty"],
    });
    expect(meta).not.toHaveProperty("actions");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    for (const id of ["List", "Note"]) expect(meta.pick).toContain(id);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    for (const id of ["Bubbles", "Note"])
      expect(probes.find((probe) => probe.kind === "choose" && probe.expect === id)).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Bubbles" });
    expect(probes.map((probe) => probe.kind)).not.toContain("read");
    for (const probe of probes) {
      const wording = probe.kind === "choose" ? probe.need : probe.brief;
      for (const name of [meta.id, "List", "Note"])
        expect(wording).not.toMatch(new RegExp(`\\b${name}\\b`, "i"));
    }
  });
  it("builds a data-only registry with separator-tolerant ids", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Bubbles");
    expect(registry.resolve("b-u-b-b-l-e-s")).toBe("Bubbles");
  });
});

describe("Bubbles rendering", () => {
  it.each(examples)("renders every message once with both item parts and no actions", (example) => {
    const html = renderInstance("Bubbles", example, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    const parsed = stampItemIds(meta, props.parse(example));
    for (const [index, item] of parsed.messages.entries()) {
      for (const part of ["root", "text"])
        expect(html.match(new RegExp(`data-testid="home/c1/r${index + 1}/${part}"`, "g"))).toHaveLength(1);
      expect(readComponent(components.Bubbles, example, "c1").join("\n")).toContain(item.text);
    }
    expect(html.includes('data-testid="home/c1/with"')).toBe(Boolean(parsed.with));
    const reading = readComponent(components.Bubbles, example, "c1").join("\n");
    expect(reading.includes(example.with)).toBe(Boolean(parsed.with));
    expect(affordancesOf(meta, parsed, "c1")).toEqual([]);
  });
  it("groups consecutive senders more closely and resets at a side change", () => {
    const messages = ["them", "them", "me", "them"].map((from) => ({ from, text: "Details" }));
    const html = renderInstance("Bubbles", { messages }, "filled", theme);
    const tags = [1, 2, 4].map((index) =>
      html
        .match(new RegExp(`<[^>]*data-testid="home/c1/r${index}/root"[^>]*>`))?.[0]
        ?.replace(/data-testid="[^"]+"/, ""),
    );
    expect(tags[0]).toBeDefined();
    expect(tags[0]).toBe(tags[2]);
    expect(tags[0]).not.toBe(tags[1]);
  });
  it("renders the shared empty line without stale messages or the optional person", () => {
    const html = renderInstance("Bubbles", examples[0], "empty", theme, "entry");
    expect(html).toContain(emptyLine("entry"));
    expect(html).not.toContain(examples[0]!.with);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    for (const item of examples[0]!.messages) expect(html).not.toContain(item.text);
  });
});
// prettier-ignore
it("renders message details at the same item address without adding actions", () => {
  const rich = { style: "group", messages: [
    { ...message, sender: "Anna", avatar: "lib:anna", time: "09:12", status: "read", replyTo: "Hi",
      attachment: { kind: "photo", photo: "lib:park" }, reactions: ["👍"] },
  ] };
  const parts = addressedElements(renderInstance("Bubbles", rich, "filled", theme));
  for (const part of meta.items.parts) expect(parts.has(`home/c1/r1/${part}`)).toBe(true);
  expect(affordancesOf(meta, stampItemIds(meta, props.parse(rich)), "c1")).toEqual([]);
  expect(props.safeParse({ messages: [{ ...message, attachment: { kind: "photo" } }] }).success).toBe(false);
});

// prettier-ignore
it("hides just the partner heading without renumbering messages", () => {
  const input = examples[0]!;
  expect(meta.variantParts["detail.brief"].hides).toEqual(["with"]);
  const addresses = (value: unknown) => [...addressedElements(renderInstance("Bubbles", value, "filled", theme)).keys()];
  expect(addresses({ ...input, detail: "brief" })).toEqual(addresses(input).filter((part) => part !== "home/c1/with"));
});
