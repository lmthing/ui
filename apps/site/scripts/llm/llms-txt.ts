import type { Pack, RecordedData, SiteData } from "../site-types";
import { link, siteUrl } from "./md";

type Data = SiteData & RecordedData;

const entry = (text: string, path: string, note: string) => `- ${link(text, path)}: ${note}`;

const packSection = (pack: Pack): string[] => [
  `## Pack: ${pack.id}`,
  "",
  entry(
    `${pack.id} pack`,
    `p/${pack.id}.md`,
    `${pack.ready ? "live" : pack.items.length ? "in progress" : "planned"}. ${pack.pick}`,
  ),
  ...pack.items.filter((i) => i.state !== "draft").map((i) => entry(i.id, `c/${i.id}.md`, i.purpose)),
  "",
];

/** The llmstxt.org index: links with one-line notes, never content. */
export function llmsTxt(data: Data): string {
  const core = data.items.filter((i) => !i.pack);
  return [
    "# lmthing/ui",
    "",
    `> A typed catalog of ${data.stats.core} core UI components and ${data.packs.length} domain packs that models pick and fill as JSON lines, and a kit that draws them. There is no code, colour or size in a line.`,
    "",
    "How to use this catalog: to build a screen, read writing.md, pick components from the sections below, and write one JSON line per component, validated against the schema in catalog.json. To act on a screen, read reading.md. Every component page lists its props, a JSON Schema, its parts and actions, and examples as wire lines. Everything here is generated from the repository on every build.",
    "",
    "## Start here",
    "",
    entry("Home page as text", "index.md", "what the catalog is and where it stands"),
    entry(
      "Writing screens",
      "writing.md",
      "the wire format, structured output, what a model never sends, checks",
    ),
    entry("Reading and acting", "reading.md", "the text a model reads and the action JSON it answers with"),
    "",
    "## Writing screens",
    "",
    entry("catalog.json", "catalog.json", "the writer JSON Schema for the core components, and one per pack"),
    entry("components.json", "components.json", "every component: id, group, pack, status, purpose"),
    "",
    "## Reading and acting",
    "",
    entry("Reading and acting", "reading.md", "readScreen text, addresses, and real recorded answers"),
    "",
    "## Components (core)",
    "",
    ...core.map((i) => entry(i.id, `c/${i.id}.md`, i.purpose)),
    "",
    ...data.packs.flatMap(packSection),
    "## Themes",
    "",
    entry(
      "Themes and variant axes",
      "themes.md",
      "preset, accent and mode enums, and the shared variant vocabulary",
    ),
    "",
    "## Optional",
    "",
    entry("Everything in one file", "llms-full.txt", "all of the pages above concatenated"),
    `- [Interactive site](${siteUrl}): live playgrounds for every component`,
    `- [Static gallery](${siteUrl}gallery/): a screenshot of every component`,
    `- [Source](https://github.com/${data.repo}): the repository`,
    "",
  ].join("\n");
}

/** Every page concatenated in a stable order, each introduced by its address, for one-shot context. */
export function llmsFull(order: string[], files: Map<string, string>): string {
  return order
    .map((path) => `<!-- ${siteUrl}${path} -->\n\n${files.get(path) ?? ""}`)
    .join("\n\n---\n\n")
    .concat("\n");
}
