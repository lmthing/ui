import type { Item } from "../site-types";
import { cat, lineOf, readText, sampleAct, schemaOf, screenOf, type Def } from "./catalog";
import { fence, link, table, tiers } from "./md";
import { propsTable } from "./props-table";

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Not X (Y)" guidance from a pick line, split off so it can be read on its own. */
function split(pick: string): { when: string; not: string } {
  const at = pick.search(/\bNot\b/);
  return at < 0 ? { when: pick, not: "" } : { when: pick.slice(0, at).trim(), not: pick.slice(at).trim() };
}

function partsSection(def: Def): string {
  const { parts = [], actions } = def.meta;
  const rows = parts.map((p) => [`\`${p}\``, (actions?.parts?.[p] ?? []).join(", ") || "none"]);
  const when = actions?.when
    ? `\nActions that depend on content: ${fence("json", JSON.stringify(actions.when))}`
    : "";
  return [
    "Addresses have the form `screen/component[/item][/part]`, for example `home/c1/root`. Item ids (`r1`, `r2`) are stamped by code from item order; a model never writes them.",
    "",
    table(["part", "actions"], rows),
    when,
  ].join("\n");
}

function variantsSection(def: Def): string {
  const axes = def.meta.variants;
  if (!axes) return "No shared variant axes are declared for this component yet.";
  const rows = Object.entries(axes).map(([axis, values]) => [
    `\`${axis}\``,
    cat.variantAxes[axis]?.kind ?? "",
    values.join(" | "),
  ]);
  const items = def.meta.items?.variants;
  const itemRows = items
    ? Object.entries(items).map(([axis, values]) => [`\`${axis}\` (per item)`, "item", values.join(" | ")])
    : [];
  return `${table(["axis", "kind", "values (default first)"], [...rows, ...itemRows])}\n\nAxes are ordinary flat props: \`{"c":"${def.meta.id}","${Object.keys(axes)[0]}":"${Object.values(axes)[0]?.[1] ?? ""}"}\`.`;
}

function agentSection(id: string, def: Def): string {
  if (!def.examples.length) return "No example to read.";
  const screens = def.examples.map((example) => screenOf("home", [lineOf("c1", id, example)]));
  const text = readText(screens[0]!);
  if (!text) return "The catalog could not read this example.";
  const actAt = screens.findIndex((screen) => sampleAct(screen));
  const act = actAt >= 0 ? sampleAct(screens[actAt]!) : null;
  const read = `The text an agent reads for the first example:\n\n${fence("text", text)}`;
  if (!act) return `${read}\n\nNo example of this component offers an action to take.`;
  const shown =
    actAt === 0
      ? ""
      : `\n\nFor example ${actAt + 1} the screen reads:\n\n${fence("text", readText(screens[actAt]!))}`;
  return `${read}${shown}\n\nA sample answer to a task such as "do the main thing here" (the action JSON an agent sends back):\n\n${fence("json", JSON.stringify(act))}`;
}

/** One component as Markdown: purpose, guidance, props, schema, parts, actions, variants, examples, agent view. */
export function componentMd(item: Item, def: Def): string {
  const { when, not } = split(item.pick);
  const status = item.state === "ready" ? "ready" : item.state;
  return [
    `# ${item.id}`,
    "",
    `> ${def.meta.purpose}`,
    "",
    `- Group: ${item.group}`,
    `- Pack: ${item.pack ? link(item.pack, `p/${item.pack}.md`) : "core"}`,
    `- Status: ${status}`,
    `- Tier: ${tiers[item.tier] ?? item.tier}`,
    def.meta.realPath ? `- Real path: ${def.meta.realPath}` : "",
    `- States: ${(def.meta.states ?? ["filled"]).join(", ")}`,
    "",
    "## When to pick it",
    "",
    upperFirst(when),
    not ? `\n${not}` : "",
    "",
    "## Props",
    "",
    `Write them flat next to \`id\` and \`c\`. Absent optional props are omitted.`,
    "",
    propsTable(schemaOf(def)),
    "",
    "## JSON Schema",
    "",
    fence("json", JSON.stringify(schemaOf(def), null, 2)),
    "",
    "## Parts and actions",
    "",
    partsSection(def),
    "",
    "## Variants",
    "",
    variantsSection(def),
    "",
    "## Examples",
    "",
    `Each is one wire line, ${def.examples.length} in all.`,
    "",
    ...def.examples.flatMap((example) => [fence("json", lineOf("c1", item.id, example)), ""]),
    "## What an agent reads and does",
    "",
    agentSection(item.id, def),
    "",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");
}
