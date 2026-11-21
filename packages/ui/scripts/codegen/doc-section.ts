const labels =
  /(?:^|\s+·\s+)(?:-\s+)?(Pick|Writes|Styles|Variants|Parts\s*(?:→|->)\s*actions|States|Real path|Density|Copy):\s*/g;

export const quote = (value: unknown) => JSON.stringify(value);

export function splitTop(source: string, separators: string): string[] {
  const pieces: string[] = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  for (const [index, char] of source.split("").entries()) {
    if (char === "`") quoted = !quoted;
    if (quoted) continue;
    if ("([{".includes(char)) depth++;
    if (")]}".includes(char)) depth--;
    if (depth === 0 && separators.includes(char) && !(char === "." && /\d/.test(source[index + 1] ?? ""))) {
      pieces.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  pieces.push(source.slice(start).trim());
  return pieces.filter(Boolean);
}

function sectionsOf(body: string) {
  const [description, ...bullets] = body.split(/\n-\s+/);
  const sections = new Map<string, string>();
  for (const bullet of bullets) {
    const line = bullet.trim().replace(/\s+/g, " ");
    const matches = [...line.matchAll(labels)];
    matches.forEach((match, i) => {
      const key = match[1]!.startsWith("Parts") ? "Parts" : match[1]!;
      sections.set(key, line.slice(match.index + match[0].length, matches[i + 1]?.index).trim());
    });
  }
  return { description: description!.trim().replace(/\s+/g, " "), sections };
}

export function componentSection(doc: string, name: string) {
  const lines = doc.split(/\r?\n/);
  const marker = `### \`${name}\` · `;
  let found = false;
  for (const [start, line] of lines.entries()) {
    if (!line.startsWith(marker)) continue;
    found = true;
    const [status, ...heading] = line.slice(marker.length).split(" · ");
    if (!/^(?:planned|built)$/.test(status!)) continue;
    const end = lines.findIndex((line, i) => i > start && /^#{1,3} /.test(line));
    const entry = sectionsOf(lines.slice(start + 1, end < 0 ? undefined : end).join("\n"));
    if (entry.sections.has("Writes")) return { heading, ...entry };
  }
  throw new Error(
    found ? `No planned or built section with a Writes line for ${name}` : `No catalog section for ${name}`,
  );
}
