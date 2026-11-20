import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RecordedData, SiteData } from "../site-types";
import { llmsTxt } from "./llms-txt";
import { siteUrl } from "./md";

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../src/generated/${name}`, import.meta.url).pathname, "utf8"));
const data = { ...(read("site-data.json") as SiteData), ...(read("recorded.json") as RecordedData) };
const text = llmsTxt(data);
const lines = text.split("\n");

describe("llms.txt", () => {
  it("follows the llmstxt.org shape: an H1, a blockquote summary, then H2 sections", () => {
    expect(lines[0]).toBe("# lmthing/ui");
    expect(lines[2]?.startsWith("> ")).toBe(true);
    expect(lines.filter((l) => l.startsWith("# "))).toHaveLength(1);
  });
  it("has the required sections in order, and one per pack", () => {
    const h2 = lines.filter((l) => l.startsWith("## "));
    expect(h2.slice(0, 5)).toEqual([
      "## Start here",
      "## Writing screens",
      "## Reading and acting",
      "## Components (core)",
      `## Pack: ${data.packs[0]!.id}`,
    ]);
    expect(h2.slice(-2)).toEqual(["## Themes", "## Optional"]);
    expect(h2.filter((l) => l.startsWith("## Pack: "))).toHaveLength(data.packs.length);
  });
  it("lists every core component and links only absolute URLs with a one-line note", () => {
    const core = data.items.filter((i) => !i.pack);
    for (const item of core) expect(text).toContain(`[${item.id}](${siteUrl}c/${item.id}.md): `);
    const entries = lines.filter((l) => l.startsWith("- ["));
    expect(entries.length).toBeGreaterThan(core.length);
    for (const entry of entries) expect(entry).toMatch(/^- \[[^\]]+\]\(https:\/\/[^)]+\): .+/);
  });
  it("is links, not content: it stays small", () => {
    expect(text.length).toBeLessThan(60_000);
  });
});
