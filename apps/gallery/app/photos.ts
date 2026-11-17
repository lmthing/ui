// The gallery's photo resolver: a soft gradient per photo tag, so photos look like photos in
// screenshots without a network. A host resolves `lib:` and `local:` references to real images.
const palettes = [
  ["#c9d8b6", "#7fa36b"],
  ["#f2d3b3", "#c98a5b"],
  ["#c7d9ea", "#5f8fb8"],
  ["#e6d1e6", "#9a6fa3"],
  ["#efe2b4", "#c7a64a"],
  ["#d5d0c8", "#8a8278"],
] as const;

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

export function resolvePhoto(ref: string): string {
  const [from, to] = palettes[hash(ref) % palettes.length]!;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="160" height="90" fill="url(#g)"/><circle cx="118" cy="30" r="14" fill="#fff" fill-opacity=".35"/><path d="M0 90 L52 46 L86 72 L112 54 L160 90 Z" fill="#000" fill-opacity=".12"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
