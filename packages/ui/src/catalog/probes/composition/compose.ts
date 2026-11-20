import type { CastLike } from "../../types";
import { defaultLines, type ComposeProbe, type CoreArchetypeMeta as ArchetypeMeta } from "../../archetypes";
import { checkScreen } from "../../rules";
import { readScreen, type ScreenLike } from "../../agent";
import { buildEntry, variantVocabulary } from "../../prompt";
import { migrateScreen } from "../../migrations";
import type { CallModel, Definition } from "..";
import { composeFormat, compositionInput } from "./compose-format";
import { packPropIssues } from "./pack-prop-issues";
const omitGuidance =
  "Return compact JSON. When a layout says to omit a field the schema requires, write null for it instead.";
export type ComposeResult = {
  archetype: string;
  layout: string;
  status: "pass" | "fail";
  score: string;
  detail: string;
  prompt: string;
  replies: string[];
  rubric?: Record<string, number>;
};
function decode(reply: string): unknown {
  try {
    return JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
  } catch {
    return undefined;
  }
}
export function composePrompt(
  meta: ArchetypeMeta,
  layout: string,
  cast: CastLike,
  defs: Record<string, Definition>,
  brief?: string,
): string {
  const slots = meta.layouts[layout]!.slots;
  const names = [...new Set(slots.flatMap((slot) => [...slot.allow]))];
  const offersVariants = names.some((name) => defs[name]?.meta.variants || defs[name]?.meta.items?.variants);
  const inheritedToggle =
    slots.some((slot) => slot.variant === "toggle" && slot.allow.includes("List")) &&
    defs.List?.meta.variants?.trail?.includes("toggle");
  const toggle = inheritedToggle
    ? 'toggle means every List row has an effective trail of "toggle"; a row without a trail can inherit the List trail.'
    : "toggle means every List row has trail: toggle.";
  return [
    "Write one complete phone screen as JSON: {id,title?,components:[{id,c,...props}]}. Use unique snake_case ids for components; never put ids on array items. Use only listed props. Use null for absent optional fields, never write empty strings.",
    `Layout: ${meta.id}/${layout}. Job: ${meta.purpose}.`,
    ...(brief === undefined ? [] : [`Brief: ${brief}\n${omitGuidance}`]),
    `Recipe slots: ${JSON.stringify(slots)}. Match every required slot in order. Variants such as shelf, reply, month or mood are the component's style; Field/Camera variants are kind. prices means every Choice option has a price value; ${toggle}`,
    "Screen rules: three to nine components outside overlays, total weight at most twelve, at most two weight-three components. One primary Button at most. Hero first in the body; a SectionTitle needs following content. Repeated types cannot be adjacent except Card and Field. Reply Composer is last after Bubbles. Do not invent color, size or layout props.",
    ...(offersVariants
      ? [
          variantVocabulary,
          "An explicit layout rule can request an axis. Catalog examples show JSON shape, not requested styling. Never infer an axis from the data alone. Variant limits: one hero emphasis and one cover collection per screen.",
        ]
      : []),
    ...(meta.layouts[layout]!.writeHints ?? []).map((hint) => `Layout rule: ${hint}`),
    `Real app content: ${JSON.stringify(cast)}`,
    ...names.map((name) => `${buildEntry(defs[name]!)}\nweight: ${defs[name]!.meta.weight}`),
    `A valid default for this layout: ${JSON.stringify(defaultLines(meta, layout, cast, defs))}`,
    "Use the supplied facts, not content from examples. Do not invent dates, status, measurements, or zero values for missing data. Keep all components focused on the screen's job; give the main action a clear label and avoid duplicate or unrelated actions. Reply with JSON only.",
  ].join("\n\n");
}
function hasToggleRows(entry: ScreenLike["components"][number], def: Definition | undefined): boolean {
  if (!def?.meta.variants?.trail && !def?.meta.items?.variants?.trail)
    return Array.isArray(entry.rows) && entry.rows.every((row) => row?.trail === "toggle");
  const { id: _id, c: _c, state: _state, ...input } = entry;
  const parsed = def.props.safeParse(input);
  if (!parsed.success || !def.meta.items) return false;
  const rows: unknown = parsed.data[def.meta.items.key];
  return Array.isArray(rows) && rows.every((row) => (row?.trail ?? parsed.data.trail) === "toggle");
}
export function scoreComposition(
  reply: string,
  meta: ArchetypeMeta,
  layout: string,
  defs: Record<string, Definition>,
): { screen?: ScreenLike; issues: string[] } {
  let decoded = decode(reply) as ScreenLike | undefined;
  if (
    !decoded ||
    typeof decoded.id !== "string" ||
    !Array.isArray(decoded.components) ||
    !decoded.components.every((entry) => entry && typeof entry.id === "string" && typeof entry.c === "string")
  )
    return { issues: ["Expected a screen object with component ids"] };
  decoded = migrateScreen(compositionInput(decoded, defs), { variantOnly: true });
  const issues = checkScreen(decoded, defs).map((issue) => `${issue.code}: ${issue.message}`);
  issues.push(...packPropIssues(decoded, meta.defaults[layout]!, defs));
  let available = [...decoded.components];
  for (const slot of meta.layouts[layout]!.slots) {
    const found = available
      .filter((entry) => {
        if (!slot.allow.includes(entry.c)) return false;
        if (!slot.variant) return true;
        if (slot.variant === "toggle") return hasToggleRows(entry, defs[entry.c]);
        if (slot.variant === "prices")
          return (
            Array.isArray(entry.options) &&
            entry.options.every((row: { value?: string }) => Boolean(row.value))
          );
        const { id: _id, c: _c, state: _state, ...input } = entry;
        const parsed = defs[entry.c]?.props.safeParse(input);
        return (
          parsed?.success &&
          (parsed.data as Record<string, unknown>)[
            ["Field", "Camera"].includes(entry.c) ? "kind" : "style"
          ] === slot.variant
        );
      })
      .slice(0, slot.max);
    if (found.length < slot.min)
      issues.push(
        `Missing required ${slot.id}: ${slot.allow.join(" or ")}${slot.variant ? ":" + slot.variant : ""}`,
      );
    available = available.filter((entry) => !found.includes(entry));
  }
  return issues.length ? { issues } : { issues, screen: decoded };
}
export function compositionRubricPrompt(screen: ScreenLike, defs: Record<string, Definition>): string {
  return [
    "Evaluate this phone screen for clarity, focus, flow, content and structure, each from 1 to 5. Judge its visible content and interaction plan. A useful, coherent, specific screen should score at least 4. Return only JSON numbers with those five keys.",
    readScreen(screen, defs),
  ].join("\n\n");
}
type ComposeOptions = {
  archetypes: readonly ArchetypeMeta[];
  probes?: readonly ComposeProbe[];
  defs: Record<string, Definition>;
  cast: CastLike | ((archetype: string, layout: string) => CastLike);
  callModel: CallModel;
  samples?: number;
  rubric?: boolean;
  only?: readonly string[];
};

export async function runComposeProbes(options: ComposeOptions): Promise<ComposeResult[]> {
  const briefs = new Map<string, string[]>();
  for (const { archetype, layout, brief } of options.probes ?? []) {
    const key = `${archetype}/${layout}`;
    if (!options.archetypes.some((meta) => meta.id === archetype && Object.hasOwn(meta.layouts, layout)))
      throw new Error(`Unknown compose probe layout ${key}`);
    briefs.set(key, [...(briefs.get(key) ?? []), brief]);
  }
  const results: ComposeResult[] = [];
  for (const meta of options.archetypes)
    for (const layout of Object.keys(meta.layouts)) {
      const key = `${meta.id}/${layout}`;
      if (options.only?.length && !options.only.includes(key)) continue;
      for (const brief of briefs.get(key) ?? [undefined])
        results.push(await runComposeProbe(options, meta, layout, brief));
    }
  return results;
}

async function runComposeProbe(
  { cast, defs, callModel, samples = 3, rubric: useRubric }: ComposeOptions,
  meta: ArchetypeMeta,
  layout: string,
  brief?: string,
): Promise<ComposeResult> {
  const content = typeof cast === "function" ? cast(meta.id, layout) : cast;
  const prompt = composePrompt(meta, layout, content, defs, brief);
  const format = composeFormat(meta, layout, defs);
  const replies: string[] = [];
  const scored: ReturnType<typeof scoreComposition>[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const reply = await callModel(prompt, sample, format);
    replies.push(reply);
    scored.push(scoreComposition(reply, meta, layout, defs));
  }
  const passed = scored.filter((result) => !result.issues.length).length;
  const result: ComposeResult = {
    archetype: meta.id,
    layout,
    status: passed * 2 > samples ? "pass" : "fail",
    score: `${passed}/${samples}`,
    detail: `${passed * 2 > samples && passed < samples ? "unstable: " : ""}${scored.find((item) => item.issues.length)?.issues.join("; ") ?? "Valid screen and recipe"}`,
    prompt,
    replies,
  };
  const screen = scored.find((item) => item.screen)?.screen;
  if (result.status === "pass" && useRubric && screen) {
    const rubric = decode(await callModel(compositionRubricPrompt(screen, defs), 0)) as
      Record<string, number> | undefined;
    const names = ["clarity", "focus", "flow", "content", "structure"];
    const ratings = names.map((name) => rubric?.[name]);
    if (
      !ratings.every(
        (rating) => typeof rating === "number" && Number.isFinite(rating) && rating >= 3.5 && rating <= 5,
      ) ||
      (ratings as number[]).reduce((sum, value) => sum + value, 0) / ratings.length < 4
    ) {
      result.status = "fail";
      result.detail = "Composition rubric needs average 4 and no score below 3.5";
    }
    if (rubric) result.rubric = rubric;
  }
  return result;
}
