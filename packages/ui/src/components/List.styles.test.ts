import { describe, expect, it } from "vitest";
import { affordancesOf, components, migrateLine, readComponent, stampItemIds } from "@lmthing/ui/catalog";
import { renderInstance } from "../../test/render";

const { props, meta } = components.List;

describe("List shelf, expand and ranked", () => {
  const photoRow = (title: string) => ({ title, photo: "lib:plants" });
  it.each([
    { style: "shelf", rows: [photoRow("Fern")] },
    { style: "shelf", rows: [photoRow("Fern"), { title: "Basil" }] },
    { style: "expand", rows: [{ title: "Q", body: "A" }, { title: "Q2" }] },
    {
      lead: "number",
      trail: "value",
      rows: [
        { title: "Anna", me: true },
        { title: "Ben", me: true },
      ],
    },
    { style: "expand", rows: [{ title: "Q", body: "a".repeat(201) }] },
  ])("rejects a style used without what it needs", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("lets a body make the rows expand and a me row make a ranking", () => {
    const { c: _c, ...ranking } = migrateLine({ c: "List", rows: [{ title: "Anna", me: true }] });
    expect(props.parse({ rows: [{ title: "Q", body: "A", goto: "x" }] }).style).toBe("expand");
    expect(props.parse(ranking)).toMatchObject({ lead: "number", trail: "value" });
  });
  it("offers press on linked rows of a shelf and toggle on every row of an expand", () => {
    const shelf = props.parse({
      style: "shelf",
      rows: [{ ...photoRow("Fern"), goto: "fern" }, photoRow("Basil")],
    });
    expect(affordancesOf(meta, stampItemIds(meta, shelf), "l1")).toEqual([
      { address: "l1/r1", part: "root", action: "press", detail: "→fern" },
    ]);
    const expand = props.parse({
      style: "expand",
      rows: [
        { title: "Q1", body: "A1", goto: "ignored" },
        { title: "Q2", body: "A2" },
      ],
    });
    expect(
      affordancesOf(meta, stampItemIds(meta, expand), "l1").map((a) => `${a.address} ${a.action}`),
    ).toEqual(["l1/r1 toggle", "l1/r2 toggle"]);
  });
});

describe("List ranked and expanded rendering", () => {
  it("numbers a ranking, reads it in order and offers nothing without links", () => {
    const input = {
      lead: "number",
      trail: "value",
      rows: [
        { title: "Anna", value: "412" },
        { title: "You", value: "351", me: true },
      ],
    };
    const line = readComponent(components.List, input, "l1").join("\n");
    expect(line.indexOf("Anna")).toBeLessThan(line.indexOf("You"));
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "l1")).toEqual([]);
    const html = renderInstance("List", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).toContain('data-testid="home/c1/r2/root"');
  });
  it("opens rows in place as buttons and carries every body on screen", () => {
    const input = { style: "expand", rows: [{ title: "Q1", body: "Answer one" }] };
    const html = renderInstance("List", input, "filled", { preset: "calm", mode: "light", accent: "moss" });
    expect(html).toContain('role="button"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Answer one");
    expect(html).toContain('data-testid="home/c1/r1/body"');
  });
});
