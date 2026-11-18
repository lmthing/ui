// Theme roles and layout tokens for the library-free static gallery.
import { calm, moss, themeRoles } from "../../../src/catalog/themes";

type Roles = ReturnType<typeof themeRoles>;
const pick = (r: Roles) =>
  `--bg:${r.bg};--surface:${r.surface};--raised:${r.raised};--line:${r.line};--text:${r.text};` +
  `--muted:${r.muted};--accent:${r.accent};--accent-soft:${r.accentSoft};--warn:${r.warn};--warn-soft:${r.warnSoft};`;

const layout = `
*{box-sizing:border-box}html{scroll-padding-top:calc(var(--sticky-height) + var(--gap))}
body{margin:0;background:var(--bg);color:var(--text);font:1rem/1.45 var(--body)}
[hidden]{display:none!important}a{color:inherit;text-decoration:none}button,input,summary{font:inherit}
.wrap{max-width:90rem;margin:0 auto;padding-inline:max(var(--gutter),env(safe-area-inset-left,0px)) max(var(--gutter),env(safe-area-inset-right,0px))}
header{position:sticky;top:0;z-index:var(--header-layer);background:var(--surface);border-bottom:var(--stroke) solid var(--line)}
header .wrap{display:flex;flex-wrap:wrap;gap:var(--gap);align-items:center;padding-block:var(--gap)}
.heading{display:flex;flex-wrap:wrap;gap:var(--gap);align-items:baseline}
h1{font:600 1.375rem/1.2 var(--display);margin:0}h2{font:600 1.25rem/1.25 var(--display);margin:0}
.count{color:var(--muted);font-size:.875rem;font-variant-numeric:tabular-nums}
.tools{flex:1;min-width:12rem}.tools input{width:100%;min-width:0;padding:.5rem .75rem;border:var(--stroke) solid var(--line);border-radius:var(--radius);background:var(--bg);color:var(--text)}
.filterbar{display:flex;flex-wrap:wrap;gap:.5rem;width:100%;align-items:center}
button,summary{font:600 .875rem/1.2 var(--body);padding:.625rem .75rem;border-radius:var(--radius);border:var(--stroke) solid var(--line);background:var(--raised);color:var(--text);cursor:pointer}
.choices,.section-tools{display:flex;gap:.25rem}.choices{padding:.125rem;border:var(--stroke) solid var(--line);border-radius:var(--radius)}
.choices button{border-color:transparent;background:transparent;padding:.5rem .625rem}
[aria-pressed="true"],a[aria-current]{background:var(--accent-soft)!important;color:var(--accent)!important}
:is(a,button,summary,input):focus-visible{outline:var(--focus-stroke) solid var(--accent);outline-offset:var(--focus-stroke)}
.layout{padding-bottom:3rem}main{min-width:0}.overview{padding-top:1.5rem}.overview h2{margin-bottom:.75rem}
.overview-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,10rem),1fr));gap:.5rem}
.overview-tile{display:flex;flex-direction:column;gap:.25rem;padding:.75rem;background:var(--surface);border:var(--stroke) solid var(--line);border-radius:var(--radius)}
.overview-tile strong{font-size:.9375rem}.overview-tile span{font-size:.75rem;color:var(--muted);text-wrap:balance}
.section-nav{position:sticky;top:var(--header-height);z-index:var(--nav-layer);display:flex;gap:.5rem;overflow-x:auto;background:var(--surface);border-bottom:var(--stroke) solid var(--line);padding:.5rem 0}
.nav-group{display:contents}.nav-group>strong{align-self:center;font-size:.75rem;color:var(--muted)}
.section-nav a{display:flex;gap:.5rem;justify-content:space-between;align-items:center;white-space:nowrap;padding:.5rem .75rem;border:var(--stroke) solid var(--line);border-radius:var(--radius);font-size:.875rem}
[data-nav-count]{color:var(--muted);font-variant-numeric:tabular-nums}
section{margin-top:2rem;scroll-margin-top:var(--gap)}.section-toggle{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;width:100%;text-align:left;padding:.75rem;margin-bottom:.75rem}
.section-toggle>span:not(.count):not(.disclosure){font:600 1.25rem/1.25 var(--display)}
.section-toggle[aria-expanded="false"] .disclosure{transform:rotate(-90deg)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,18.75rem),1fr));gap:var(--gutter)}
.empty{color:var(--muted);padding:1.5rem 0}.back-top{position:fixed;right:var(--gutter);bottom:var(--gutter);z-index:var(--nav-layer);background:var(--surface);border:var(--stroke) solid var(--line);border-radius:var(--radius);padding:.75rem}
@media(min-width:1000px){.layout{display:grid;grid-template-columns:12rem minmax(0,1fr);gap:1.5rem;align-items:start}
.section-nav{display:block;max-height:calc(100dvh - var(--header-height));overflow-y:auto;border:0;padding-block:1.5rem}
.nav-group{display:flex;flex-direction:column;gap:.25rem;margin-bottom:1rem}.nav-group>strong{align-self:flex-start;padding:.5rem .75rem}.section-nav a{white-space:normal;border-color:transparent}.section-tools{margin-left:auto}}
@media(max-width:599px){.tools{flex-basis:100%}.overview-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.heading{width:100%;justify-content:space-between}}
`;

const cards = `
article{position:relative;display:flex;flex-direction:column;gap:.625rem;min-width:0;background:var(--surface);border:var(--stroke) solid var(--line);border-radius:.875rem;padding:.875rem;scroll-margin-top:var(--gap)}
article[open-all]{grid-column:1/-1}.name{display:flex;flex-wrap:wrap;gap:.375rem;align-items:baseline}.name strong{font-size:1.125rem;overflow-wrap:anywhere}
.name a:hover{text-decoration:underline}.chip{font-size:.75rem;letter-spacing:.03em;color:var(--muted)}
.chip.draft{color:var(--warn);background:var(--warn-soft);border-radius:.375rem;padding:.0625rem .375rem}
.purpose{margin:0;color:var(--muted);font-size:.9375rem}.thumb{background:var(--raised);border-radius:var(--radius);padding:.5rem;display:flex;justify-content:center}
.thumb img{display:block;max-width:100%;height:auto;object-fit:contain;border-radius:.375rem}article[data-status="draft"] .thumb{opacity:.55}
details summary{list-style:none;display:inline-block}details summary::-webkit-details-marker{display:none}details[open] summary{margin-bottom:.625rem}
.variants{overflow-x:auto;border:var(--stroke) solid var(--line);border-radius:var(--radius);background:var(--raised)}.variants img{display:block;max-width:none;width:75rem;height:auto}
.compact-toggle{display:none}body[data-view="compact"] .grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,10rem),1fr));gap:.5rem}
body[data-view="compact"] article:not([data-expanded]){cursor:pointer;gap:.5rem;padding:.75rem}
body[data-view="compact"] article:not([data-expanded]) .name strong{font-size:.9375rem}
body[data-view="compact"] article:not([data-expanded]) :is(.metadata,.purpose,.card-body){display:none}
body[data-view="compact"] .thumb img{max-height:5rem}body[data-view="compact"] .compact-toggle{display:block;font-size:.75rem;padding:.5rem}
body[data-view="compact"] article[data-expanded]{grid-column:1/-1}body[data-view="compact"] article[data-expanded] .thumb img{max-height:none}
body[data-view="compact"] article[data-expanded] .compact-toggle{align-self:flex-start}
@media(max-width:599px){body[data-view="compact"] .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

export function pageStyle(): string {
  return `
:root{${pick(themeRoles(calm, moss, "light"))}--body:"Source Sans 3",system-ui,sans-serif;--display:"Fraunces",Georgia,serif;
--gap:.75rem;--gutter:1rem;--radius:.625rem;--stroke:1px;--focus-stroke:2px;--header-layer:5;--nav-layer:4;--header-height:0px;--sticky-height:0px;color-scheme:light}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){${pick(themeRoles(calm, moss, "dark"))}color-scheme:dark}}
:root[data-theme="dark"]{${pick(themeRoles(calm, moss, "dark"))}color-scheme:dark}
${layout}${cards}`;
}
