import { accents, presets, themeRoles, type ComponentName, type ThemeChoice } from "@lmthing/ui/catalog";

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

const subjects: Readonly<Record<string, string>> = {
  fern: `<path d="M70 75Q86 44 88 18M85 37Q70 24 62 22M83 44Q98 35 104 26M80 52Q63 42 52 42M77 59Q98 49 108 40M73 67Q54 61 49 54"/>`,
  monstera: `<path d="M80 76V53M80 65C48 53 49 17 79 25C100 13 120 38 100 57L89 56L101 44M80 61L66 47M80 49L89 38"/>`,
  basil: `<path d="M80 74V28M80 45C61 48 49 40 48 28C65 24 77 33 80 45ZM80 53C85 35 102 31 115 38C112 50 97 56 80 53ZM80 62C64 66 53 61 49 51C64 46 76 53 80 62Z"/>`,
  aloe: `<path d="M65 72H96L91 84H70ZM80 72Q66 46 49 40Q59 64 73 72M80 72Q71 37 82 14Q89 48 84 72M88 72Q93 50 113 37Q103 63 92 72"/>`,
  plants: `<path d="M50 54H85L80 76H55ZM67 54V21M67 43Q48 40 48 28Q66 26 67 43M67 49Q91 46 91 32Q73 33 67 49M99 48H119L116 72H102ZM109 48V27M109 42Q120 38 122 30"/>`,
  park_walk: `<path d="M22 64Q45 47 66 67T139 59M72 90Q70 71 96 67M48 51V65M48 21L33 51H63ZM118 54V66M118 26L105 54H131Z"/>`,
  river_walk: `<path d="M0 78Q48 85 71 69T160 60M0 62Q48 67 71 53T160 44M32 43V25M32 22Q47 20 47 34H17Q17 21 32 22"/>`,
  evening_walk: `<path d="M0 68Q37 48 68 67T160 57M61 90Q63 80 83 75M110 19A19 19 0 0 0 132 41A19 19 0 1 1 110 19Z"/>`,
  dog: `<path d="M61 29L46 24L51 53L58 48Q56 70 80 73Q104 70 102 48L109 53L114 24L99 29Q80 21 61 29ZM75 56H85L80 61ZM68 46H69M91 46H92"/>`,
};

function portrait(seed: number): string {
  const face = 16 + (seed % 5);
  const hair = 20 + ((seed >>> 5) % 9);
  return `<path d="M48 85Q51 61 80 61T112 85"/><ellipse cx="80" cy="43" rx="${face}" ry="22"/><path d="M${80 - face} 41Q64 ${hair} 80 34Q90 39 ${80 + face} 42"/>`;
}

function subjectOf(ref: string, seed: number, component?: ComponentName): string {
  const tag = ref.startsWith("lib:") ? ref.slice(4) : "";
  if (
    component === "People" ||
    component === "StaffPicker" ||
    component === "Turns" ||
    component === "TeamPicker" ||
    /^(?:people|person|staff|avatar)(?:_|$)/.test(tag)
  )
    return portrait(seed);
  if (tag === "dogs") return subjects.dog!;
  return Object.hasOwn(subjects, tag)
    ? subjects[tag]!
    : '<rect x="52" y="25" width="56" height="40" rx="6"/><circle cx="70" cy="38" r="4"/><path d="M53 57L67 47L79 55L93 40L107 55"/>';
}

export function resolvePhoto(
  ref: string,
  theme: ThemeChoice = { preset: "calm", accent: "moss", mode: "light" },
  component?: ComponentName,
  cropSafe = false,
): string {
  const preset = presets.find((entry) => entry.id === theme.preset) ?? presets[0];
  const accent = accents.find((entry) => entry.id === theme.accent) ?? accents[0];
  const roles = themeRoles(preset, accent, theme.mode);
  const colors = [roles.accentSoft, roles.goodSoft, roles.warnSoft, roles.badSoft, roles.raised, roles.line];
  const value = hash(ref);
  const start = value % colors.length;
  const end = (start + 1 + (Math.floor(value / colors.length) % (colors.length - 1))) % colors.length;
  const [from, to] = [colors[start], colors[end]];
  // Flashcard's fern cue uses the same motif as the fern book, without changing its Writer example.
  const motif = coverMotifs[component === "Flashcard" && ref === "lib:plants" ? "lib:fern_shelf" : ref];
  if (motif) {
    const cover = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90" color="${roles.accent}"><rect width="120" height="90" fill="${from}"/><rect x="10" y="10" width="100" height="70" rx="4" fill="${to}"/>${motif}</svg>`;
    return `data:image/svg+xml;base64,${btoa(cover)}`;
  }
  const transform = cropSafe ? ' transform="translate(80 45) scale(.78) translate(-80 -45)"' : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><g fill="none" stroke="${roles.muted}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"${transform}>${subjectOf(ref, value, component)}</g></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
