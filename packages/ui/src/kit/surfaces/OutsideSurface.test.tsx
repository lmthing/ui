import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, it } from "vitest";
import { config } from "../../../test/render";
import { OutsideSurface, outsideSurfaceContent, outsideSurfaceKinds, type OutsideSurfaceProps } from ".";

const app = { name: "Example & Co", icon: "leaf" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const content = { title: "Review the note", body: "https://example.invalid/?from=<sample>" };

function render(overrides: Partial<OutsideSurfaceProps> = {}) {
  return renderToStaticMarkup(
    <TamaguiProvider config={config}>
      <OutsideSurface kind="Message" {...{ app, theme, content }} {...overrides} />
    </TamaguiProvider>,
  );
}

describe("outside previews", () => {
  it.each(outsideSurfaceKinds)("renders host identity and plain content for %s", (kind) => {
    const html = render({ kind });
    expect(html).toContain("Example &amp; Co");
    expect(html).toContain("Review the note");
    expect(html).toContain("https://example.invalid/?from=&lt;sample&gt;");
    expect(html).toMatch(/role="region" aria-label="[^"]+ preview"/);
    expect(html).toMatch(/<svg\b/);
    expect(html).not.toMatch(/<a\b|<button\b|<input\b|\s(?:href|tabindex|aria-live|data-testid)=/i);
  });

  it("keeps optional body absent and supports a neutral title on invalid content", () => {
    expect(render({ content: { title: "One fact" } })).not.toContain("example.invalid");
    expect(render({ content: { title: " " } })).toContain("No example content");
  });

  it("does not fabricate host identity or reinterpret an unknown surface", () => {
    expect(render({ app: { ...app, name: " " } })).not.toContain('role="region"');
    expect(render({ kind: "Mail" as OutsideSurfaceProps["kind"] })).not.toContain('role="region"');
  });

  it("accepts only trimmed display text within the content limits", () => {
    expect(outsideSurfaceContent.parse({ title: "  Example  " })).toEqual({ title: "Example" });
    expect(outsideSurfaceContent.safeParse({ title: "x".repeat(120), body: "x".repeat(160) }).success).toBe(
      true,
    );
    for (const invalid of [
      { title: "x".repeat(121) },
      { title: "Example", body: "x".repeat(161) },
      { title: "Example", body: " " },
      { title: "" },
      { title: "Example", href: "https://example.invalid" },
      { title: "Example", recipient: "someone" },
      { title: "Example", scheduledAt: "10:00" },
    ]) {
      expect(outsideSurfaceContent.safeParse(invalid).success).toBe(false);
    }
  });
});
