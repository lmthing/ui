import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance, type AddressedElement } from "../../../../../test/render";

const { Sessions } = components;
const { props, meta, examples, fallback, probes } = Sessions;
type Input = ReturnType<typeof fallback>;
const example: Input = examples[0]!;
const first = example.sessions[0]!;
const agenda: Input = {
  ...examples[1]!,
  sessions: [
    ...examples[1]!.sessions,
    { ...examples[1]!.sessions[0]!, id: "meet", title: "Meet the crew", saved: false },
  ],
};
const defs = { Sessions };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = (input: Input = example, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "Sessions", state }],
});
const filter = (value: string) => ({ address: "s1/track", action: "select", value });
const save = (item: string) => ({ address: `s1/${item}/save`, action: "toggle" });
const open = (item: string) => ({ address: `s1/${item}`, action: "press" });
const render = (input = example, state: StateName = "filled", lang = "en") =>
  renderInstance("Sessions", input, state, theme, { component: "s1", lang });
const partText = (element?: AddressedElement): string[] =>
  element ? [...element.text, ...element.children.flatMap(partText)] : [];
const hasButton = (element?: AddressedElement): boolean =>
  Boolean(element && (element.attributes.includes('role="button"') || element.children.some(hasButton)));

describe("Sessions contract", () => {
  it.each(examples)("parses the domain examples", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("is ready with the intended core-first and variant probes", () => {
    const packs = ["events"] as const;
    expect(createRegistry({ packs, includeDrafts: true }).ids.includes("Sessions")).toBe(true);
    expect(createRegistry({ packs }).ids.includes("Sessions")).toBe(packReady("events"));
    expect(meta).toMatchObject({ status: "ready", tier: "phone", weight: 3, dense: true });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Sessions" }));
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "Sessions",
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes.filter(({ kind }) => kind === "read")).toHaveLength(3);
  });
  it("uses cast titles and neutral room and track labels", () => {
    const empty = { things: [], items: [] };
    const cast = {
      things: [{ type: "record", fields: ["label"] }],
      items: [{ id: "one", type: "record", label: "  Meet the artists  ", sample: true }],
    };
    const malformed = { ...cast, items: [{ ...cast.items[0]!, label: 9 }] };
    for (const input of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: input })).success).toBe(true);
    expect(fallback({ cast }).sessions[0]).toMatchObject({ title: "Meet the artists" });
    expect(fallback({ cast: empty }).sessions[0]).toMatchObject({
      title: placeholderTitle(0),
      track: placeholderTitle(0),
      room: placeholderTitle(1),
    });
  });
});

describe("Sessions schema bounds", () => {
  // prettier-ignore
  it.each([
    { tracks: [] }, { tracks: Array(7).fill("A") }, { tracks: ["Main stage", " Main stage "] },
    { tracks: ["x".repeat(17)] }, { sessions: [] }, { sessions: Array(25).fill(first) },
    { sessions: [first, { ...first, id: ` ${first.id} ` }] }, { selectedTrack: "Unknown" },
    { style: "all" }, { color: "red" }, { activeTrack: "all" },
  ])("rejects invalid collections %o", (fields) => expect(props.safeParse({ ...example, ...fields }).success).toBe(false));
  // prettier-ignore
  it.each([
    { id: "x".repeat(25) }, { title: "x".repeat(33) }, { room: "x".repeat(21) }, { speaker: "x".repeat(25) },
    { track: "Unknown" }, { start: "09:5" }, { end: "09:00" }, { end: "24:00" }, { goto: "not a route" },
    { booked: -1 }, { booked: 1.5 }, { booked: 6, capacity: 5 }, { capacity: Infinity },
    { saved: "yes" }, { conflict: true }, { remaining: 5 },
  ])("rejects invalid rows %o", (fields) =>
    expect(props.safeParse({ ...example, sessions: [{ ...first, ...fields }] }).success).toBe(false));
  it("accepts 24 unique sessions and six tracks with maximal text lengths", () => {
    const tracks = Array.from({ length: 6 }, (_, n) => `${n}${"x".repeat(15)}`);
    const sessions = Array.from({ length: 24 }, (_, n) => ({
      ...first,
      id: `${"x".repeat(22)}${String(n).padStart(2, "0")}`,
      title: "x".repeat(32),
      room: "x".repeat(20),
      speaker: "x".repeat(24),
      track: tracks[n % tracks.length]!,
    }));
    expect(props.safeParse({ tracks, sessions }).success).toBe(true);
  });
});

describe("Sessions read and act", () => {
  it("filters by track and clears the filter without renumbering the linked row", () => {
    const source = screen({ ...example, selectedTrack: "Workshops" });
    const initial = readScreen(source, defs);
    expect(initial).toContain('[s1/track select = "Workshops"');
    expect(initial).toContain("[s1/r2/save toggle:on]");
    expect(initial).not.toContain("Opening keynote");
    expect(planAct(source, defs, {}, [save("r1")])).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(source, defs, {}, [open("r1")])).toMatchObject({ ok: false, code: "not_actionable" });
    expect(planAct(source, defs, {}, [filter("Unknown")], null)).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    const cleared = planAct(source, defs, {}, [filter("All tracks")], null);
    if (!cleared.ok) throw new Error(JSON.stringify(cleared));
    expect(readScreen(source, defs, cleared.values)).toContain("[s1/r1 press→keynote]");
    expect(readScreen(source, defs, cleared.values)).not.toMatch(/\[s1\/r[23] press/);
  });

  it("does not offer a track action in a personal agenda or any actions while loading", () => {
    const reading = readScreen(screen(agenda), defs);
    expect(reading).not.toContain("[s1/track select");
    expect(reading).toContain("Time conflict");
    expect(reading).not.toContain("Meet the crew");
    expect(readScreen(screen(example, "loading"), defs)).not.toContain("[s1/");
  });

  it("keeps wire props intact across repeated bookmarks and does not navigate until the linked row is pressed", () => {
    const source = screen();
    const links: string[] = [];
    const controller = createScreenController({
      screen: source,
      defs,
      onLink: (goto) => links.push(goto),
    });
    try {
      for (const on of [true, false, true]) {
        expect(controller.act(save("r1"))).toMatchObject({ ok: true });
        expect(controller.read()).toContain(`[s1/r1/save toggle:${on ? "on" : "off"}]`);
        expect(controller.snapshotScreen()).toEqual(source);
      }
      expect(links).toEqual([]);
      expect(controller.act(open("r2"))).toMatchObject({ ok: false, code: "not_actionable" });
      expect(controller.act(open("r1"))).toMatchObject({ ok: true });
      expect(links).toEqual(["keynote"]);
    } finally {
      controller.dispose();
    }
  });

  it("recomputes agenda conflicts and visibility after removing either saved row", () => {
    const source = screen(agenda);
    for (const [removed, retained] of [
      ["r1", "r2"],
      ["r2", "r1"],
    ] as const) {
      const controller = createScreenController({ screen: source, defs });
      try {
        expect(controller.read().match(/Time conflict/g)).toHaveLength(2);
        expect(controller.act(save(removed))).toMatchObject({ ok: true });
        const reading = controller.read();
        expect(reading).not.toContain("Time conflict");
        expect(reading).not.toContain(`[s1/${removed}/save`);
        expect(reading).toContain(`[s1/${retained}/save toggle:on]`);
        expect(controller.act(save(removed))).toMatchObject({ ok: false, code: "not_actionable" });
        expect(controller.act(save(retained))).toMatchObject({ ok: true });
        expect(controller.read()).toContain("No bookmarked sessions yet");
        expect(controller.snapshotScreen()).toEqual(source);
      } finally {
        controller.dispose();
      }
    }
  });
});

describe("Sessions rendering", () => {
  it("renders chronological rows at their stable addresses, with actions separate from links", () => {
    const html = render({ ...example, sessions: [...example.sessions].reverse() });
    const parts = addressedElements(html);
    const row = (address: string) => parts.get(`home/s1/${address}`);
    expect(html.indexOf("Opening keynote")).toBeLessThan(html.indexOf("Design by hand"));
    expect(html.indexOf("Design by hand")).toBeLessThan(html.indexOf("Ask the makers"));
    expect(row("track")?.attributes).toContain('role="radiogroup"');
    expect(row("r3/root")?.attributes).toContain('role="link"');
    expect(row("r3/save")?.attributes).toContain('aria-label="Bookmark Opening keynote"');
    expect(hasButton(row("r3/root"))).toBe(false);
    expect(row("r3/time")?.text).toEqual(["09:00–09:45"]);
    expect(partText(row("r2/capacity"))).toEqual(["4 left"]);
    expect(partText(row("r1/capacity"))).toEqual(["Full"]);
  });

  it("matches the filtered brief presentation and read without leaking the speaker", () => {
    const input = { ...example, selectedTrack: "Workshops", detail: "brief" } as const;
    const html = render(input, "filled", "ar-u-nu-arab");
    const read = readScreen(screen(input), defs, {}, "ar-u-nu-arab");
    for (const output of [html, read]) {
      expect(output).toContain("Design by hand");
      expect(output).toContain("٤ left");
      expect(output).not.toContain("Opening keynote");
      expect(output).not.toContain("Imani Cole");
    }
    expect(addressedElements(html).has("home/s1/r2/title")).toBe(true);
    expect(addressedElements(html).has("home/s1/r2/speaker")).toBe(false);
  });

  it("shows an actionable track filter in an empty schedule, inert loading and retained success", () => {
    const input = { ...example, tracks: [...example.tracks, "Demos"], selectedTrack: "Demos" };
    expect(partText(addressedElements(render(input)).get("home/s1/empty"))).toEqual([
      "No sessions in this view",
    ]);
    const empty = addressedElements(render(example, "empty"));
    expect(empty.has("home/s1/empty")).toBe(true);
    expect(empty.has("home/s1/r1/save")).toBe(false);
    expect(empty.has("home/s1/track")).toBe(true);
    expect(planAct(screen(example, "empty"), defs, {}, [filter("Workshops")]).ok).toBe(true);
    const loading = render(example, "loading");
    expect(loading).toContain('role="progressbar"');
    expect(loading).not.toMatch(/role="(?:button|radio|link)"/);
    const success = addressedElements(render(agenda, "success"));
    expect(success.get("home/s1/feedback")?.text).toEqual(["Agenda updated"]);
    expect(success.get("home/s1/r2/conflict")?.text).toEqual(["Time conflict"]);
    expect(success.has("home/s1/r2/save")).toBe(true);
    expect(success.has("home/s1/r3/root")).toBe(false);
    expect(success.has("home/s1/track")).toBe(false);
  });
});
