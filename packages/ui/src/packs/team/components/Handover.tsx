import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { handoverDetails, handoverReading } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Composer/entry accepts personal writing, not a shift's authored notes with shared acknowledgements.
export const meta = {
  id: "Handover",
  status: "ready",
  group: "content",
  purpose: "Read what the last shift passed on and mark each note as seen.",
  pick: "Read shift-to-shift notes with author, time, optional flag and a mark-as-seen control. Not writing your own note (Composer), chatting (Bubbles), or a record change log (ActivityLog).",
  writeHints: [
    "Put the newest note first. time is a short display label, such as 08:40.",
    'Use detail "brief" when asked to hide timestamps, but keep time on every note.',
    'Use item tone "warn" only when explicitly asked to emphasize a flag as a warning; otherwise use null.',
  ],
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "Shift notes and their acknowledgements are stored in a shared app.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["time"] } },
  parts: ["root", "message"],
  items: {
    key: "notes",
    parts: ["root", "by", "time", "text", "flag", "seen"],
    variants: { tone: ["neutral", "warn"] },
  },
  states: ["filled", "empty"],
  live: {
    checks: { seen: "seen" },
    derive: (input): c.Values => handoverDetails(input as z.output<typeof props>) ?? {},
  },
  actions: { items: { seen: ["check"] }, when: { seen: { seen: false } } },
  read: (input, state, lang): string[] =>
    state === "filled" ? handoverReading(input as Parameters<typeof handoverReading>[0], lang) : [],
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  notes: z
    .array(
      z.strictObject({
        ...c.itemVariantProps(meta.items.variants),
        by: c.text(20),
        time: c.text(12),
        text: c.text(160),
        flag: c.text(16).optional(),
        seen: z.boolean(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const { placeholderDetail, placeholderValue } = c.wordsFor(lang);
  const note = (by: string, text: string) => ({ by, text, time: placeholderValue, seen: false });
  const notes = c.itemsOf(cast, 6).flatMap((item) => {
    const by = c.titleOf(item, 20, thing);
    return by ? [note(by, c.detailOf(item, 160, thing) ?? placeholderDetail)] : [];
  });
  return { notes: notes.length ? notes : [note(c.placeholderTitle(0, lang), placeholderDetail)] };
}

const plantNotes = {
  notes: [
    {
      by: "Anna",
      time: "08:40",
      text: "Keep ferns shaded until noon.",
      flag: "Heat warning",
      seen: false,
      tone: "warn",
    },
    { by: "Rae", time: "07:15", text: "Empty trays are on the bench.", seen: true },
  ],
} satisfies z.input<typeof props>;

export const examples = [
  plantNotes,
  {
    notes: [
      {
        by: "Sam",
        time: "13:45",
        text: "Clover’s spare lead is outside.",
        flag: "Spare lead",
        seen: false,
      },
    ],
  },
  { ...plantNotes },
  { ...plantNotes },
  { ...plantNotes, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Handover");
export const probes = [
  choose(
    "Let the next work shift read notes left by the previous crew, newest first, and acknowledge each note as seen.",
  ),
  choose("Give me a private multi-line box to write my own note about how the plants did today.", "Composer"),
  write(
    "Pass on two shift notes, newest first: Anna at 08:40 says Leave the ferns in the shade until noon, flag Heat warning, not seen. Rae at 07:15 moved the empty trays to the potting bench, already seen.",
  ),
  {
    ...write(
      "For the afternoon dog-walking crew, show Sam's unseen handover note from 13:45: Clover's spare lead is on the porch. Keep the time recorded but don't show it to the crew. Leave the spacing and card treatment to the app.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark Anna's note about the ferns as seen", { address: "h1/r1/seen", action: "check" }),
] satisfies c.Probe[];

type HandoverProps = c.Props<typeof props, typeof meta>;
type NoteProps = {
  note: HandoverProps["notes"][number];
  detail: HandoverProps["detail"];
  density: c.ThemeDensity;
};

function HandoverNote({ note, detail, density }: NoteProps) {
  const { words } = kit.useWords(teamWordsFor);
  const { by, time, text, flag, seen } = note;
  const { markSeen, seenNote } = words.handover;
  const check = (
    <kit.KitCheck part="seen" done={seen} readonly={seen} label={seen ? seenNote(text) : markSeen(text)} />
  );
  return (
    <kit.KitRow item={note.id} label={by} inline lineRole="label" trailing={check} density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitText part="by" role="label" tone="muted" density={density}>
          {by}
        </kit.KitText>
        {flag && (
          <kit.KitText
            part="flag"
            role="label"
            align="end"
            tone={note.tone === "warn" ? "warn" : "muted"}
            density={density}
          >
            {flag}
          </kit.KitText>
        )}
      </kit.KitGrid>
      {detail === "full" && (
        <kit.KitText part="time" role="label" tone="muted" density={density} tabular>
          {time}
        </kit.KitText>
      )}
      <kit.KitContent density={density} group="response">
        <kit.KitText part="text" role="body" density={density} emphasis="strong">
          {text}
        </kit.KitText>
      </kit.KitContent>
    </kit.KitRow>
  );
}

export function Handover(input: HandoverProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { notes } = kit.useLiveControls(meta, input) as HandoverProps;
  return (
    <kit.KitCard part="root" padded={state === "filled"} surface={surface} density={density}>
      {state === "filled" ? (
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {notes.map((note) => (
            <HandoverNote key={note.id} {...{ note, detail, density }} />
          ))}
        </kit.KitGrid>
      ) : (
        <kit.KitEmpty part="message" icon="clipboard_list" decorativeIcon />
      )}
    </kit.KitCard>
  );
}
