import { allLabel } from "../copy";
import type { CastLike } from "../types";
import type { Definition } from "../probes";
import type { ScreenLike } from "../agent";
import {
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  placeholderValue,
  thingOf,
  titleOf,
  clip,
} from "../cast";
import { definitionsOf, checkScreen, type RegistryLike } from "../rules";
import type { ArchetypeMeta, DefaultLine } from "./recipe";
import { photo } from "../props";

/** Refined styles can impose tighter array bounds than the base schema exposes. */
function fitArrays(def: Definition, input: Record<string, unknown>, seed?: DefaultLine["seed"]): void {
  for (const [key, value] of Object.entries(input)) {
    if (!Array.isArray(value) || (seed && Object.hasOwn(seed, key))) continue;
    const parsed = def.props.safeParse(input);
    if (parsed.success) return;
    const issues = parsed.error.issues.filter((issue) => issue.path[0] === key);
    if (
      !issues.length ||
      issues.some(
        (issue) =>
          issue.path.length !== 1 ||
          (issue.code !== "custom" && !(issue.code === "too_big" && issue.origin === "array")),
      )
    )
      continue;
    // Keep the longest accepted prefix; never change a row or an unrelated invalid prop.
    for (let count = value.length - 1; count >= 0; count--) {
      const candidate = value.slice(0, count);
      const result = def.props.safeParse({ ...input, [key]: candidate });
      if (result.success || result.error.issues.every((issue) => issue.path[0] !== key)) {
        input[key] = candidate;
        break;
      }
    }
  }
}

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
      const reference = (defs.Photo!.fallback({ cast }) as { photo: string }).photo;
      input.style = "shelf";
      input.rows = rows.map((row) => ({ ...row, photo: row.photo ?? reference }));
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
    if (line.c === "Progress" && variant === "ring" && Array.isArray(input.bars))
      input.bars = input.bars.slice(0, 1);
    if (line.c === "Timeline" && variant === "hours")
      input.items = (input.items as { title: string }[]).map((item, index) => ({
        title: item.title,
        time: `${String(9 + index * 2).padStart(2, "0")}:00`,
        end: `${String(10 + index * 2).padStart(2, "0")}:00`,
      }));
  }
  return input;
}

function browseMedia(input: Record<string, unknown>, cast: CastLike) {
  const thing = thingOf(cast);
  // Match List's fallback, which takes the first three records of this type and skips untitled ones.
  const items = itemsOf(cast, 3).filter((item) => titleOf(item, 28, thing));
  const rows = (input.rows as Record<string, unknown>[]).map((row, index) => {
    const supplied = photo.safeParse(row.photo ?? items[index]?.photo);
    return supplied.success ? { ...row, photo: supplied.data } : row;
  });
  input.rows = rows;
  if (rows.length >= 2 && rows.every((row) => row.photo)) input.style = "shelf";
  else input.lead = "thumb";
}

function copySeed(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copySeed);
  if (value && typeof value === "object")
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copySeed(child)]));
  return value;
}

function finishInput(def: Definition, line: DefaultLine, input: Record<string, unknown>): void {
  if (line.seed) for (const [key, value] of Object.entries(line.seed)) input[key] = copySeed(value);
  const trail = line.seed?.trail;
  // Authored rows are not rewritten. Fallback rows should not show an empty trail.
  if (line.c === "List" && line.seed && !Object.hasOwn(line.seed, "rows"))
    if (trail === "value" || trail === "badge")
      input.rows = (input.rows as Record<string, unknown>[]).map((row) =>
        row.value
          ? row
          : { ...row, ...(trail === "value" ? { trail: "none" } : { value: clip(placeholderDetail, 10) }) },
      );
  fitArrays(def, input, line.seed);
  def.props.parse(input);
}

function groupedRecords(cast: CastLike) {
  const category = thingOf(cast)?.fields[1];
  if (!category) return [];
  const groups = new Map<string, CastLike["items"]>();
  for (const item of cast.items) {
    const name = item[category];
    if (typeof name === "string" && name.trim()) groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups.entries()].slice(0, 3);
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
  const coreLayout = !meta.layouts[layout]?.packOverride;
  const shelfBrowse = coreLayout && meta.id === "browse" && layout === "shelves";
  const detailMedia = coreLayout && meta.id === "detail" && layout === "media";
  if (detailMedia && !photo.safeParse(cast.items[0]?.photo).success)
    recipe = recipe.map((line) => (line.c === "Photo" ? { c: "Note" } : line));
  const defs = definitionsOf(registry),
    counts: Record<string, number> = {};
  const grouped = coreLayout && meta.id === "list" && layout === "grouped" ? groupedRecords(cast) : [];
  if (grouped.length)
    recipe = [
      { c: "Header" },
      { c: "Chips" },
      ...grouped.flatMap(() => [{ c: "SectionTitle" }, { c: "List" }]),
    ];
  let fieldIndex = 0,
    groupIndex = -1;
  const components = recipe.map((line) => {
    const prefix = line.c === "Progress" && line.variant === "ring" ? "r" : line.c[0]!.toLowerCase();
    const id = `${prefix}${(counts[prefix] = (counts[prefix] ?? 0) + 1)}`;
    if (grouped.length && line.c === "SectionTitle") groupIndex++;
    const lineCast = grouped.length && line.c === "List" ? { ...cast, items: grouped[groupIndex]![1] } : cast;
    const input = inputOf(line, defs, lineCast);
    if (shelfBrowse && line.c === "List") browseMedia(input, lineCast);
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
    finishInput(defs[line.c]!, line, input);
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
