import { expect, it } from "vitest";
import { renderPage } from "./page";
import type { GalleryEntry } from "./entries";

it("renders an inline, accessible document with stable section/card anchors and versioned previews", () => {
  const entry: GalleryEntry = {
    id: "Sample",
    group: "content",
    tier: "ok",
    purpose: 'A <safe> "preview"',
    status: "draft",
    pack: "booking",
  };
  const html = renderPage([entry], { "Sample.card": "abc", "Sample.grid": "def" }, "today");
  expect(html).toMatch(/^<!doctype html><html lang="en">/);
  expect(html).toContain('name="viewport"');
  expect(html).toContain('id="s-booking"');
  expect(html).toContain('id="c-Sample"');
  expect(html).toContain('data-status="draft" data-scope="packs"');
  expect(html).toContain("Sample.card.jpg?v=abc");
  expect(html).toContain("Sample.grid.jpg?v=def");
  expect(html).toContain("A &lt;safe&gt; &quot;preview&quot;");
  expect(html).toContain("needs your OK");
  expect(html).toContain('aria-controls="grid-booking"');
  expect(html).toContain("<script>");
  expect(html).not.toContain("<script src=");
});

it("keeps the empty catalog intentional and every core group addressable", () => {
  const html = renderPage([], {}, "today");
  expect(html).toContain("0 components");
  expect(html).toContain("No component matches that filter.");
  expect(html.match(/<section data-section=/g)).toHaveLength(7);
});
