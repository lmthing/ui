// The apple-touch icon (180) and the Open Graph image (1200x630), drawn from the same logo data and a real line.
import { launchChrome } from "../../../packages/ui/scripts/look/launch-chrome";
import { markSvg, wordSvg } from "../src/brand/paths";
import type { SiteData } from "./site-types";

const fonts =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,700&family=IBM+Plex+Mono:wght@400;500&display=swap";

function ogHtml(data: SiteData): string {
  const roles = data.themeVars["calm_moss_light"] ?? {};
  const line = data.items.find((i) => i.id === "Header")?.line.replace('"id":"x1"', '"id":"h1"') ?? "";
  const {
    bg = "#f4f5f1",
    text = "#1b221e",
    muted = "#5a665e",
    line: rule = "#d2d9cc",
    accent = "#3e6d30",
  } = roles;
  return `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="${fonts}"><style>
  body{margin:0;width:1200px;height:630px;background:${bg};color:${text};display:grid;grid-template-columns:1fr 430px;font-family:'Bricolage Grotesque',system-ui,sans-serif}
  .l{padding:64px 0 64px 72px;display:flex;flex-direction:column;justify-content:space-between;border-right:1px solid ${rule}}
  h1{font-size:76px;line-height:1;letter-spacing:-.03em;margin:0;max-width:640px;font-weight:700}
  p{font:400 22px/1.5 'IBM Plex Mono',monospace;color:${muted};margin:0}
  .r{padding:64px 48px;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start}
  code{font:400 21px/1.55 'IBM Plex Mono',monospace;word-break:break-word;border-left:3px solid ${accent};padding-left:20px}
  </style><div class="l"><div>${wordSvg(text, accent, 56)}</div><h1>Components a model can't misuse</h1><p>typed catalog · JSON lines · live kit</p></div>
  <div class="r">${markSvg(text, accent, 120)}<code>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</code></div>`;
}

export async function writeBrand(out: string, data: SiteData): Promise<void> {
  const browser = await launchChrome();
  try {
    const roles = data.themeVars["calm_moss_light"] ?? {};
    const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await og.setContent(ogHtml(data), { waitUntil: "networkidle" }).catch(() => undefined);
    await og.evaluate(() =>
      Promise.all([
        document.fonts.load("400 21px 'IBM Plex Mono'"),
        document.fonts.load("700 76px 'Bricolage Grotesque'"),
      ]),
    );
    await og.screenshot({ path: `${out}/og.png` });
    const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
    const ink = roles.text ?? "#1b221e";
    await icon.setContent(
      `<body style="margin:0;background:${roles.bg ?? "#f4f5f1"};display:grid;place-items:center;height:180px">${markSvg(ink, roles.accent ?? "#3e6d30", 120)}</body>`,
    );
    await icon.screenshot({ path: `${out}/apple-touch-icon.png` });
  } finally {
    await browser.close();
  }
}
