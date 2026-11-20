import type { RecordedData, SiteData } from "../site-types";
import { cat } from "./catalog";
import { fence, link, table } from "./md";

type Data = SiteData & RecordedData;

/** The wire format: what a model writes, what it never writes, how it is checked, and a complete small screen. */
export function writingMd(data: Data): string {
  const pack =
    data.packs.find((p) => p.id === "booking" && p.lines.length) ?? data.packs.find((p) => p.lines.length);
  const screen = (pack?.lines ?? []).slice(0, 3);
  return [
    "# Writing screens",
    "",
    "> A model writes one JSON object per line. Each line names one component from a fixed catalog and fills its props. Code checks every line and draws the screen.",
    "",
    "## The line",
    "",
    "- `c`: the component id, exactly as in the catalog (PascalCase, for example `List`). A line can only name a component the app has.",
    "- `id`: the component's instance id, unique on the screen, snake_case (for example `plants_list`).",
    "- Every other key is a prop of that component, flat, as listed on its page. Absent optional props are left out.",
    "- Item ids (`r1`, `r2`) are never written. Code stamps them from item order.",
    "",
    "## Structured output",
    "",
    `The provider is asked for JSON that matches \`writerFormat(registry)\`: one branch per component, with \`c\` as a constant, so the model cannot name another component or invent a prop. The schema for the core catalog is in ${link("catalog.json", "catalog.json")}; each component page has its own. A screen may use the core components plus at most three packs, chosen for the app.`,
    "",
    "## What a model never sends",
    "",
    "- Colours, sizes, spacing, fonts, shadows or camera values. Looks come from the theme, which is three enums (preset, accent, mode) the app sets; see " +
      link("themes.md", "themes.md") +
      ".",
    "- Code, markup or styles of any kind.",
    "- Props a component does not declare. The schemas are strict.",
    "",
    "## Checks and repairs",
    "",
    "- Every line is validated against its component's Zod schema, and screens are checked against the screen rules (regions, rhythm, weight and limits).",
    "- Parse and component repairs are specified as R1 (strip fences, trailing commas, single quotes, close brackets, else drop the line) and R2 (validate the id, strip unknown fields, fill required values from the component's fallback, snap enums, icons and photo tags, clamp text and lists). They are not yet built in `@lmthing/ui`, so no repair codes exist in code yet; the plan reserves the form `R<stage>.<what>`.",
    "- An undeclared variant axis or value is repaired back to its default (`repairVariants` in the catalog).",
    "- Lines that are not valid JSON or name an unknown component are rejected, never guessed at.",
    "",
    "## A complete small screen",
    "",
    pack
      ? `From the ${pack.id} pack's worked example (\`packs/${pack.id}/example.jsonl\`), the first lines of one screen:`
      : "",
    "",
    fence("jsonl", screen.join("\n")),
    "",
    `More: ${link("reading.md", "reading.md")} (how an agent reads and acts), ${link("llms.txt", "llms.txt")} (index).`,
    "",
  ].join("\n");
}

/** The read format and the action JSON, with real examples from recorded read probes. */
export function readingMd(data: Data): string {
  const seen = new Set<string>();
  const probes = data.readProbes.filter((p) => {
    const key = p.text.split("\n")[2] ?? p.text;
    return seen.has(key) ? false : (seen.add(key), true);
  });
  const examples = probes
    .slice(0, 3)
    .flatMap((p) => [
      `Recorded from ${p.model}. The task: ${p.task}`,
      "",
      fence("text", p.text),
      "",
      "The answer:",
      "",
      fence("json", JSON.stringify({ address: p.address, action: p.action })),
      "",
    ]);
  return [
    "# Reading screens and acting on them",
    "",
    "> A screen is read as compact text, one line per component, and acted on with an address and an action. A model never needs the DOM or a screenshot.",
    "",
    "## The text format",
    "",
    "- First line: `screen <id>` and the title in quotes when there is one.",
    "- Then one line per component: `<instance id> <Component> <texts>`. Text in quotes is content.",
    "- Items are indented under their component, one per line, with their stamped ids (`r1`, `r2`).",
    "- Actions are in square brackets and start with their address: `[l1/r2/trail toggle:off]` is address `l1/r2/trail`, action `toggle`. `press→fern` means the press opens the screen `fern`.",
    "",
    "## Addresses",
    "",
    "`screen/component[/item][/part]`, for example `home/l1/r1/trail`. Ids are instance ids from the screen, never generated at random. Part names come from the component's page.",
    "",
    "## Acting",
    "",
    `The answer is one JSON object: ${fence("json", '{"address": "l1/r1/trail", "action": "toggle"}')}`,
    "`value` is added for actions that carry one (`set`, `select`). The action is the word only (`press`, `toggle`, `check`). The app runs exactly the code a touch runs, and refuses an address or action the screen does not offer.",
    "",
    "## Examples from real recordings",
    "",
    ...examples,
    `Index: ${link("llms.txt", "llms.txt")}. Writing: ${link("writing.md", "writing.md")}.`,
    "",
  ].join("\n");
}

/** Themes and the shared variant vocabulary, as data. */
export function themesMd(data: Data): string {
  const presets = data.presets.map((p) => [`\`${p.id}\``, p.mood, p.shape, p.density, p.font]);
  const axes = Object.entries(cat.variantAxes).map(([axis, a]) => [
    `\`${axis}\``,
    a.kind,
    a.values.join(" | "),
  ]);
  return [
    "# Themes and variant axes",
    "",
    "> A theme is enums, never values. The agent sends meaning; the app renders.",
    "",
    "## Theme",
    "",
    `A theme is a preset, an accent and a mode. The name is \`kit_<preset>_<mode>_<accent>\`, for example \`kit_calm_light_moss\`. Built today: ${data.presets.length} presets x ${data.accents.length} accents x 2 modes = ${data.stats.themesBuilt} themes. Planned: 12 presets x 12 accents x 2 modes = 288, plus two app-wide enums, \`density\` (comfortable | compact) and \`motion\` (calm | lively), in step U6a.`,
    "",
    table(["preset", "mood", "shape", "density", "font"], presets),
    "",
    `Accents built: ${data.accents.map((a) => `\`${a.id}\``).join(", ")}. Modes: \`light\`, \`dark\`.`,
    "",
    "## Shared variant axes",
    "",
    "One closed vocabulary shared by components. An axis value is a name the theme turns into tokens; it never carries a number, colour or font. Each component declares the subset that makes sense for it, default first, on its own page. Axes are ordinary flat props.",
    "",
    table(["axis", "kind", "values (default first)"], axes),
    "",
    `Index: ${link("llms.txt", "llms.txt")}.`,
    "",
  ].join("\n");
}

/** The human home page as text. */
export function indexMd(data: Data): string {
  const s = data.stats;
  const waves = data.waves.filter((w) => w.wave > 0).map((w) => `- Wave ${w.wave}: ${w.packs.join(", ")}`);
  return [
    "# lmthing/ui: components a model can't misuse",
    "",
    `> The component catalog behind lmthing. A model picks from ${s.core} core components and up to three of ${data.packs.length} domain packs and writes each as a JSON line. Code checks the line and the kit draws it. There is no code, colour or size in a line to get wrong.`,
    "",
    `${s.shipped} components are ready (${s.built} exist as code of ${s.plannedTotal} planned). ${s.packsReady} of ${data.packs.length} packs are live, ${s.packsInProgress} in progress, ${s.packsPlanned} planned. ${s.themesBuilt} themes are built.`,
    "",
    "## How a screen gets made",
    "",
    "The order is fixed: Listener, Director, parallel Writers, a Validator that is plain code, then Critic. No model chooses the next step and none reads the chat history. Writers answer under strict structured output.",
    "",
    "## Where to go",
    "",
    `- ${link("llms.txt", "llms.txt")}: the index for models`,
    `- ${link("writing.md", "writing.md")}, ${link("reading.md", "reading.md")}, ${link("themes.md", "themes.md")}`,
    `- ${link("catalog.json", "catalog.json")} and ${link("components.json", "components.json")}`,
    `- Interactive site: ${link("", "")}`,
    "",
    "## Packs by build wave",
    "",
    ...waves,
    "",
  ].join("\n");
}
