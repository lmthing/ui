import type { CastLike } from "../../types";
import type { ComposeProbe, CoreArchetypeMeta as ArchetypeMeta } from "../../archetypes";
import { checkScreen, type PackScreenContext } from "../../rules";
import { readScreen, type ScreenLike } from "../../agent";
import { migrateScreen } from "../../migrations";
import type { ProbeCall, Definition, ReplayProbe } from "..";
import { composeFormat, compositionInput } from "./compose-format";
import { composeRequest } from "./compose-prompt";
import { packPropIssues } from "./pack-prop-issues";
export type ComposeResult = {
  archetype: string;
  layout: string;
  status: "pass" | "fail";
  score: string;
  detail: string;
  prompt: string;
  replies: string[];
  rubric?: (Record<string, unknown> | null)[];
};
function decode(reply: string): unknown {
  try {
    return JSON.parse(reply.slice(reply.indexOf("{"), reply.lastIndexOf("}") + 1));
  } catch {
    return undefined;
  }
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
  options?: { packContext?: PackScreenContext },
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
  const issues = checkScreen(decoded, defs, options).map((issue) => `${issue.code}: ${issue.message}`);
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
function meetsRubricBar(rubric: Record<string, unknown> | null): boolean {
  const ratings = ["clarity", "focus", "flow", "content", "structure"].map((name) => rubric?.[name]);
  return (
    ratings.every((rating) => typeof rating === "number") &&
    ratings.every((rating) => rating >= 3.5 && rating <= 5) &&
    ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length >= 4
  );
}

async function rateScreens(
  scored: readonly { screen?: ScreenLike }[],
  defs: Record<string, Definition>,
  callModel: ProbeCall,
  probe: Pick<ReplayProbe, "id" | "definition">,
) {
  const ratings: NonNullable<ComposeResult["rubric"]> = [];
  let rated = 0;
  for (const [index, { screen }] of scored.entries()) {
    if (!screen) {
      ratings.push(null);
      continue;
    }
    rated++;
    const localPrompt = compositionRubricPrompt(screen, defs);
    const reply = decode(
      await callModel(localPrompt, 0, undefined, { ...probe, id: `${probe.id}/${index}`, localPrompt }),
    );
    ratings.push(reply && typeof reply === "object" ? (reply as Record<string, unknown>) : null);
  }
  return { ratings, rated, passed: ratings.filter(meetsRubricBar).length };
}

type ComposeOptions = {
  archetypes: readonly ArchetypeMeta[];
  probes?: readonly ComposeProbe[];
  defs: Record<string, Definition>;
  packContext?: PackScreenContext;
  cast: CastLike | ((archetype: string, layout: string) => CastLike);
  callModel: ProbeCall;
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
  { cast, defs, packContext, callModel, samples = 3, rubric: useRubric }: ComposeOptions,
  meta: ArchetypeMeta,
  layout: string,
  brief?: string,
): Promise<ComposeResult> {
  const content = typeof cast === "function" ? cast(meta.id, layout) : cast;
  const { prompt, localPrompt } = composeRequest(meta, layout, content, defs, brief);
  const format = composeFormat(meta, layout, defs);
  const id = `${meta.id}/${layout}/${brief ?? ""}`;
  const definition = { layout: meta.layouts[layout], defaults: meta.defaults[layout], brief };
  const replies: string[] = [];
  const scored: ReturnType<typeof scoreComposition>[] = [];
  for (let sample = 0; sample < samples; sample++) {
    const reply = await callModel(prompt, sample, format, {
      id: `compose/${id}`,
      definition,
      localPrompt,
      samples,
    });
    replies.push(reply);
    scored.push(scoreComposition(reply, meta, layout, defs, packContext && { packContext }));
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
  if (useRubric) {
    const rubric = await rateScreens(scored, defs, callModel, { id: `rubric/${id}`, definition });
    result.rubric = rubric.ratings;
    if (result.status === "pass" && rubric.passed < rubric.rated) {
      const score = `${rubric.passed}/${rubric.rated} rated samples`;
      if (rubric.passed * 2 <= rubric.rated) {
        result.status = "fail";
        result.detail = `Composition rubric needs average 4 and no score below 3.5 in a majority (${score} passed)`;
      } else {
        result.detail = `unstable: rubric passed ${score}; ${result.detail.replace(/^unstable: /, "")}`;
      }
    }
  }
  return result;
}
