import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { projectSpeechCheck, readSpeechCheck, speechAttempts, speechFluencyScore, speechMatchedLine,
  speechReveal, speechScoreLine, speechWordLimit, speechWordLine, speechWordStatus } from "../copy";
import { learningWordsFor } from "../lang";

// Core first: Player (audio) plays the reference but cannot record a learner's attempt or show word-level feedback.
const commandInput = ({ props }: { props: c.Values }) => ({ phrase: String(props.targetPhrase) });
// prettier-ignore
export const meta = {
  id: "SpeechCheck", status: "ready", group: "input", tier: "ok",
  pick: "Practise saying an exact target phrase into a microphone and get per-word pronunciation feedback and a fluency score. Not passive playback (Player), tap-or-type tests (Quiz), or open-ended chat (AiThread).",
  purpose: "Practise saying a phrase aloud and see which words need another try.",
  region: "body", weight: 2,
  realPath: "The host records speech with permission and can submit a completed recording to a speech evaluation service.",
  writeHints: [
    'Supply the target phrase and its spoken words in order. Leave word status and fluencyScore null until a real evaluation returns results. Use referenceAudio only for the supplied clip reference, not a URL.',
    'Use style "listen" when the learner hears a reference before seeing the phrase; supply referenceAudio. If the user wants the target visible but optional phonetic and translation hints hidden, use detail "brief" and retain both hints in props.',
    'Leave surface and density null unless the person explicitly requests a different surface or spacing. The default card uses null, not "card".',
  ],
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["phonetic", "translation"] } },
  parts: ["root", "label", "phrase", "phonetic", "translation", "instruction", "listen", "mic", "evaluate",
    "retry", "reveal", "words", "score", "matched", "status", "operation_status", "audio_status"],
  items: { key: "words", parts: ["root"], addressedWhen: { showWords: true } },
  actions: {
    parts: { listen: ["play", "pause"], mic: ["start", "stop"], evaluate: ["press"], retry: ["press"], reveal: ["press"] },
    when: { listen: { hasReference: true }, mic: { canCapture: true }, evaluate: { canEvaluate: true },
      retry: { canRetry: true }, reveal: { canReveal: true } },
  },
  partTiers: { evaluate: "service", listen: "phone", reveal: "phone", retry: "phone" },
  confirmParts: ["evaluate", "retry"],
  states: ["filled", "loading", "success", "error"],
  readSuccess: true, successActions: ["listen.play", "listen.pause", "retry.press"],
  media: { playback: { listen: {} } },
  deviceData: [speechAttempts],
  live: { derive: projectSpeechCheck },
  localState: speechReveal,
  hostCommands: {
    identity: ({ props }) => String(props.targetPhrase),
    parts: {
      "evaluate.press": { kind: "command", name: "evaluateSpeech", input: commandInput },
      "retry.press": { kind: "command", name: "retrySpeech", input: commandInput },
    },
  },
  read: readSpeechCheck,
} as const satisfies c.Meta;
const reference = c.text(120).meta({ kind: "text", max: 120, read: false });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  phrase: c.text(120), phonetic: c.text(120).optional(), translation: c.text(120).optional(),
  referenceAudio: reference.optional(),
  words: z.array(z.strictObject({ text: c.text(24), status: speechWordStatus.optional() })).min(1).max(speechWordLimit),
  fluencyScore: speechFluencyScore.optional(),
  style: z.enum(["phrase", "listen"]).default("phrase"),
}).refine(({ style, referenceAudio }) => style !== "listen" || referenceAudio !== undefined,
  { path: ["referenceAudio"], message: "Listen-first needs a reference audio clip" })
  .overwrite((value) => ({ ...value, showWords: value.fluencyScore !== undefined || value.words.some(({ status }) => status !== undefined) }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && c.titleOf(item, max, thing)) || c.clip(c.placeholderTitle(index, lang), max);
  }
  return {
    phrase: castTitle(120, 0),
    words: Array.from({ length: 1 }, (_, index) => ({ text: castTitle(24, index) })),
  };
}

const fern = {
  phrase: "Arrosez la fougère.",
  phonetic: "ah-roh-zay lah foo-zhehr",
  translation: "Water the fern.",
  referenceAudio: "lib:water-the-fern",
  words: [{ text: "Arrosez" }, { text: "la" }, { text: "fougère" }],
};
// prettier-ignore
export const examples = [
  { ...fern, fluencyScore: 78, words: [
    { text: "Arrosez", status: "correct" }, { text: "la", status: "correct" }, { text: "fougère", status: "close" },
  ] },
  { style: "listen", phrase: "Put on the leash.", phonetic: "put on thuh leesh",
    referenceAudio: "lib:put-on-the-leash", words: [{ text: "Put" }, { text: "on" }, { text: "the" }, { text: "leash" }] },
  { ...fern, density: "compact" },
  { ...fern, surface: "outlined" },
  { ...fern, detail: "brief" },
  { ...fern, fluencyScore: 46, words: [
    { text: "Arrosez", status: "close" }, { text: "la", status: "correct" }, { text: "fougère", status: "missed" },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SpeechCheck");
// prettier-ignore
export const probes = [
  choose("I want to hear a native speaker say a fixed phrase, say it into my mic, and see which words I pronounced correctly."),
  choose("Play the 45-second audio recording from my last lesson with pause and a scrubber. I am only listening to the recording.", "Player"),
  { ...write('Let me hear "Put on the leash." from lib:put-on-the-leash before seeing the phrase. Then record me saying the four words Put, on, the, leash and check how I pronounce them. There is no result yet.'),
    expectProps: { style: "listen", referenceAudio: "lib:put-on-the-leash" } },
  { ...write('Let me see and say "Arrosez la fougère." and check my pronunciation word by word. Store the hint "ah-roh-zay lah foo-zhehr" and translation "Water the fern.", but explicitly hide both optional hints; do not hide the target phrase.'),
    variant: { axis: "detail", value: "brief" } },
  read("Show the hidden words of the phrase without starting an audio recording.", { address: "s1/reveal", action: "press" }, 1),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Live = ReturnType<typeof projectSpeechCheck> & {
  phrase?: string;
  phonetic?: string;
  translation?: string;
};
type Words = ReturnType<typeof learningWordsFor>["speechCheck"];
const wordTone = { correct: "good", close: "warn", missed: "bad" } as const;

// prettier-ignore
function SpeechFeedback({ live, words, lang, density }: { live: Live; words: Words; lang: string; density: c.ThemeDensity }) {
  const loading = kit.useComponentState() === "loading";
  return <kit.KitContent group="response" density={density}>
    {live.fluencyScore !== undefined && <kit.KitFigure density={density}
      value={{ text: speechScoreLine(live.fluencyScore, lang), part: "score", compact: true }}
      unit={{ text: words.fluency }} />}
    <kit.KitLayoutText density={density} line={{ text: speechMatchedLine(live.words, lang), part: "matched", role: "meta", tone: "muted" }} />
    <kit.KitTrack part="words" label={words.words}>
      {live.words.map(({ id, text, status }) => {
        const label = speechWordLine(text, status, words), tone = status ? wordTone[status] : "muted";
        const badge = <kit.KitContent inset="md" density={density}><kit.KitLayoutText line={{ text: label, role: "caption", tone }} density={density} /></kit.KitContent>;
        return <kit.KitRow key={id} item={id} part="root" label={label} lineRole="title" inline fitContent
          surface={loading ? "plain" : "tinted"} tone={loading ? undefined : tone} density={density} leadingAlign="row" leading={badge}>{null}</kit.KitRow>;
      })}
    </kit.KitTrack>
  </kit.KitContent>;
}

// prettier-ignore
function SpeechControls({ live, words, density, loading }: { live: Live; words: Words; density: c.ThemeDensity; loading: boolean }) {
  const { screen, component } = kit.usePartContext();
  const { controller } = kit.useKit();
  const key = `${screen}/${component}`;
  const playback = kit.useControlValue<boolean | "error">(`${key}/${c.clipKey("listen")}`, false);
  const [operation] = kit.useHostOperations();
  const listenLabel = playback === true ? words.pause : words.listen;
  const pending = operation?.status === "pending";
  const note = pending ? words.loading : operation?.status === "rejected" ? words.error :
    operation?.status === "cancelled" ? words.cancelled : live.canEvaluate ? words.recorded : undefined;
  return <>
    {live.hasReference && <kit.KitPlayback part="listen" style="audio" loading={loading}>
      <kit.KitContent density="compact" leadingAlign="row" lead={
        <kit.KitAction part="listen" contentParts={{}} action={playback === true ? "pause" : "play"}
          kind="secondary" a11y={listenLabel} icon={playback === true ? "pause" : "play"} />}>
        <kit.KitRow part={null} inline label={listenLabel} lineRole="label">
          <kit.KitLayoutText line={{ text: listenLabel, role: "meta" }} />
        </kit.KitRow>
      </kit.KitContent>
    </kit.KitPlayback>}
    {playback === "error" && <kit.KitLayoutText line={{ text: words.audioUnavailable, part: "audio_status", role: "meta", tone: "bad" }} />}
    {live.canCapture && <kit.KitMicCapture part="mic" target={{ part: "mic" }} loading={loading}
      label={live.recording ? words.stopMic : words.mic} recording={live.recording} level={live.level}
      {...(live.elapsedSeconds === undefined ? {} : { elapsedSeconds: live.elapsedSeconds })} />}
    {note && <kit.KitLayoutText line={{ text: note, part: "operation_status", role: "meta", tone: operation?.status === "rejected" ? "bad" : "muted" }} />}
    {live.canReveal && <kit.KitRow part={loading ? null : "reveal"} role="button" label={words.reveal} inline density={density} leadingAlign="row">
      <kit.KitLayoutText line={{ text: words.reveal, role: "meta", tone: "accent" }} density={density} />
    </kit.KitRow>}
    <kit.KitActionFooter density={density}>
      {!pending && controller?.actionsAt(`${key}/evaluate`).includes("press") && <kit.KitAction part="evaluate" contentParts={{}} label={words.evaluate} action="press" />}
      {!pending && controller?.actionsAt(`${key}/retry`).includes("press") && <kit.KitAction part="retry" contentParts={{}} label={words.retry} action="press" kind="danger" />}
    </kit.KitActionFooter>
  </>;
}

// prettier-ignore
export function SpeechCheck(input: View) {
  const scope = kit.usePartContext();
  const state = kit.useComponentState();
  const { lang, words: { speechCheck: words } } = kit.useWords(learningWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const live = kit.useLiveControls(meta, input) as Live;
  const result = state === "filled" && live.outcome ? (live.outcome === "success" ? "success" : "error") : state;
  const hintLines = [
    ...(live.phonetic ? [{ text: live.phonetic, part: "phonetic" }] : []),
    ...(live.translation ? [{ text: live.translation, part: "translation" }] : []),
  ];
  const body = <kit.KitContent density={density}>
    <kit.KitLayoutText density={density} line={{ text: words.label, part: "label", role: "meta", tone: "muted" }} />
    {live.phrase ? <kit.KitHeader density={density} title={{ text: live.phrase, part: "phrase" }} meta={hintLines} />
      : <kit.KitHeader density={density} title={{ text: words.audioFirst, part: "instruction" }} />}
    {live.showWords && <SpeechFeedback {...{ live, words, lang, density }} />}
    <kit.KitContent group="response" density={density}>
      <SpeechControls {...{ live, words, density }} loading={state === "loading"} />
    </kit.KitContent>
  </kit.KitContent>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.PartContext.Provider value={{ ...scope, state: result }}>
      <kit.KitState density={density} part="status" message={result === "success" ? words.success : live.outcome === "denied" ? words.denied : words.error}
        retain={state !== "error"} loading={body}>{body}</kit.KitState>
    </kit.PartContext.Provider>
  </kit.KitCard>;
}
