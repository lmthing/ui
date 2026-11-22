import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  breathCopy,
  breathFrame,
  breathReading,
  breathSeconds,
  groundingCopy,
  groundingSteps,
} from "../copy";
import { mindWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Breathe.generated";

// Core first: Timer/down counts time but cannot pace repeating inhale, hold, exhale and rest phases.
export const meta = {
  id: "Breathe",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Breathing is paced by an on-device animation with optional gentle haptics.",
  variants: { emphasis: ["normal", "quiet"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["rounds"] } },
  parts: ["root", "circle", "phase", "rounds", "grounding", "step", "next"],
  states: ["filled", "success"],
  actions: {
    parts: { circle: ["play", "pause"], next: ["press"] },
    when: { circle: { style: "circle" }, next: { style: "grounding" } },
  },
  sequence: { cursor: "groundingAt", count: groundingSteps + 1, steps: { next: "next" } },
  readSuccess: true,
  clocks: [
    {
      id: "breath",
      kind: "up",
      prop: "elapsed",
      runningProp: "running",
      when: { style: "circle" },
      max: (input): number => breathSeconds(input as z.output<typeof props>),
      start: { part: "circle", action: "play" },
      stop: { part: "circle", action: "pause" },
      zero: { state: "success" },
    },
  ],
  writeHints: prompt.writeHints,
  // prettier-ignore
  read: (input, state, lang): string[] => {
    if (state !== "filled" && state !== "success") return [];
    const seed = input as z.output<typeof props> & { elapsed?: number; running?: boolean; groundingAt?: number };
    if (seed.style === "grounding") {
      const { title, cue, step, next } = groundingCopy(state === "success" ? groundingSteps : (seed.groundingAt ?? 0), lang);
      return next ? [title, step!, cue, next] : [cue];
    }
    const [phase, rounds] = breathReading(breathFrame(seed, state === "success" ? Infinity : seed.elapsed), lang);
    const { play, pause } = mindWordsFor(lang).breathe;
    const lines = state === "success" ? [phase] : seed.running ? [phase, pause] : [play, phase];
    if (seed.detail === "full") lines.push(rounds);
    return lines;
  },
} as const satisfies c.Meta;

const seconds = z.int().min(0).max(10).optional();
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["circle", "grounding"]).default("circle"),
    pattern: z.enum(["box", "calm", "even", "custom"]).default("box"),
    rounds: z.int().min(1).max(20),
    inhale: seconds,
    hold: seconds,
    exhale: seconds,
    rest: seconds,
  })
  .refine(
    ({ pattern, inhale, hold, exhale, rest }) => {
      const phases = [inhale, hold, exhale, rest];
      return pattern === "custom"
        ? phases.every((phase) => phase !== undefined) && phases.some((phase) => (phase ?? 0) > 0)
        : phases.every((phase) => phase === undefined);
    },
    {
      path: ["pattern"],
      message: "Custom needs all four phase durations and at least one positive duration; presets take none",
    },
  );

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { pattern: "box", rounds: 1 };
}

export const examples = [
  { pattern: "box", rounds: 4 },
  { pattern: "custom", rounds: 6, inhale: 4, hold: 2, exhale: 6, rest: 0 },
  { pattern: "calm", rounds: 4, emphasis: "quiet" },
  { pattern: "even", rounds: 4, detail: "brief" },
  { style: "grounding", pattern: "box", rounds: 1 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Breathe");
export const probes = [
  choose(
    "Show a circle that expands as I breathe in and shrinks as I breathe out, pacing six rounds with a hold and pause.",
  ),
  choose(
    "Count down five minutes for a silent sit with start and stop; no breathing rhythm, just time left.",
    "Timer",
  ),
  write("Lead six rounds of custom breathing: inhale four seconds, hold two, exhale six, rest zero."),
  {
    ...write(
      "Guide four rounds of your even breathing preset. Show the breathing cue but hide the remaining-round count.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Play the breathing exercise using the playback action shown in brackets, not press.", {
    address: "b1/circle",
    action: "play",
  }),
  {
    ...write(
      "Guide a five-senses grounding exercise: notice five things I see, four I feel, three I hear, two I smell, and one I taste. Let me take each prompt at my own pace.",
    ),
    expectProps: { style: "grounding" },
  },
] satisfies c.Probe[];

function CountLabel({
  before,
  count,
  after,
  part,
}: ReturnType<typeof breathCopy>["rounds"] & { part: "rounds" | "step" }) {
  return (
    <kit.KitText part={part} role="caption" tone="muted" align={part === "rounds" ? "center" : "start"}>
      {before}
      <kit.KitText part={null} role="number" numberScale="compact" tabular>
        {count}
      </kit.KitText>
      {after}
    </kit.KitText>
  );
}

type BreathProps = c.Props<typeof props, typeof meta>;

function Grounding({ index }: { index: number }) {
  const context = kit.usePartContext();
  const { lang } = kit.useWords();
  const { title, cue, progress, next } = groundingCopy(
    context.state === "success" ? groundingSteps : index,
    lang,
  );
  if (!next || !progress)
    return (
      <kit.PartContext.Provider value={{ ...context, state: "success" }}>
        <kit.KitState part="grounding" message={cue} />
      </kit.PartContext.Provider>
    );
  return (
    <kit.KitContent>
      <kit.KitHeader title={{ text: cue, part: "phase" }} meta={{ text: title, part: "grounding" }} />
      <CountLabel part="step" {...progress} />
      <kit.KitActionFooter>
        <kit.KitAction part="next" label={next} kind="secondary" contentParts={{}} />
      </kit.KitActionFooter>
    </kit.KitContent>
  );
}

export function Breathe(input: BreathProps) {
  const live = kit.useLiveControls(meta, input);
  const surface = "card";
  return (
    <kit.KitCard part="root" surface={surface} padded>
      {input.style === "grounding" ? (
        <Grounding index={Number(live.groundingAt ?? 0)} />
      ) : (
        <BreathCircle input={input} live={live} />
      )}
    </kit.KitCard>
  );
}

function BreathCircle({ input, live }: { input: BreathProps; live: Record<string, unknown> }) {
  const complete = kit.useComponentState() === "success";
  const running = !complete && live.running === true;
  const frame = breathFrame(input, complete ? Infinity : Number(live.elapsed ?? 0));
  const emphasis = kit.useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang, words } = kit.useWords(mindWordsFor);
  const { cue, rounds } = breathCopy(frame, lang);
  const action = running ? words.breathe.pause : words.breathe.play;
  const controlFirst = !running && !complete;
  const phaseLine = (
    <kit.KitText
      part="phase"
      role={controlFirst ? "caption" : "heading"}
      align="center"
      tone={controlFirst ? "muted" : "text"}
      emphasis={emphasis}
    >
      {cue}
    </kit.KitText>
  );
  const control = !complete && (
    <kit.KitText
      part={null}
      role={controlFirst ? "heading" : "caption"}
      align="center"
      tone={emphasis === "quiet" ? "text" : "accent"}
      emphasis={emphasis}
    >
      {action}
    </kit.KitText>
  );
  return (
    <kit.KitContent rhythm="flush">
      <kit.KitBreath
        part={null}
        target={{ part: complete ? null : "circle" }}
        phase={frame.phase}
        progress={frame.progress}
        paused={!running}
        label={complete ? cue : words.breathe.controlLabel(action, cue)}
      >
        {controlFirst ? control : phaseLine}
        {controlFirst ? phaseLine : control}
      </kit.KitBreath>
      {detail === "full" && <CountLabel part="rounds" {...rounds} />}
    </kit.KitContent>
  );
}
