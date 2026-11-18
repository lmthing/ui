import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  migrateLine,
  migrateScreen,
  migrateJSONL,
  readScreen,
  type ScreenLike,
} from "@lmthing/ui/catalog";
const old = {
  id: "d1",
  c: "DayTimeline",
  state: "filled" as const,
  blocks: [
    { start: "11:00", end: "12:30", title: "Repot basil", tone: "warn" },
    { start: "09:00", end: "10:00", title: "Water the fern", goto: "fern" },
  ],
};
describe("DayTimeline migration", () => {
  it("preserves ids, state, periods, tones and links", () => {
    const result = migrateLine(old);
    expect(result).toMatchObject({ id: "d1", c: "Timeline", style: "hours", state: "filled" });
    const { id: _id, c: _c, state: _state, ...raw } = result;
    const parsed = components.Timeline.props.parse(raw);
    expect(parsed.items[0]).toMatchObject({ time: "09:00", end: "10:00", goto: "fern" });
  });
  it("migrates a screen and JSON Lines without changing the input", () => {
    const screen: ScreenLike = { id: "day", components: [old] };
    const before = structuredClone(screen);
    const migrated = migrateScreen(screen);
    expect(screen).toEqual(before);
    const { id: _id, c: _c, state: _state, ...props } = migrated.components[0]!;
    expect(components.Timeline.props.parse(props).items.map((item) => item.time)).toEqual(["09:00", "11:00"]);
    expect(readScreen(migrated, components)).toContain("[d1/r1 press→fern]");
    expect(JSON.parse(migrateJSONL(JSON.stringify(old)))).toMatchObject({ c: "Timeline", style: "hours" });
    expect(JSON.parse(migrateJSONL(JSON.stringify(screen)))).toEqual(migrated);
  });
  it("keeps ordinary lines and supports retired aliases", () => {
    const line = { c: "Note", text: "Hello" };
    expect(migrateLine(line)).toBe(line);
    const registry = createRegistry();
    expect(registry.ids).not.toContain("DayTimeline");
    for (const name of ["DayTimeline", "day_timeline", "daily", "chronology"])
      expect(registry.resolve(name)).toBe("Timeline");
  });
});
