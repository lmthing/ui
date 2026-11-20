// The text views for models (llms.txt, llms-full.txt, a .md per component, pack and page), fetched over HTTP.
import { base, data as siteData, expect } from "./check-lib";

const textType = /^(text\/|application\/json)/;

/** The text views for models: llms.txt exists, every link in it answers 200 as text, every page has its .md. */
export async function checkTexts() {
  const res = await fetch(`${base}llms.txt`);
  expect(
    res.status === 200 && textType.test(res.headers.get("content-type") ?? ""),
    "llms.txt exists as text",
  );
  const text = await res.text();
  const links = [...text.matchAll(/\]\((https:\/\/lmthing\.github\.io\/ui\/[^)]*)\)/g)].map((m) =>
    m[1]!.replace("https://lmthing.github.io/ui/", base),
  );
  const bad: string[] = [];
  for (const url of new Set(links)) {
    const r = await fetch(url);
    if (r.status !== 200 || !textType.test(r.headers.get("content-type") ?? ""))
      bad.push(`${url} ${r.status} ${r.headers.get("content-type")}`);
  }
  expect(
    bad.length === 0,
    `llms.txt: all ${links.length} links answer 200 as text${bad.length ? ` (bad: ${bad.slice(0, 3).join("; ")})` : ""}`,
  );
  const missing: string[] = [];
  const paths = [
    ...siteData.items.map((i) => `c/${i.id}.md`),
    ...siteData.packs.map((p) => `p/${p.id}.md`),
    "writing.md",
    "reading.md",
    "themes.md",
    "index.md",
    "catalog.json",
    "components.json",
  ];
  for (const path of paths) if ((await fetch(`${base}${path}`)).status !== 200) missing.push(path);
  expect(
    missing.length === 0,
    `every component, pack and page has its text file (${paths.length} checked${missing.length ? `, missing ${missing.slice(0, 3)}` : ""})`,
  );
  const full = await (await fetch(`${base}llms-full.txt`)).text();
  expect(full.length < 1_500_000, `llms-full.txt is ${Math.round(full.length / 1024)} KB, under 1.5 MB`);
  const alt = await (await fetch(base)).text();
  expect(
    alt.includes('rel="alternate" type="text/markdown"') && alt.includes("llms.txt"),
    "the home page head links its Markdown and llms.txt",
  );
}
