// The text views of the site for models: llms.txt, llms-full.txt, a Markdown page per component and pack, the
// wire-format pages, and two JSON files. All generated from the catalog, docs and recordings at build time.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { RecordedData, SiteData } from "../site-types";
import { cat } from "./catalog";
import { componentMd } from "./component-md";
import { catalogJson, componentsJson } from "./json-files";
import { llmsFull, llmsTxt } from "./llms-txt";
import { siteUrl } from "./md";
import { indexMd, readingMd, themesMd, writingMd } from "./pages-md";
import { packMd } from "./pack-md";
import { validateExamples } from "./validate";

/** Builds every file as `path -> content`. Throws if an example does not validate. */
export function buildLlmFiles(data: SiteData & RecordedData): Map<string, string> {
  validateExamples(data);
  const files = new Map<string, string>();
  const order = ["index.md", "writing.md", "reading.md", "themes.md"];
  files.set("index.md", indexMd(data));
  files.set("writing.md", writingMd(data));
  files.set("reading.md", readingMd(data));
  files.set("themes.md", themesMd(data));
  for (const item of data.items.filter((i) => !i.pack))
    order.push(add(files, `c/${item.id}.md`, componentMd(item, cat.components[item.id]!)));
  for (const pack of data.packs) {
    order.push(add(files, `p/${pack.id}.md`, packMd(pack)));
    for (const item of pack.items)
      order.push(add(files, `c/${item.id}.md`, componentMd(item, cat.components[item.id]!)));
  }
  files.set("llms.txt", llmsTxt(data));
  files.set("llms-full.txt", llmsFull(order, files));
  files.set("catalog.json", catalogJson(data));
  files.set("components.json", componentsJson(data, siteUrl));
  return files;
}

const add = (files: Map<string, string>, path: string, content: string) => (files.set(path, content), path);

export function writeLlm(out: string, data: SiteData & RecordedData): number {
  const files = buildLlmFiles(data);
  for (const [path, content] of files) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  return files.size;
}
