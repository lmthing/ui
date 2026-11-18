// One inline, library-free page. Core groups and packs share the same section navigation.
import type { GalleryEntry } from "./entries";
import {
  escapeHtml as esc,
  galleryControls,
  gallerySections,
  navigation,
  overview,
  sectionCounts,
  type GallerySection,
} from "./nav";
import { pageStyle } from "./page-style";
import { pageScript } from "./page-script";

const tiers: Record<string, string> = {
  phone: "phone",
  ok: "needs your OK",
  people: "needs other people",
  service: "needs an outside service",
};

function card(e: GalleryEntry, v: Record<string, string>): string {
  const status = e.status === "draft" ? "draft" : "ready";
  const search = esc(`${e.id} ${e.purpose} ${e.group} ${e.pack ?? "core"}`.toLowerCase());
  return `<article data-search="${search}" data-status="${status}" data-scope="${e.pack ? "packs" : "core"}" id="c-${esc(e.id)}">
<div class="name"><strong><a href="#c-${esc(e.id)}">${esc(e.id)}</a></strong><span class="chip metadata">${esc(e.group)} · ${esc(tiers[e.tier] ?? e.tier)}</span><span class="chip ${status}">${status}</span></div>
<button class="compact-toggle" type="button" aria-expanded="false" aria-controls="body-${esc(e.id)}">Expand ${esc(e.id)}</button>
<p class="purpose">${esc(e.purpose)}</p>
<div class="thumb"><img src="shots/${esc(e.id)}.card.jpg?v=${esc(v[`${e.id}.card`] ?? "0")}" alt="${esc(e.id)}, first example in the calm preset, light mode" loading="lazy"></div>
<div class="card-body" id="body-${esc(e.id)}">
<details><summary>Show all variants</summary><div class="variants"><img src="shots/${esc(e.id)}.grid.jpg?v=${esc(v[`${e.id}.grid`] ?? "0")}" alt="Every example and state of ${esc(e.id)} in the calm preset, light and dark" loading="lazy"></div></details></div>
</article>`;
}

function section(s: GallerySection, versions: Record<string, string>): string {
  return `<section data-section="${esc(s.id)}" id="s-${esc(s.id)}" aria-labelledby="heading-${esc(s.id)}">
<h2 id="heading-${esc(s.id)}"><button class="section-toggle" type="button" aria-expanded="true" aria-controls="grid-${esc(s.id)}"><span class="disclosure" aria-hidden="true">▾</span><span>${esc(s.name)}</span><span class="count" data-section-count>${sectionCounts(s.entries)}</span></button></h2>
<div class="grid" id="grid-${esc(s.id)}">${s.entries.map((e) => card(e, versions)).join("")}</div></section>`;
}

/** Content hashes let updated images reload without invalidating unchanged previews. */
export function renderPage(entries: GalleryEntry[], versions: Record<string, string>, built: string): string {
  const sections = gallerySections(entries);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>lmthing UI Gallery</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Source+Sans+3:wght@400;600&display=swap">
<style>${pageStyle()}</style></head><body id="top" data-view="cards">
<header><div class="wrap"><div class="heading"><h1>lmthing UI Gallery</h1><span class="count" id="count" role="status" aria-live="polite">${entries.length} components</span></div>
<div class="tools"><input id="filter" type="search" placeholder="Filter by name or purpose" aria-label="Filter components" aria-keyshortcuts="/ Escape"></div>
${galleryControls()}</div></header>
<div class="layout wrap">${navigation(sections)}<main>${overview(sections)}${sections.map((s) => section(s, versions)).join("")}
<p class="empty" id="none" hidden>No component matches that filter.</p>
<p class="empty">Rendered from the catalog on ${esc(built)}. Each card shows the first example in the calm preset; open it for every example and state, light and dark.</p></main></div>
<a class="back-top" href="#top" hidden>Back to top</a><script>${pageScript}</script></body></html>`;
}
