import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { audioMatchReading } from "../copy";
import { mediaWordsFor } from "../lang";
import {
  audioMatchRecordKind,
  match,
  matchHistory,
  previewRecognition,
  projectRecognition,
  type Match,
  type RecognitionPhase,
} from "../audio-match-data";
import { prompt } from "../../../entry/prompt-AudioMatch.generated";

// Core first: Player/audio can play a known recording but cannot identify audio heard through the microphone.
export const meta = {
  id: "AudioMatch",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "ok",
  realPath:
    "The host requests microphone permission, captures a sample, and asks a recognition service to identify it.",
  variants: { media: ["cover", "none"] },
  variantParts: { "media.none": { hides: ["artwork", "photo"] } },
  parts: ["root", "listen", "open", "artwork", "title", "artist", "album", "status", "recent"],
  items: { key: "history", parts: ["root", "title", "artist", "photo", "matched_at"] },
  // prettier-ignore
  actions: {
    parts: { listen: ["start", "stop"], open: ["press"] }, items: { root: ["press"] },
    when: { "listen.start": { canStart: true }, "listen.stop": { listening: true }, "root.press": { linkedMatch: true } },
  },
  partTiers: { listen: "service", open: "service" },
  confirmParts: ["open"],
  emptyActions: ["listen.start"],
  loadingActions: ["listen.stop"],
  successActions: ["listen.start", "open.press", "root.press"],
  readSuccess: true,
  states: ["empty", "filled", "loading", "success", "error"],
  deviceData: [audioMatchRecordKind],
  previewDeviceData: previewRecognition,
  live: { derive: projectRecognition },
  hostCommands: {
    parts: {
      "listen.start": { kind: "command", name: "audioMatch.start" },
      "listen.stop": { kind: "command", name: "audioMatch.stop" },
      "open.press": {
        kind: "external",
        uri: ({ props }) => (typeof props.recognitionUrl === "string" ? props.recognitionUrl : undefined),
      },
    },
  },
  read: (value, state, lang): string[] => audioMatchReading(value as MatchReading, state, lang),
} as const satisfies c.Meta;

type MatchReading = Parameters<typeof audioMatchReading>[0];
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  listening: z.boolean().default(false),
  match: match.optional(),
  history: matchHistory,
  style: z.enum(["listen", "result"]).default("listen"),
});

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { history: [] };
}

export const examples = [
  {
    history: [
      {
        title: "Glasshouse",
        artist: "The Ferns",
        matchedAt: "9:42 AM",
        photo: "lib:plants",
        goto: "glasshouse",
      },
      { title: "Late Light", artist: "Moss Radio", matchedAt: "Yesterday", photo: "lib:fern" },
    ],
  },
  {
    style: "result",
    match: {
      title: "Meet Me at the Gate",
      artist: "Clover Club",
      album: "Open Air",
      photo: "lib:dogs",
      url: "https://example.com/tracks/meet-me",
    },
    history: [
      { title: "The Long Way Home", artist: "Trot Ensemble", matchedAt: "Yesterday", goto: "long_way" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("AudioMatch");
export const probes = [
  choose(
    "What song is playing in the room? Give me a button that listens through the microphone and remembers what it finds",
  ),
  choose("I already have the recording saved. Play it with a pause button and a scrubber", "Player"),
  {
    ...write(
      "Give me a way to identify the song playing nearby using the microphone. There are no previous matches.",
    ),
    expectProps: { history: [] },
  },
  {
    ...write(
      "Give me a way to identify music through the microphone, without showing album artwork anywhere. There are no previous matches.",
    ),
    variant: { axis: "media", value: "none" },
  },
  read("Open the earlier match called Glasshouse from the recent matches", {
    address: "a1/r1",
    action: "press",
  }),
] satisfies c.Probe[];

type AudioMatchProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; artwork: boolean };

function MatchCard({
  track,
  open,
  artwork,
  density,
  again,
}: Finish & { track: Match; open: boolean; again: boolean }) {
  const {
    words: { audioMatch: words },
  } = kit.useWords(mediaWordsFor);
  return (
    <kit.KitContent density={density}>
      {artwork && track.photo && (
        <kit.KitPhoto photo={track.photo} part="artwork" label={words.artwork} shape="wide" />
      )}
      <kit.KitHeader
        density={density}
        title={{ text: track.title, part: "title" }}
        meta={[
          { text: track.artist, part: "artist" },
          ...(track.album ? [{ text: track.album, part: "album" }] : []),
        ]}
      />
      <kit.KitActionFooter density={density}>
        {open && (
          <kit.KitAction
            action="press"
            part="open"
            contentParts={{}}
            kind="secondary"
            label={words.open}
            icon="external_link"
          />
        )}
        {again && (
          <kit.KitAction action="start" part="listen" contentParts={{}} kind="quiet" label={words.again} />
        )}
      </kit.KitActionFooter>
    </kit.KitContent>
  );
}

function RecentMatches({ history, artwork, density }: Finish & Pick<AudioMatchProps, "history">) {
  const {
    words: { audioMatch: words },
  } = kit.useWords(mediaWordsFor);
  const loading = kit.useComponentState() === "loading";
  const rows = (
    <kit.KitRowGroup density={density}>
      {history.map(({ id, title, artist, matchedAt, photo, goto }) => (
        <kit.KitRow
          key={id}
          item={id}
          label={title}
          inline
          leadingAlign="row"
          density={density}
          part={loading ? null : "root"}
          goto={loading ? undefined : goto}
          leading={
            artwork && photo ? (
              <kit.KitPhoto
                photo={photo}
                part={loading ? null : "photo"}
                label={words.artwork}
                loading={loading}
              />
            ) : undefined
          }
          trailing={
            <kit.KitLayoutText
              align="end"
              line={{ text: matchedAt, part: "matched_at", role: "meta", tone: "muted" }}
              density={density}
            />
          }
        >
          <kit.KitMetaLine
            density={density}
            title={{ text: title, part: "title" }}
            meta={{ text: artist, part: "artist" }}
          />
        </kit.KitRow>
      ))}
    </kit.KitRowGroup>
  );
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        density={density}
        title={{ text: words.recent, part: "recent", role: "body", strong: true }}
      />
      {loading ? <kit.KitState density={density} loading={rows} /> : rows}
    </kit.KitContent>
  );
}

function ListenControl({
  phase,
  density,
  level,
}: {
  phase: RecognitionPhase | "requesting";
  density: c.ThemeDensity;
  level: number;
}) {
  const {
    words: { audioMatch: words },
  } = kit.useWords(mediaWordsFor);
  const busy = phase === "matching" || phase === "requesting";
  const title = busy || phase === "listening" ? words[phase] : words.title;
  const action = phase === "listening" ? words.stop : phase === "error" ? words.retry : words.start;
  return (
    <kit.KitContent density={density}>
      {phase !== "error" && (
        <kit.KitText part={null} role="title" align="center" density={density}>
          {title}
        </kit.KitText>
      )}
      <kit.KitVoiceOrb
        part="listen"
        target={{ part: "listen" }}
        level={level}
        state={phase === "listening" ? "listening" : busy ? "thinking" : "idle"}
        label={busy ? title : action}
      >
        {!busy && (
          <kit.KitContent align="center">
            <kit.KitIcon name={phase === "listening" ? "square" : "mic"} scale="lg" decorative />
            <kit.KitText part={null} role="label" align="center">
              {action}
            </kit.KitText>
          </kit.KitContent>
        )}
      </kit.KitVoiceOrb>
    </kit.KitContent>
  );
}

export function AudioMatch(input: AudioMatchProps) {
  const live = kit.useLiveControls(meta, input) as AudioMatchProps &
    MatchReading & { phase: RecognitionPhase; level: number };
  const context = kit.usePartContext();
  const { state } = context;
  const operation = kit
    .useHostOperations()
    .find(({ name }) => name === "audioMatch.start" || name === "audioMatch.stop");
  const density = kit.useKit().density;
  const {
    words: { audioMatch: words },
  } = kit.useWords(mediaWordsFor);
  const phase =
    operation?.status === "pending"
      ? operation.name === "audioMatch.start"
        ? "requesting"
        : "matching"
      : state === "loading" && live.phase === "idle"
        ? "matching"
        : state === "error" || (operation?.status === "rejected" && live.phase !== "listening")
          ? "error"
          : live.phase;
  const artwork = input.media !== "none";
  const track = phase === "matched" ? live.match : undefined;
  const open = live.hasExternalTrack === true;
  const empty = state === "empty" && phase === "idle";
  const groupActions = input.style === "result";
  const feedback = phase === "error" ? "error" : empty ? "empty" : track ? "success" : undefined;
  const message = feedback === "error" ? words.error : feedback === "success" ? words.success : words.empty;
  return (
    <kit.KitCard part="root" padded density={density}>
      {feedback && (
        <kit.PartScope {...context} state={feedback}>
          <kit.KitContent align={feedback === "error" ? "center" : "start"}>
            <kit.KitState retain message={message} part="status" density={density} icon="music" />
          </kit.KitContent>
        </kit.PartScope>
      )}
      {track && <MatchCard {...{ track, open, artwork, density }} again={groupActions} />}
      {empty ? (
        <kit.KitAction full part="listen" action="start" contentParts={{}} label={words.start} icon="mic" />
      ) : !track ? (
        <ListenControl {...{ phase, density }} level={live.level} />
      ) : (
        !groupActions && (
          <kit.KitAction part="listen" action="start" kind="quiet" contentParts={{}} label={words.again} />
        )
      )}
      {!empty && live.history.length > 0 && (
        <RecentMatches history={live.history} {...{ artwork, density }} />
      )}
    </kit.KitCard>
  );
}
