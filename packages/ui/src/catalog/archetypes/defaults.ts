import { allLabel } from "../copy";
import type { CastLike } from "../types";
import type { Definition } from "../probes";
import type { ScreenLike } from "../agent";
import { placeholderDetail, placeholderTitle, placeholderValue, thingOf, clip } from "../cast";
import { definitionsOf, checkScreen, type RegistryLike } from "../rules";
import type { ArchetypeMeta, DefaultLine } from "./recipe";
function inputOf(
  line: DefaultLine,
  defs: Record<string, Definition>,
  cast: CastLike,
): Record<string, unknown> {
  const def = defs[line.c];
  if (!def) throw new Error(`Missing component ${line.c}`);
  const input = { ...(def.fallback({ cast }) as Record<string, unknown>) };
  const variant = line.variant;
  if (!variant) return input;
  if (line.c === "List" && ["shelf", "toggle"].includes(variant)) {
    const rows = [...(input.rows as Record<string, unknown>[])];
    if (variant === "shelf") {
      while (rows.length < 2) rows.push({ title: placeholderTitle(rows.length) });
      const photo = (defs.Photo!.fallback({ cast }) as { photo: string }).photo;
      input.style = "shelf";
      input.rows = rows.map((row) => ({ ...row, photo: row.photo ?? photo }));
    } else
      input.rows = rows.map((row, index) => {
        const item = cast.items[index],
          fields = thingOf(cast)?.fields ?? [];
        const enabled = item
          ? fields.map((field) => item[field]).find((value) => typeof value === "boolean")
          : undefined;
        return {
          ...row,
          trail: "toggle",
          goto: undefined,
          value: typeof enabled === "boolean" ? (enabled ? "on" : "off") : row.value,
        };
      });
  } else if (line.c === "Choice" && variant === "prices") {
    input.options = (input.options as Record<string, unknown>[]).map((option) => ({
      ...option,
      value: option.value ?? placeholderValue,
    }));
  } else {
    input[["Field", "Camera"].includes(line.c) ? "kind" : "style"] = variant;
    if (line.c === "Field" && ["date", "time"].includes(variant)) input.value = undefined;
    if (line.c === "Timeline" && variant === "hours")
      input.items = (input.items as { title: string }[]).map((item, index) => ({
        title: item.title,
        time: `${String(9 + index * 2).padStart(2, "0")}:00`,
        end: `${String(10 + index * 2).padStart(2, "0")}:00`,
      }));
  }
  return input;
}
/** A finished, validated default from neutral catalog fallbacks and the caller's cast. */
export function defaultLines(
  meta: ArchetypeMeta,
  layout: string,
  cast: CastLike,
  registry: RegistryLike,
  options: { id?: string; title?: string } = {},
): ScreenLike {
  let recipe = meta.defaults[layout];
  if (!recipe) throw new Error(`Unknown layout ${meta.id}/${layout}`);
  const defs = definitionsOf(registry),
    counts: Record<string, number> = {};
  const category = thingOf(cast)?.fields[1];
  const groups = new Map<string, CastLike["items"]>();
  if (meta.id === "list" && layout === "grouped" && category)
    for (const item of cast.items) {
      const name = item[category];
      if (typeof name === "string" && name.trim()) groups.set(name, [...(groups.get(name) ?? []), item]);
    }
  const grouped = [...groups.entries()].slice(0, 3);
  if (grouped.length)
    recipe = [
      { c: "Header" },
      { c: "Chips" },
      ...grouped.flatMap(() => [{ c: "SectionTitle" }, { c: "List" }]),
      { c: "Button" },
    ];
  let fieldIndex = 0,
    groupIndex = -1;
  const components = recipe.map((line) => {
    const prefix = line.c[0]!.toLowerCase();
    const id = `${prefix}${(counts[prefix] = (counts[prefix] ?? 0) + 1)}`;
    if (grouped.length && line.c === "SectionTitle") groupIndex++;
    const lineCast = grouped.length && line.c === "List" ? { ...cast, items: grouped[groupIndex]![1] } : cast;
    const input = inputOf(line, defs, lineCast);
    if (grouped.length && line.c === "SectionTitle") input.text = clip(grouped[groupIndex]![0], 24);
    if (grouped.length && line.c === "Chips")
      input.items = [
        { label: allLabel, on: true },
        ...grouped.map(([label]) => ({ label: clip(label, 16), on: false })),
      ];
    if (line.c === "Field" && !line.variant)
      input.label = clip(thingOf(cast)?.fields[fieldIndex++] ?? placeholderTitle(fieldIndex), 24);
    // Label supporting defaults without pretending to know a domain field.
    if (line.c === "Note" && !input.text) input.text = placeholderDetail;
    defs[line.c]!.props.parse(input);
    return { id, c: line.c, ...input };
  });
  const screen = {
    id: options.id ?? `${meta.id}_${layout}`,
    ...(options.title ? { title: options.title } : {}),
    components,
  };
  const issues = checkScreen(screen, defs);
  if (issues.length)
    throw new Error(
      `Invalid ${meta.id}/${layout} default: ${issues.map((issue) => issue.code + " " + issue.message).join("; ")}`,
    );
  return screen;
}
