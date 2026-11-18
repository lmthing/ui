import type { GalleryEntry } from "./entries";

export const groups = ["structure", "content", "data", "input", "action", "beyond", "escape"];
export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export type GallerySection = { id: string; name: string; scope: string; entries: GalleryEntry[] };

export function gallerySections(entries: GalleryEntry[]): GallerySection[] {
  const packs = [...new Set(entries.flatMap((e) => (e.pack ? [e.pack] : [])))];
  return [
    ...groups.map((group) => ({
      id: group,
      name: group,
      scope: "core",
      entries: entries.filter((e) => !e.pack && e.group === group),
    })),
    ...packs.map((pack) => ({
      id: pack,
      name: `${pack} pack`,
      scope: "packs",
      entries: entries.filter((e) => e.pack === pack),
    })),
  ];
}

export function sectionCounts(entries: GalleryEntry[]): string {
  const drafts = entries.filter((e) => e.status === "draft").length;
  return `${entries.length} components · ${entries.length - drafts} ready · ${drafts} draft`;
}

function choices(id: string, label: string, options: string[][]): string {
  return `<div class="choices" id="${id}" role="group" aria-label="${label}">${options
    .map(
      ([value, name], i) =>
        `<button type="button" data-value="${value}" aria-pressed="${i === 0}">${name}</button>`,
    )
    .join("")}</div>`;
}

export function galleryControls(): string {
  return `<div class="filterbar">
${choices("scope", "Catalog scope", [
  ["all", "All"],
  ["core", "Core"],
  ["packs", "Packs"],
])}
${choices("status", "Component status", [
  ["all", "All"],
  ["ready", "Ready"],
  ["draft", "Drafts"],
])}
${choices("view", "Gallery view", [
  ["cards", "Cards"],
  ["compact", "Compact"],
])}
<div class="section-tools"><button id="expand" type="button">Expand all</button><button id="collapse" type="button">Collapse all</button></div>
</div>`;
}

export function navigation(sections: GallerySection[]): string {
  const links = (scope: string) =>
    sections
      .filter((s) => s.scope === scope)
      .map(
        (s) =>
          `<a data-nav="${escapeHtml(s.id)}" href="#s-${escapeHtml(s.id)}"><span>${escapeHtml(s.name)}</span><span data-nav-count>${s.entries.length}</span></a>`,
      )
      .join("");
  return `<nav class="section-nav" aria-label="Catalog sections"><div class="nav-group"><strong>Core</strong>${links("core")}</div><div class="nav-group"><strong>Packs</strong>${links("packs")}</div></nav>`;
}

export function overview(sections: GallerySection[]): string {
  return `<div class="overview" aria-labelledby="overview-title"><h2 id="overview-title">Catalog overview</h2>
<div class="overview-grid">${sections
    .map(
      (s) =>
        `<a class="overview-tile" data-overview="${escapeHtml(s.id)}" href="#s-${escapeHtml(s.id)}"><strong>${escapeHtml(s.name)}</strong><span data-overview-count>${sectionCounts(s.entries)}</span></a>`,
    )
    .join("")}</div></div>`;
}
