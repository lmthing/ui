import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  archetypes,
  checkArchetypes,
  checkPacks,
  checkScreen,
  components,
  createRegistry,
  packArchetypes,
  packComposeProbes,
  packExamples,
  packOf,
  packReady,
  packs,
  writerFormat,
  type ArchetypeMeta,
} from "@lmthing/ui/catalog";

const ids = ["GuestList", "RSVP", "Seating", "Vendors", "Ticket", "Door", "Registry", "FindDate", "Sessions"];
const cast = { things: [], items: [] };
const draft = createRegistry({ packs: ["events"], includeDrafts: true });
const layouts = {
  plan_event: ["overview"],
  guests: ["list", "seating", "reply"],
  suppliers: ["vendors", "gifts"],
  on_the_day: ["door", "ticket", "sessions", "date"],
};

describe("events pack scaffold", () => {
  it("adds only events to the opted-in core registry and Writer format", () => {
    const core = createRegistry();
    const live = createRegistry({ packs: ["events"] });
    const ready = packReady("events");
    expect(
      Object.keys(packOf)
        .filter((id) => packOf[id as keyof typeof packOf] === "events")
        .sort(),
    ).toEqual([...ids].sort());
    expect(draft.ids.filter((id) => !core.ids.includes(id)).sort()).toEqual([...ids].sort());
    if (!ready) expect(live.ids).toEqual(core.ids);
    expect(
      Object.keys(draft.archetypes)
        .filter((id) => !Object.hasOwn(core.archetypes, id))
        .sort(),
    ).toEqual(Object.keys(layouts).sort());
    const formats = [draft, live, core].map((registry) => JSON.stringify(writerFormat(registry)));
    for (const id of ids) {
      expect(formats[0]).toContain(`"const":"${id}"`);
      expect(formats[1]!.includes(`"const":"${id}"`)).toBe(ready);
      expect(formats[2]).not.toContain(`"const":"${id}"`);
    }
    expect(formats[0]).toContain('"const":"Checklist"');
    expect(formats[0]).not.toContain('"const":"Reservation"');
  });

  it("validates each Vows line and keeps the exported example verbatim", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(packExamples.events).toBe(readFileSync(new URL("../example.jsonl", import.meta.url), "utf8"));
    const lines = packExamples.events
      .trimEnd()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(new Set(lines.map(({ id }) => id)).size).toBe(lines.length);
    for (const { c, id: _id, ...input } of lines)
      expect(draft.schema(c)?.safeParse(input).success, c).toBe(true);
    expect(
      lines
        .filter(({ c }) => ids.includes(c))
        .map(({ c }) => c)
        .sort(),
    ).toEqual([...ids].sort());
  });
});

describe("events archetypes", () => {
  it("completes every recipe from neutral fallbacks and has one compose probe per layout", () => {
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const addresses = [];
    const events: readonly ArchetypeMeta[] = packArchetypes.events;
    for (const archetype of events) {
      expect(Object.keys(archetype.layouts)).toEqual(layouts[archetype.id as keyof typeof layouts]);
      for (const [layout, { recipe }] of Object.entries(archetype.layouts)) {
        addresses.push(`${archetype.id}/${layout}`);
        const screen = draft.defaultLines(archetype.id, layout, cast);
        expect(checkScreen(screen, draft)).toEqual([]);
        expect(screen.components.map(({ c }) => c)).toEqual(recipe.map(({ allow }) => allow[0]));
      }
    }
    expect(addresses.sort()).toEqual(
      Object.entries(layouts)
        .flatMap(([id, layouts]) => layouts.map((layout) => `${id}/${layout}`))
        .sort(),
    );
    expect(packComposeProbes.events.map(({ archetype, layout }) => `${archetype}/${layout}`).sort()).toEqual(
      addresses,
    );
    expect(draft.defaultLines("guests", "reply", cast).components[0]).toMatchObject({
      c: "Hero",
      media: "cover",
    });
    expect(draft.defaultLines("plan_event", "overview", cast).components[1]).toMatchObject({
      c: "Timer",
      style: "until",
    });
    expect(draft.defaultLines("on_the_day", "ticket", cast).components[0]).toMatchObject({
      c: "Header",
      style: "back",
    });
  });
});
