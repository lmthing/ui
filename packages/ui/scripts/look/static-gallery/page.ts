// The static gallery page: one card per component (title, group, tier, purpose, first preview) and a
// "Show all variants" toggle with the full calm grid. Grouped by core group, then by pack.
import type { GalleryEntry } from "./entries";
import { pageStyle } from "./page-style";

const groups = ["structure", "content", "data", "input", "action", "beyond", "escape"];
const tiers: Record<string, string> = {
  phone: "phone",
  ok: "needs your OK",
  people: "needs other people",
  service: "needs an outside service",
};
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function card(e: GalleryEntry, v: Record<string, string>): string {
  const status = e.status === "draft" ? `<span class="chip draft">draft</span>` : "";
  const search = esc(`${e.id} ${e.purpose} ${e.group} ${e.pack ?? "core"}`.toLowerCase());
  return `<article data-search="${search}" id="c-${e.id}">
<div class="name"><strong>${esc(e.id)}</strong><span class="chip">${esc(e.group)} · ${esc(tiers[e.tier] ?? e.tier)}</span>${status}</div>
<p class="purpose">${esc(e.purpose)}</p>
<div class="thumb"><img src="shots/${e.id}.card.jpg?v=${v[`${e.id}.card`] ?? "0"}" alt="${esc(e.id)}, first example in the calm preset, light mode" loading="lazy"></div>
<details><summary>Show all variants</summary><div class="variants"><img src="shots/${e.id}.grid.jpg?v=${v[`${e.id}.grid`] ?? "0"}" alt="Every example and state of ${esc(e.id)} in the calm preset, light and dark" loading="lazy"></div></details>
</article>`;
}

function coreSection(entries: GalleryEntry[], v: Record<string, string>): string {
  const blocks = groups
    .map((g) => [g, entries.filter((e) => e.group === g)] as const)
    .filter(([, list]) => list.length)
    .map(
      ([g, list]) =>
        `<h3 class="group">${g}</h3><div class="grid">${list.map((e) => card(e, v)).join("")}</div>`,
    );
  return `<section data-section><h2>Core</h2><p class="pick">Every app can use these.</p>${blocks.join("")}</section>`;
}

function packSection(pack: string, entries: GalleryEntry[], v: Record<string, string>): string {
  return `<section data-section><h2>${esc(pack)} pack</h2><div class="grid">${entries.map((e) => card(e, v)).join("")}</div></section>`;
}

const script = `
const q=document.getElementById("filter"),count=document.getElementById("count");
function apply(){const t=q.value.trim().toLowerCase();let n=0;
document.querySelectorAll("article").forEach(a=>{const hit=!t||a.dataset.search.includes(t);a.hidden=!hit;if(hit)n++});
document.querySelectorAll("[data-section]").forEach(s=>{s.hidden=!s.querySelector("article:not([hidden])")});
count.textContent=n+" components";document.getElementById("none").hidden=n>0}
q.addEventListener("input",apply);
const all=o=>document.querySelectorAll("details").forEach(d=>{d.open=o});
document.getElementById("expand").onclick=()=>all(true);
document.getElementById("collapse").onclick=()=>all(false);
document.addEventListener("toggle",e=>{const a=e.target.closest&&e.target.closest("article");if(a)a.toggleAttribute("open-all",e.target.open)},true);
apply();`;

/** The whole page. `versions` maps `<Id>.card` / `<Id>.grid` to a content hash, so updated images reload. */
export function renderPage(entries: GalleryEntry[], versions: Record<string, string>, built: string): string {
  const core = entries.filter((e) => !e.pack);
  const packs = [...new Set(entries.flatMap((e) => (e.pack ? [e.pack] : [])))];
  const sections = [
    coreSection(core, versions),
    ...packs.map((p) =>
      packSection(
        p,
        entries.filter((e) => e.pack === p),
        versions,
      ),
    ),
  ];
  return `<title>lmthing UI Gallery</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Source+Sans+3:wght@400;600&display=swap">
<style>${pageStyle()}</style>
<header><div class="wrap"><h1>lmthing UI Gallery</h1><span class="count" id="count">${entries.length} components</span>
<div class="tools"><input id="filter" type="search" placeholder="Filter by name or purpose" aria-label="Filter components">
<button id="expand" type="button">Expand all</button><button id="collapse" type="button">Collapse all</button></div></div></header>
<main class="wrap">${sections.join("")}<p class="empty" id="none" hidden>No component matches that filter.</p>
<p class="empty">Rendered from the catalog on ${esc(built)}. Each card shows the first example in the calm preset; open it for every example and state, light and dark.</p></main>
<script>${script}</script>`;
}
