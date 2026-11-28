import { describe, expect, it } from "vitest";
import { components, size, type as typography } from "@lmthing/ui/catalog";
import { elementAt, renderInstance, styleAt, type RenderedElement } from "../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
function descendants(node: RenderedElement): RenderedElement[] {
  return [node, ...node.children.flatMap(descendants)];
}

describe("filled data layout regressions", () => {
  it("lets shelf cells use the screen gutter without a second card inset", () => {
    const html = renderInstance("List", components.List.examples[3], "filled", theme);
    expect(styleAt(html, "home/c1/root")).toMatch(/padding-left:\s*0px/);
    expect(styleAt(html, "home/c1/root")).toMatch(/padding-right:\s*0px/);
    const grid = elementAt(html, "home/c1/root").children[0]!;
    expect(styleAt(html, grid)).toMatch(/width:\s*100%/);
    expect(styleAt(html, grid)).not.toMatch(/padding-(top|bottom):/);
  });
  it("uses muted rank markers while the selected row stays accented", () => {
    const html = renderInstance("List", components.List.examples[5], "filled", theme);
    for (const item of ["r1", "r2", "r3"]) {
      const rank = descendants(elementAt(html, `home/c1/${item}/root`)).find((node) => node.tag === "span")!;
      expect(styleAt(html, rank)).toContain("--muted");
    }
    expect(styleAt(html, "home/c1/r3/title")).toContain("--accent");
  });
  it("keeps Card's read-only status between the title and its supporting detail", () => {
    const html = renderInstance("Card", components.Card.examples[4], "filled", theme);
    const parts = ["title", "badge", "body"].map((part) => html.indexOf(`data-testid="home/c1/${part}"`));
    expect(parts[0]).toBeGreaterThan(0);
    expect(parts[1]).toBeGreaterThan(parts[0]!);
    expect(parts[2]).toBeGreaterThan(parts[1]!);
    const badge = elementAt(html, "home/c1/badge");
    expect(html).toContain(">Due today</span>");
    expect(badge.attributes).not.toContain('role="button"');
    expect(descendants(badge).some((node) => styleAt(html, node).includes("--accent"))).toBe(true);
  });
});

describe("data hierarchy and avatar regressions", () => {
  it("uses neutral icons for empty states, while success remains semantic", () => {
    const empty = renderInstance("List", components.List.examples[0], "empty", theme);
    expect(
      descendants(elementAt(empty, "home/c1/icon"))
        .map((node) => node.attributes)
        .join(""),
    ).toContain('stroke="var(--muted)"');
    const success = renderInstance("Success", components.Success.examples[0], "filled", theme);
    expect(
      descendants(elementAt(success, "home/c1/icon"))
        .map((node) => node.attributes)
        .join(""),
    ).toContain('stroke="var(--good)"');
  });
  it("strengthens bold weekdays but keeps clock times secondary", () => {
    const bold = { ...theme, preset: "bold" } as const;
    const history = renderInstance("Timeline", components.Timeline.examples[0], "filled", bold);
    const day = renderInstance("Timeline", components.Timeline.examples[1], "filled", bold);
    expect(styleAt(history, "home/c1/r1/time")).toContain("--text");
    expect(styleAt(history, "home/c1/r1/time")).toContain(`font-size:${typography.body.size}px`);
    expect(styleAt(day, "home/c1/r1/time")).toContain("--muted");
  });
  it("limits share typography to heading, body, and label sizes", () => {
    const html = renderInstance("Bars", components.Bars.examples[2], "filled", theme);
    const sizes = descendants(elementAt(html, "home/c1/root"))
      .filter((node) => node.tag === "span")
      .map((node) => styleAt(html, node).match(/font-size:\s*(\d+)px/)?.[1])
      .filter(Boolean);
    expect(new Set(sizes).size).toBeLessThanOrEqual(3);
  });
  it("addresses placeholder avatars at the same size as resolved stack photos", () => {
    const html = renderInstance("People", components.People.examples[2], "filled", theme);
    for (const item of ["r1", "r2", "r3"]) {
      const avatar = styleAt(html, `home/c1/${item}/photo`);
      expect(avatar).toContain(`width:${size.avatar.md}px`);
      expect(avatar).toContain(`height:${size.avatar.md}px`);
    }
    expect(html.match(/data-testid="home\/c1\/r2\/photo"/g)).toHaveLength(1);
    expect(styleAt(html, "home/c1/r2/photo")).toContain("--raised");
  });
});
