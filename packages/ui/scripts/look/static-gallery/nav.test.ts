import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  galleryControls,
  gallerySections,
  groups,
  navigation,
  overview,
  sectionCounts,
} from "./nav";
import type { GalleryEntry } from "./entries";

const entry: GalleryEntry = {
  id: "Example",
  group: "content",
  tier: "phone",
  purpose: "Preview",
  status: "ready",
  pack: null,
};

describe("static gallery navigation", () => {
  it("lists the seven core groups followed by unique packs in catalog order", () => {
    const sections = gallerySections([entry, { ...entry, id: "Draft", pack: "booking", status: "draft" }]);
    expect(sections.map((s) => s.id)).toEqual([...groups, "booking"]);
    expect(sections[1]?.entries).toEqual([entry]);
    expect(sections.at(-1)?.scope).toBe("packs");
  });
  it("counts ready and draft components independently", () => {
    expect(sectionCounts([entry, { ...entry, status: "draft" }])).toBe("2 components · 1 ready · 1 draft");
    expect(sectionCounts([])).toBe("0 components · 0 ready · 0 draft");
  });
  it("escapes catalog metadata in both sets of anchor links", () => {
    const sections = [{ id: "a&b", name: '<Pack "name">', scope: "packs", entries: [entry] }];
    for (const markup of [navigation(sections), overview(sections)]) {
      expect(markup).toContain('href="#s-a&amp;b"');
      expect(markup).toContain("&lt;Pack &quot;name&quot;&gt;");
    }
    expect(escapeHtml('&<>"')).toBe("&amp;&lt;&gt;&quot;");
  });
  it("labels the three independent filter and view control groups", () => {
    const controls = galleryControls();
    expect(controls).toContain('aria-label="Catalog scope"');
    expect(controls).toContain('aria-label="Component status"');
    expect(controls).toContain('aria-label="Gallery view"');
    expect(controls.match(/aria-pressed="true"/g)).toHaveLength(3);
  });
});
