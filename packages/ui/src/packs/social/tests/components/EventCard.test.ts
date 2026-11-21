import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, type AddressedElement } from "../../../../../test/render";

const def = components.EventCard;
const { props, meta, fallback, examples, probes } = def;
const example = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const parts = (input: unknown, state: "filled" | "loading" = "filled") =>
  addressedElements(renderInstance("EventCard", input, state, theme, { component: "e1" }));
const address = (part: string) => `home/e1/${part}`;
const attendance = (part?: AddressedElement) => [...(part?.children[0]?.text ?? []), ...(part?.text ?? [])].join("");
describe("EventCard schema", () => {
  it.each(examples)("accepts the domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("applies defaults, trims strings, and accepts exact bounds", () => {
    const { status: _status, ...input } = example;
    expect(props.parse({ ...input, title: "  Swap  " })).toMatchObject({
      title: "Swap",
      media: "cover",
      surface: "card",
      status: "none",
    });
    expect(props.parse(input).density).toBeUndefined();
    expect(
      props.safeParse({
        ...input,
        title: "a".repeat(40),
        place: "b".repeat(40),
        photo: "local:1",
        attendees: Array(5).fill("c".repeat(24)),
        going: 999999,
        goto: "x".repeat(64),
      }).success,
    ).toBe(true);
    expect(props.safeParse({ ...input, photo: undefined, attendees: [], going: 0 }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
  // prettier-ignore
  it.each([
    {}, ...[
      { title: " " }, { title: "a".repeat(41) }, { place: "b".repeat(41) },
      { date: "2026-02-30" }, { time: "25:00" }, { goto: undefined }, { goto: "Bad ID" },
      { status: "maybe" }, { media: "hero" }, { density: "tiny" }, { surface: "tinted" },
      { going: -1 }, { going: 1.5 }, { going: 1000000 }, { going: 2 },
      { attendees: Array(6).fill("A") }, { attendees: ["x".repeat(25)] },
      { photo: "https://example.org/photo" }, { color: "red" }, { pixels: 4 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid wire input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("EventCard fallback and metadata", () => {
  it("uses bounded cast content and validates empty and malformed casts", () => {
    const empty: CastLike = { things: [], items: [] };
    const things = [{ type: "entry", fields: ["heading", "where", "when", "clock"] }];
    const valid: CastLike = {
      things,
      items: [
        {
          id: "swap",
          type: "entry",
          sample: true,
          heading: "A".repeat(50),
          where: "Studio",
          when: "2028-02-29",
          clock: "10:30",
        },
      ],
    };
    const malformed: CastLike = {
      things,
      items: [{ id: "Bad ID", type: "entry", sample: true, heading: 7 }],
    };
    const neutral = {
      title: "Item one",
      date: "1970-01-01",
      time: "00:00",
      going: 0,
      status: "none",
      goto: "event",
    };
    for (const cast of [empty, valid, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty })).toMatchObject(neutral);
    expect(fallback({ cast: malformed })).toMatchObject(neutral);
    expect(fallback({ cast: valid })).toMatchObject({
      title: "A".repeat(40),
      place: "Studio",
      date: "2028-02-29",
      time: "10:30",
      goto: "swap",
    });
  });
  it("keeps the people tier, pack gate, no confirmation, and core-first, variant and read probes", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "people", weight: 2, states: ["filled", "loading"] });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["social"], includeDrafts: true }).schema("EventCard")).toBe(props);
    expect(createRegistry({ packs: ["social"] }).ids.includes("EventCard")).toBe(packReady("social"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "EventCard" }),
        expect.objectContaining({ kind: "choose", expect: "Card" }),
        expect.objectContaining({ kind: "write", expect: "EventCard" }),
        expect.objectContaining({ kind: "write", variant: { axis: "media", value: "none" } }),
        expect.objectContaining({ kind: "read", expect: { address: "e1/going", action: "press" } }),
      ]),
    );
  });
});

describe("EventCard states, parts, and read", () => {
  it("draws date, venue, RSVP count, ordered attendee names and separate actions", () => {
    const drawn = parts(example);
    for (const [part, value] of Object.entries({
      title: example.title,
      date: "28",
      month: "Nov",
      time: "14:00",
      place: example.place,
    }))
      expect(drawn.get(address(part))?.text).toEqual([value]);
    expect(attendance(drawn.get(address("count")))).toBe("14 going");
    example.attendees?.forEach((name, index) =>
      expect(drawn.get(address(`r${index + 1}/root`))?.attributes).toContain(`aria-label="${name}"`),
    );
    expect(drawn.get(address("root"))?.attributes).toContain('role="link"');
    expect(drawn.get(address("going"))?.attributes).toContain('role="button"');
    expect(drawn.get(address("interested"))?.attributes).toContain('role="button"');
    expect(drawn.get(address("photo"))?.attributes).toContain('aria-label="Event cover photo"');
    const read = readComponent(def, example, "e1").join("\n");
    for (const text of ["Maya", "Sam", "Jo", "28", "Nov", "14:00", "14 going", example.place])
      expect(read).toContain(text);
    expect(read).toContain("[e1 press→swap_meet !needs-people]");
    expect(read).toContain("[e1/going press !needs-people]");
    expect(read).toContain("[e1/interested press !needs-people]");
  });

  // prettier-ignore
  it.each([["none", "RSVP"], ["going", "You’re going"], ["interested", "You’re interested"]] as const)("marks only the current RSVP (%s)", (status, label) => {
    const drawn = parts({ ...example, status });
    expect(drawn.get(address("rsvp"))?.attributes).toContain(`aria-label="${label}"`);
    for (const action of ["going", "interested"])
      expect(drawn.has(address(`${action}_icon`))).toBe(status === action);
  });

  it("retains the exact count without attendees, and cover is optional", () => {
    const drawn = parts({ ...example, photo: undefined, going: 0, attendees: undefined });
    expect(attendance(drawn.get(address("count")))).toBe("0 going");
    expect(drawn.has(address("photo"))).toBe(false);
    expect(drawn.has(address("r1/root"))).toBe(false);
  });
  it("retains finish addresses and hides only the cover in media.none", () => {
    const defaults = [...parts(example).keys()];
    expect([...parts({ ...example, density: "compact", surface: "outlined" }).keys()]).toEqual(defaults);
    const hidden = { ...example, media: "none" };
    expect([...parts(hidden).keys()]).toEqual(defaults.filter((key) => key !== address("photo")));
  });

  it("loads with no link, RSVP controls, attendee names, or visible event data", () => {
    const drawn = parts(example, "loading");
    expect(drawn.get(address("root"))?.attributes).not.toContain('role="link"');
    for (const part of ["going", "interested", "title", "r1/root", "photo"])
      expect(drawn.has(address(part))).toBe(false);
    expect(readComponent(def, example, "e1", "loading").join("\n")).toBe("e1 EventCard (loading)");
  });
});

describe("EventCard controller", () => {
  it.each(["filled", "loading"] as const)("dispatches only the available actions in %s", (state) => {
    const onAction = vi.fn();
    const onLink = vi.fn();
    const screen = { id: "home", components: [{ ...example, c: "EventCard", id: "e1", state }] };
    const runtime = createScreenController({ screen, defs: components, onAction, onLink });
    const filled = state === "filled";
    try {
      for (const part of ["going", "interested"]) expect(runtime.press(`e1/${part}`).ok).toBe(filled);
      expect(runtime.press("e1").ok).toBe(filled);
      expect(runtime.press("e1/count").ok).toBe(false);
      expect(onLink.mock.calls).toEqual(filled ? [["swap_meet", "home/e1"]] : []);
      const expected = filled ? [address("going"), address("interested"), "home/e1"] : [];
      expect(onAction.mock.calls.map(([event]) => event)).toEqual(
        expected.map((address) => ({ address, action: "press" })),
      );
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
});
