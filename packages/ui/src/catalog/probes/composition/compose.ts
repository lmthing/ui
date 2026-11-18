import type { CastLike } from "../../types";
import { defaultLines, type CoreArchetypeMeta as ArchetypeMeta } from "../../archetypes";
import { checkScreen } from "../../rules";
import { readScreen, type ScreenLike } from "../../agent";
import { buildEntry } from "../../prompt";
import type { CallModel, Definition } from "..";
import { composeFormat, compositionInput } from "./compose-format";
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
): string {
  const slots = meta.layouts[layout]!.slots;
  const names = [...new Set(slots.flatMap((slot) => [...slot.allow]))];
  return [
    "Write one complete phone screen as JSON: {id,title?,components:[{id,c,...props}]}. Use unique snake_case ids for components; never put ids on array items. Use only listed props. Use null for absent optional fields, never write empty strings.",
    `Layout: ${meta.id}/${layout}. Job: ${meta.purpose}.`,
    `Recipe slots: ${JSON.stringify(slots)}. Match every required slot in order. Variants such as shelf, reply, month or mood are the component's style; Field/Camera variants are kind. prices means every Choice option has a price value; toggle means every List row has trail: toggle.`,
    "Screen rules: three to nine components outside overlays, total weight at most twelve, at most two weight-three components. One primary Button at most. Hero first in the body; a SectionTitle needs following content. Repeated types cannot be adjacent except Card and Field. Reply Composer is last after Bubbles. Do not invent color, size or layout props.",
    ...(meta.layouts[layout]!.writeHints ?? []).map((hint) => `Layout rule: ${hint}`),
    `Real app content: ${JSON.stringify(cast)}`,
    ...names.map((name) => `${buildEntry(defs[name]!)}\nweight: ${defs[name]!.meta.weight}`),
    `A valid default for this layout: ${JSON.stringify(defaultLines(meta, layout, cast, defs))}`,
    "Write a useful screen for the supplied content, using the recipe. Reply with JSON only.",
  ].join("\n\n");
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
  decoded = compositionInput(decoded, defs);
  const issues = checkScreen(decoded, defs).map((issue) => `${issue.code}: ${issue.message}`);
  let available = [...decoded.components];
  for (const slot of meta.layouts[layout]!.slots) {
    const found = available
      .filter((entry) => {
        if (!slot.allow.includes(entry.c)) return false;
        if (!slot.variant) return true;
        if (slot.variant === "toggle")
          return (
            Array.isArray(entry.rows) && entry.rows.every((row: { trail?: string }) => row.trail === "toggle")
          );
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
export async function runComposeProbes(options: {
  archetypes: readonly ArchetypeMeta[];
  defs: Record<string, Definition>;
  cast: CastLike | ((archetype: string, layout: string) => CastLike);
  callModel: CallModel;
  samples?: number;
  rubric?: boolean;
  only?: readonly string[];
}): Promise<ComposeResult[]> {
  const results: ComposeResult[] = [],
    samples = options.samples ?? 3;
  for (const meta of options.archetypes)
    for (const layout of Object.keys(meta.layouts)) {
      if (options.only?.length && !options.only.includes(`${meta.id}/${layout}`)) continue;
      const cast = typeof options.cast === "function" ? options.cast(meta.id, layout) : options.cast;
      const prompt = composePrompt(meta, layout, cast, options.defs),
        replies: string[] = [];
      const scored: ReturnType<typeof scoreComposition>[] = [];
      for (let sample = 0; sample < samples; sample++) {
        const reply = await options.callModel(prompt, sample, composeFormat(meta, layout, options.defs));
        replies.push(reply);
        scored.push(scoreComposition(reply, meta, layout, options.defs));
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
      if (result.status === "pass" && options.rubric && screen) {
        const rubric = decode(await options.callModel(compositionRubricPrompt(screen, options.defs), 0)) as
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
      results.push(result);
    }
  return results;
}
