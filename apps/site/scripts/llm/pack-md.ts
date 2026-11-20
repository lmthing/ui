import type { Pack } from "../site-types";
import { cat, readText, screenOf } from "./catalog";
import { fence, link } from "./md";

const status = (pack: Pack) => (pack.ready ? "live" : pack.items.length ? "in progress" : "planned");

/** One pack as Markdown: coverage, status, components (linked), archetypes, and the worked example. */
export function packMd(pack: Pack): string {
  const built = pack.items.map(
    (i) => `- ${link(i.id, `c/${i.id}.md`)}: ${i.purpose}${i.state === "ready" ? "" : ` (${i.state})`}`,
  );
  const planned = pack.planned
    .filter((p) => !pack.items.some((i) => i.id === p.id))
    .map((p) => `- ${p.id}: ${p.summary} (planned)`);
  const archetypes = cat.packArchetypes[pack.id] ?? [];
  const lines = pack.lines;
  const screen = lines.length ? screenOf(`${pack.id}_app`, lines) : null;
  const read = screen ? readText(screen) : "";
  return [
    `# ${pack.id} pack`,
    "",
    `> ${pack.pick}`,
    "",
    `- Status: ${status(pack)}, build wave ${pack.wave}`,
    `- Components: ${pack.items.filter((i) => i.state !== "draft").length} built of ${pack.plannedComponents || pack.items.length}`,
    `- Archetypes: ${pack.builtArchetypes} built of ${pack.plannedArchetypes} planned`,
    pack.example ? `- Worked example: ${pack.example}` : "",
    "",
    'A pack is chosen by the Director for an app; a screen may use the core components plus at most three packs. The sentence above says what the pack covers and, after "Not", what belongs elsewhere.',
    "",
    "## Components",
    "",
    ...(built.length || planned.length ? [...built, ...planned] : ["None yet."]),
    "",
    "## Archetypes",
    "",
    ...(archetypes.length ? archetypes.map((a) => `- \`${a.id}\`: ${a.job ?? ""}`) : ["None built yet."]),
    "",
    "## Worked example",
    "",
    lines.length
      ? `One JSON line per component, from \`packs/${pack.id}/example.jsonl\`:`
      : "This pack has no worked example yet.",
    "",
    lines.length ? fence("jsonl", lines.join("\n")) : "",
    "",
    read ? `What an agent reads for that screen:\n\n${fence("text", read)}` : "",
    "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}
