import { accents, presets, themeRoles, type ThemeChoice } from "@lmthing/ui/catalog";

// Offline image placeholders use the host theme's soft surfaces, leaving text readable.
function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

// Simple jacket motifs for the four Library fixtures, not generic landscape placeholders.
const coverMotifs: Readonly<Record<string, string>> = {
  "lib:fern_shelf":
    '<path d="M48 72Q66 60 70 18M67 40Q46 41 38 25Q57 26 67 40M64 52Q83 50 90 32Q71 35 64 52M58 62Q39 60 33 44Q49 47 58 62" fill="none" stroke="currentColor" stroke-width="3"/>',
  "lib:window_pots":
    '<rect x="28" y="18" width="64" height="53" rx="3" fill="none" stroke="currentColor" stroke-width="3"/><path d="M60 19v51M28 44h64M44 57h14l-3 13h-8zM64 53h17l-4 17h-9z" fill="currentColor"/>',
  "lib:slow_walk":
    '<path d="M35 77C91 70 26 50 64 44S87 24 80 15" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 10"/><circle cx="80" cy="15" r="5" fill="currentColor"/>',
  "lib:clover_walk":
    '<path d="M44 67q-6-10 7-15q7-9 13 0q13 5 7 15q-4 6-13 2q-10 4-14-2" fill="currentColor"/><g fill="currentColor"><ellipse cx="40" cy="46" rx="5" ry="7"/><ellipse cx="50" cy="35" rx="5" ry="7"/><ellipse cx="64" cy="35" rx="5" ry="7"/><ellipse cx="75" cy="46" rx="5" ry="7"/></g>',
};

export function resolvePhoto(
  ref: string,
  theme: ThemeChoice = { preset: "calm", accent: "moss", mode: "light" },
): string {
  const preset = presets.find((entry) => entry.id === theme.preset) ?? presets[0];
  const accent = accents.find((entry) => entry.id === theme.accent) ?? accents[0];
  const roles = themeRoles(preset, accent, theme.mode);
  const colors = [roles.accentSoft, roles.goodSoft, roles.warnSoft, roles.badSoft, roles.raised, roles.line];
  const value = hash(ref);
  const start = value % colors.length;
  const end = (start + 1 + (Math.floor(value / colors.length) % (colors.length - 1))) % colors.length;
  const [from, to] = [colors[start], colors[end]];
  const motif = coverMotifs[ref];
  if (motif) {
    const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" color="${roles.accent}"><rect width="120" height="90" fill="${from}"/><rect x="10" y="10" width="100" height="70" rx="4" fill="${to}"/>${motif}</svg>`;
    return `data:image/svg+xml;base64,${btoa(cover)}`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><circle cx="118" cy="30" r="14" fill="${roles.surface}" fill-opacity=".35"/><path d="M0 90 L52 46 L86 72 L112 54 L160 90 Z" fill="${roles.text}" fill-opacity=".12"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
