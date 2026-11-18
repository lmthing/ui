// The static gallery's stylesheet. Colours come from the kit's own calm/moss theme roles, light and dark.
import type * as Catalog from "@lmthing/ui/catalog";

const { calm, moss, themeRoles } = (await import(
  new URL("../../../dist/catalog.js", import.meta.url).href
)) as typeof Catalog;

type Roles = ReturnType<typeof Catalog.themeRoles>;
const pick = (r: Roles) =>
  `--bg:${r.bg};--surface:${r.surface};--raised:${r.raised};--line:${r.line};--text:${r.text};` +
  `--muted:${r.muted};--accent:${r.accent};--accent-soft:${r.accentSoft};--warn:${r.warn};--warn-soft:${r.warnSoft};`;

export function pageStyle(): string {
  const light = pick(themeRoles(calm, moss, "light"));
  const dark = pick(themeRoles(calm, moss, "dark"));
  return `
:root{${light}--body:"Source Sans 3",system-ui,sans-serif;--display:"Fraunces",Georgia,serif;}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}color-scheme:dark}}
:root[data-theme="dark"]{${dark}color-scheme:dark}
body{background:var(--bg);color:var(--text);font:16px/1.45 var(--body)}
.wrap{max-width:1200px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:0 48px}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:10;background:var(--surface)}
header{position:sticky;top:env(safe-area-inset-top,0px);z-index:5;background:var(--surface);border-bottom:1px solid var(--line)}
header .wrap{display:flex;flex-wrap:wrap;gap:12px 16px;align-items:center;padding-block:12px}
h1{font:600 22px/1.2 var(--display);margin:0}
.count{color:var(--muted);font-size:14px;font-variant-numeric:tabular-nums}
.tools{display:flex;gap:8px;flex:1 1 320px;min-width:0}
input{flex:1;min-width:0;font:inherit;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text)}
button,summary{font:600 14px/1 var(--body);padding:10px 14px;border-radius:10px;border:1px solid var(--line);background:var(--raised);color:var(--text);cursor:pointer}
button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
section{margin-top:32px}
h2{font:600 20px/1.25 var(--display);margin:0 0 4px;text-wrap:balance}
.pick{color:var(--muted);margin:0 0 12px;max-width:65ch}
h3.group{font:600 13px/1 var(--body);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:20px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:16px}
article{display:flex;flex-direction:column;gap:10px;min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px}
article[open-all]{grid-column:1/-1}
.name{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline}
.name strong{font-size:18px}
.chip{font-size:12px;letter-spacing:.03em;color:var(--muted)}
.chip.draft{color:var(--warn);background:var(--warn-soft);border-radius:6px;padding:1px 6px}
.purpose{margin:0;color:var(--muted);font-size:15px}
.thumb{background:var(--raised);border-radius:10px;padding:8px;display:flex;justify-content:center}
.thumb img{display:block;max-width:100%;height:auto;border-radius:6px}
details summary{list-style:none;display:inline-block}
details summary::-webkit-details-marker{display:none}
details[open] summary{margin-bottom:10px}
.variants{overflow-x:auto;border:1px solid var(--line);border-radius:10px;background:var(--raised)}
.variants img{display:block;max-width:none;width:1200px;height:auto}
.empty{color:var(--muted);padding:24px 0}
@media (prefers-reduced-motion:no-preference){article{transition:border-color .15s}}
`;
}
