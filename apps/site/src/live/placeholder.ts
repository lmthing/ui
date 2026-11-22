import { site } from "../data/site";

type Choice = { preset: string; accent: string; mode: string };

/** Simple line glyphs on a 24-unit grid, one per photo library tag. Illustrative marks, never fake photographs. */
const glyphs: Record<string, string> = {
  people: '<circle cx="12" cy="8.5" r="3.6"/><path d="M4.5 20c0-4.2 3.3-6.6 7.5-6.6s7.5 2.4 7.5 6.6"/>',
  dogs: '<circle cx="6.5" cy="10" r="1.7"/><circle cx="10" cy="6" r="1.7"/><circle cx="14" cy="6" r="1.7"/><circle cx="17.5" cy="10" r="1.7"/><path d="M12 12.2c-3 0-5.2 2.3-5.2 4.8 0 1.9 1.6 2.4 3.2 2.1 1.2-.2 1.2-.6 2-.6s.8.4 2 .6c1.6.3 3.2-.2 3.2-2.1 0-2.5-2.2-4.8-5.2-4.8z"/>',
  plants: '<path d="M5 19c0-8 5.5-13 14-13 0 8.5-4.8 14-12.5 14"/><path d="M5 19l8-8"/>',
  food: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/>',
  places:
    '<path d="M12 21s6-5.4 6-10.2A6 6 0 0 0 6 10.8C6 15.6 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
  objects: '<rect x="5" y="7" width="14" height="12" rx="1.5"/><path d="M9 7V5.5h6V7"/>',
};
const fallback = '<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 16l5-5 4 4 3-3 4 4"/>';

const tagOf = (ref: string) => {
  const tag = ref.replace(/^lib:/, "").toLowerCase();
  return tag in glyphs ? tag : tag.includes("dog") || tag.includes("pet") ? "dogs" : tag;
};

/**
 * A host-supplied placeholder for `lib:<tag>` photo references: a duotone tile in the current theme's tint
 * with the tag's glyph. It is deliberately a drawing, so it can never be mistaken for a real photo.
 */
export function placeholderFor(ref: string, choice: Choice): string {
  const roles = site.themeVars[`${choice.preset}_${choice.accent}_${choice.mode}`] ?? {};
  const [from = "#eee", to = "#ddd", ink = "#333"] = [roles.accentSoft, roles.raised, roles.muted];
  const glyph = glyphs[tagOf(ref)] ?? fallback;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><g transform="translate(24 24) scale(2)" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".6">${glyph}</g></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
