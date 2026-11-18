import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  checkScreen,
  sortByRegion,
  gapBetween,
  space,
  limitAt,
  type ScreenLike,
} from "@lmthing/ui/catalog";
const entry = (
  c: keyof typeof components,
  id: string,
  props: Record<string, unknown> = {},
): ScreenLike["components"][number] => ({ id, c, ...(components[c].examples[0] as object), ...props });
const base = () => ({
  id: "home",
  components: [entry("Header", "h1"), entry("List", "l1"), entry("Button", "b1")],
});
const codes = (screen: ScreenLike) => checkScreen(screen, createRegistry()).map((issue) => issue.code);
describe("screen rules", () => {
  it("accepts a valid screen and never repairs its input", () => {
    const screen = base(),
      before = structuredClone(screen);
    expect(checkScreen(screen, components)).toEqual([]);
    expect(screen).toEqual(before);
  });
  it("reports schema and duplicate-id errors", () => {
    const screen = base();
    screen.components.push(entry("List", "l1", { rows: [] }));
    expect(codes(screen)).toContain("S.duplicate_id");
    expect(codes(screen)).toContain("S.props");
  });
  it("reports unknown components and undeclared states", () => {
    const screen = base();
    screen.components[1] = { id: "x1", c: "Missing" };
    expect(codes(screen)).toContain("S.unknown_component");
    screen.components[1] = entry("Field", "f1", { state: "loading" });
    expect(codes(screen)).toContain("S.state");
  });
  it("checks count, weight and heavy-component budgets", () => {
    expect(codes({ id: "short", components: [entry("Header", "h1")] })).toContain("S.component_count");
    const screen = {
      id: "heavy",
      components: [
        entry("Header", "h1"),
        entry("Hero", "h2"),
        entry("Calendar", "c1"),
        entry("Camera", "c2"),
        entry("List", "l1"),
        entry("Stats", "s1"),
        entry("Button", "b1"),
      ],
    };
    expect(codes(screen)).toContain("S.weight_over");
    expect(codes(screen)).toContain("S.heavy_over");
  });
  it("uses Timeline's hours weight", () => {
    const screen = {
      id: "hours",
      components: [
        entry("Header", "h1"),
        entry("Hero", "h2"),
        entry("Calendar", "c1"),
        entry("Timeline", "t1", components.Timeline.examples[2] as Record<string, unknown>),
        entry("Button", "b1"),
      ],
    };
    expect(codes(screen)).toContain("S.heavy_over");
  });
  it("checks primary, hero, neighbour and section rules", () => {
    const screen = base();
    screen.components.push(entry("Button", "b2"));
    expect(codes(screen)).toContain("S.two_primaries");
    expect(
      codes({ id: "hero", components: [entry("Header", "h1"), entry("Note", "n1"), entry("Hero", "h2")] }),
    ).toContain("S.hero_first");
    expect(
      codes({
        id: "section",
        components: [entry("Header", "h1"), entry("SectionTitle", "s1"), entry("Button", "b1")],
      }),
    ).toContain("S.empty_section");
    expect(
      codes({ id: "repeat", components: [entry("Header", "h1"), entry("Note", "n1"), entry("Note", "n2")] }),
    ).toContain("S.adjacent");
  });
  it("requires a sheet trigger and exactly one target", () => {
    const screen = base();
    screen.components.push(entry("Sheet", "s1"));
    expect(codes(screen)).toContain("S.sheet_without_trigger");
    screen.components[2] = entry("Button", "b1", { goto: "sheet" });
    expect(codes(screen)).not.toContain("S.sheet_without_trigger");
    screen.components.push(entry("Sheet", "s2"));
    expect(codes(screen)).toContain("S.sheet_over");
    expect(codes(screen)).toContain("S.sheet_target");
  });
  it("allows a flow to open a sheet without a link", () => {
    const screen = base();
    screen.components.push(entry("Sheet", "s1"));
    expect(
      checkScreen(screen, components, { flowOpensSheet: true }).some(
        (issue) => issue.code === "S.sheet_without_trigger",
      ),
    ).toBe(false);
  });
  it("limits singletons, reply ordering, headlines and danger confirmation", () => {
    const screen = base();
    screen.components.push(entry("Choice", "c1"), entry("Choice", "c2"));
    expect(codes(screen)).toContain("S.choice_over");
    expect(
      codes({
        id: "chat",
        components: [entry("Header", "h1"), entry("Composer", "c1", { style: "reply" }), entry("Note", "n1")],
      }),
    ).toContain("S.reply_order");
    expect(
      codes({
        id: "money",
        components: [entry("Header", "h1"), entry("Hero", "h2", { style: "number" }), entry("Amount", "a1")],
      }),
    ).toContain("S.headline_values");
    screen.components[2] = entry("Button", "b1", { kind: "danger" });
    expect(codes(screen)).toContain("S.danger_confirm");
  });
  it("rejects unfinished copy without banning ordinary example sentences", () => {
    const screen = base();
    screen.components[1] = entry("Note", "n1", { text: "Lorem ipsum" });
    expect(codes(screen)).toContain("S.placeholder");
    screen.components[1] = entry("Note", "n1", { text: "For example, check the soil first." });
    expect(codes(screen)).not.toContain("S.placeholder");
  });
  it("sorts regions stably and puts tabs after the action", () => {
    const rows = [
      entry("TabBar", "t1"),
      entry("List", "l1"),
      entry("Button", "b1"),
      entry("Header", "h1"),
      entry("Note", "n1"),
    ];
    expect(sortByRegion(rows, components).map((row) => row.id)).toEqual(["h1", "l1", "n1", "b1", "t1"]);
    expect(rows[0]!.id).toBe("t1");
  });
  it("shares rhythm tokens and schema-derived limits", () => {
    expect(gapBetween(components.SectionTitle.meta, components.List.meta)).toBe(space.sm);
    expect(gapBetween(components.Hero.meta, components.List.meta)).toBe(space.xl);
    expect(gapBetween(components.Card.meta, components.List.meta)).toBe(space.lg);
    expect(limitAt(components.Bubbles, ["messages", "*", "text"])).toBe(120);
    expect(limitAt(components.Bubbles, ["messages"], "maxItems")).toBe(6);
  });
});
