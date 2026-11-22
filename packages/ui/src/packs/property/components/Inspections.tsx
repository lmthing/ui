import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import {
  inspectionChoices,
  inspectionConditions,
  inspectionDisplay,
  inspectionEditPath,
  inspectionEntries,
  inspectionNoteLimit,
  inspectionPhotoParts,
  inspectionProgress,
  inspectionSummary,
  readInspection,
} from "../copy";
import { propertyWordsFor } from "../lang";
import { dateTime, distinct, ref, seedDate, seedLabels } from "../seeds";
import { prompt } from "../../../entry/prompt-Inspections.generated";
const recordRef = ref.meta({ kind: "ref" });

// Core first: Checklist/default cannot bind condition, notes and photographic evidence to a locked unit report.
// prettier-ignore
export const meta = {
  id: "Inspections",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Reports and inspector sign-off live locally; adding evidence uses camera or library permission, not tenant consent.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["previous"] } },
  parts: ["root", "unit", "date", "kind", "completion", "previous", "signed", "rooms", "finalise", "message", "help"],
  items: {
    key: "entries", visibleWhen: { visible: true },
    parts: ["root", "title", "room_name", "condition", "note", "photo", "remove_photo", "sign", "co_signed", "dispute", ...inspectionPhotoParts],
    edits: {
      condition: { action: "select", prop: "condition", choices: inspectionChoices },
      note: { action: "type", prop: "note", max: inspectionNoteLimit, empty: "unset" },
      dispute: { action: "type", prop: "disputeComment", max: inspectionNoteLimit, empty: "unset" },
      photo: { action: "photo", prop: "photos", max: inspectionPhotoParts.length },
      remove_photo: { action: "remove", photo: "photo" },
    },
    editPath: inspectionEditPath,
  },
  signOff: { finalise: "finalisedAt" },
  partTiers: { photo: "ok", sign: "people" },
  confirmParts: ["remove_photo", "finalise"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalise: ["press"] },
    items: { root: ["select"], condition: ["select"], note: ["type"], photo: ["press"], remove_photo: ["press"], sign: ["press"], dispute: ["type"] },
    when: {
      root: { entryKind: "room", style: "rooms" }, finalise: { canFinalise: true },
      condition: { editable: true }, note: { editable: true },
      photo: { editable: true, canAddPhoto: true }, remove_photo: { editable: true, hasPhoto: true },
      sign: { canSign: true }, dispute: { canDispute: true },
    },
  },
  select: { prop: "roomRef", value: { field: "roomRef" } },
  read: readInspection, readSuccess: true,
  live: { derive: inspectionDisplay },
} as const satisfies c.Meta;

// prettier-ignore
const check = z.strictObject({
  checkRef: ref, title: c.text(32), condition: z.enum(inspectionConditions),
  note: c.text(inspectionNoteLimit).optional(), photos: z.array(c.photo).min(0).max(inspectionPhotoParts.length),
  tenantSignoff: z.enum(["pending", "signed"]).optional(), disputeComment: c.text(inspectionNoteLimit).optional(),
}).refine(({ tenantSignoff, disputeComment, condition }) =>
  !(tenantSignoff === "signed" && (disputeComment || condition === "unrecorded")),
  { path: ["tenantSignoff"], message: "A disputed or unrecorded check cannot be co-signed" });
// prettier-ignore
const room = z.strictObject({ roomRef: ref, title: c.text(32), checks: z.array(check).min(1).max(6) })
  .refine(({ checks }) => distinct(checks, ({ checkRef }) => checkRef), { path: ["checks"] });
// prettier-ignore
const schema = z.strictObject({
  ...c.variantProps(meta.variants), inspectionRef: recordRef, unitRef: recordRef, unit: c.text(32), date: c.isoDate,
  kind: z.enum(["move_in", "move_out", "periodic"]), rooms: z.array(room).min(1).max(8),
  previousRef: recordRef.optional(), finalisedAt: dateTime.optional(), style: z.enum(["rooms", "report"]).default("rooms"),
}).refine(({ rooms }) => distinct(rooms, ({ roomRef }) => roomRef), { path: ["rooms"] })
  .refine(({ inspectionRef, previousRef }) => inspectionRef !== previousRef, { path: ["previousRef"] })
  .refine((value) => !value.finalisedAt || inspectionProgress(value).complete, {
    path: ["finalisedAt"], message: "Every check needs a condition before sign-off",
  });
const withEntries = (value: z.output<typeof schema>) => ({
  ...value,
  entries: inspectionEntries(value),
  canFinalise: value.style === "rooms" && !value.finalisedAt && inspectionProgress(value).complete,
});
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { ref, title } = seedLabels(input)[0]!;
  return {
    inspectionRef: `${ref}_report`,
    unitRef: ref,
    unit: title,
    date: seedDate,
    kind: "periodic",
    rooms: [
      {
        roomRef: `${ref}_room`,
        title: c.placeholderTitle(1, input.lang),
        checks: [
          {
            checkRef: `${ref}_check`,
            title: c.placeholderTitle(2, input.lang),
            condition: "unrecorded",
            photos: [],
          },
        ],
      },
    ],
  };
}

export const examples = [
  {
    inspectionRef: "willow_move_in",
    unitRef: "flat_a",
    unit: "Willow Flat",
    date: "2026-11-18",
    kind: "move_in",
    previousRef: "willow_move_out",
    rooms: [
      {
        roomRef: "kitchen",
        title: "Kitchen",
        checks: [
          {
            checkRef: "worktop",
            title: "Worktop",
            condition: "worn",
            note: "Light scuffs beside the sink, with no chips.",
            photos: ["local:1"],
          },
        ],
      },
    ],
  },
  {
    inspectionRef: "cabin_move_out",
    unitRef: "north_cabin",
    unit: "North Cabin",
    date: "2026-11-17",
    kind: "move_out",
    previousRef: "cabin_move_in",
    finalisedAt: "2026-11-17T11:15:00+00:00",
    style: "report",
    rooms: [
      {
        roomRef: "hall",
        title: "Hall",
        checks: [{ checkRef: "skirting", title: "Skirting", condition: "good", photos: [] }],
      },
      {
        roomRef: "bedroom",
        title: "Bedroom",
        checks: [
          {
            checkRef: "door",
            title: "Door",
            condition: "worn",
            note: "The latch still closes smoothly.",
            photos: ["local:2"],
          },
        ],
      },
    ],
  },
  {
    inspectionRef: "elm_move_in",
    unitRef: "flat_c",
    unit: "Elm Flat",
    date: "2026-11-18",
    kind: "move_in",
    rooms: [
      {
        roomRef: "hall",
        title: "Hall",
        checks: [
          { checkRef: "door", title: "Door", condition: "worn", photos: [], tenantSignoff: "pending" },
          {
            checkRef: "wall",
            title: "Wall",
            condition: "good",
            photos: [],
            tenantSignoff: "pending",
            disputeComment: "There is a crack behind the door.",
          },
        ],
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Inspections");
export const probes = [
  choose(
    "At move-in record the condition of each feature by room, attach photos and notes, then lock the dated report",
  ),
  choose(
    "Give me independent household chores with a checkbox per job; no room evidence or formal report",
    "Checklist",
  ),
  write(
    "Draft a move-in report willow_move_in for Willow Flat (flat_a), dated 2026-11-18. Kitchen (kitchen), Worktop (worktop) worn, note 'Scuffs by the sink.', photo local:1. Not signed off yet.",
  ),
  {
    ...write(
      "Show a brief read-only move-out condition report cabin_move_out for North Cabin (north_cabin), dated 2026-11-17. Hall (hall), skirting (skirting) is good, no photos. Keep the earlier report link cabin_move_in in the data but don’t show its reference. Keep the app’s spacing and container settings unchanged.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Finalise and lock this completed move-in condition report", {
    address: "i1/finalise",
    action: "press",
  }),
  {
    ...write(
      "For the editable move-in inspection elm_move_in at Elm Flat (flat_c) on 2026-11-18, mark the Hall (hall) Door (door) worn, no photos. Enable tenant co-signing on that check; it is pending. Record this tenant dispute: 'The latch sticks.'",
    ),
    expectProps: {
      rooms: [
        {
          roomRef: "hall",
          checks: [{ checkRef: "door", tenantSignoff: "pending", disputeComment: "The latch sticks." }],
        },
      ],
    },
  },
] satisfies c.Probe[];

type InspectionProps = c.Props<typeof props, typeof meta> & { roomRef?: string };
type Entry = InspectionProps["entries"][number];
type Check = Extract<Entry, { entryKind: "check" }>;
type Density = c.ThemeDensity;
type EvidenceCheck = Extract<ReturnType<typeof inspectionEntries>[number], { entryKind: "check" }>;
const conditionTone = {
  good: "good",
  worn: "warn",
  damaged: "bad",
  unrecorded: "muted",
  not_applicable: "text",
} as const;
type InspectionWords = ReturnType<typeof propertyWordsFor>["inspections"];
function InspectionDispute(
  row: EvidenceCheck,
  canDispute: boolean,
  words: InspectionWords,
  density: Density,
  loading: boolean,
) {
  return loading ? (
    <kit.KitSkeleton shape="control" kind="quiet" label={words.dispute} full />
  ) : canDispute ? (
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitLayoutText line={{ text: words.dispute, role: "meta" }} {...{ density }} />
      <kit.KitTextArea
        lines={1}
        part="dispute"
        value={row.disputeComment ?? ""}
        hint={words.disputeHint}
        label={words.dispute}
        maxLength={inspectionNoteLimit}
      />
    </kit.KitContent>
  ) : (
    <kit.KitLayoutText
      line={{ text: words.disputeReading(row.disputeComment!), part: "dispute", role: "body" }}
      {...{ density }}
    />
  );
}

function TenantReview({
  row,
  edit,
  density,
  loading,
}: {
  row: EvidenceCheck;
  edit: boolean;
  density: Density;
  loading: boolean;
}) {
  const {
    words: { inspections: words },
  } = kit.useWords(propertyWordsFor);
  if (!row.tenantSignoff && !row.disputeComment) return null;
  const canDispute = edit && row.canDispute;
  const status =
    row.tenantSignoff === "signed"
      ? words.coSigned
      : row.tenantSignoff === "pending" && !canDispute
        ? words.coSignPending
        : undefined;
  return (
    <>
      <kit.KitLayoutText
        line={{
          text: status,
          part: "co_signed",
          role: "meta",
          tone: row.tenantSignoff === "signed" ? "good" : "muted",
        }}
        {...{ density }}
      />
      {(canDispute || row.disputeComment) && InspectionDispute(row, canDispute, words, density, loading)}
      {edit && row.canSign && (
        <kit.KitContent group="response" {...{ density }}>
          <kit.KitActionFooter {...{ density }}>
            {loading ? (
              <kit.KitSkeleton shape="control" kind="secondary" label={words.coSign} full />
            ) : (
              <kit.KitAction part="sign" kind="secondary" label={words.coSign} full />
            )}
          </kit.KitActionFooter>
        </kit.KitContent>
      )}
    </>
  );
}
function ConditionChoices({
  row,
  density,
  loading,
}: {
  row: EvidenceCheck;
  density: Density;
  loading: boolean;
}) {
  const {
    words: { inspections: words },
  } = kit.useWords(propertyWordsFor);
  const chips = inspectionConditions.map((value) => (
    <kit.KitChip
      key={value}
      item={null}
      role="radio"
      look="box"
      value={value}
      on={value === row.condition}
      label={words.condition[value]}
    />
  ));
  const choices = (
    <kit.KitGrid columns={2} {...{ density }}>
      {chips}
    </kit.KitGrid>
  );
  return loading ? (
    <kit.KitContent {...{ density }}>{choices}</kit.KitContent>
  ) : (
    <kit.KitTrack part="condition" role="radiogroup" label={words.conditionFor(row.title)}>
      {choices}
    </kit.KitTrack>
  );
}
function InspectionCondition(
  row: EvidenceCheck,
  edit: boolean,
  density: Density,
  words: InspectionWords,
  loading: boolean,
) {
  return edit ? (
    <>
      <ConditionChoices {...{ row, density, loading }} />
      {loading ? (
        <kit.KitRow part={null} label={words.note} tone="muted" inset="none" {...{ density }}>
          <kit.KitSkeleton shape="figure" inset="md" content={[["body", words.note]]} {...{ density }} />
        </kit.KitRow>
      ) : (
        <kit.KitTextArea
          lines={1}
          part="note"
          value={row.note}
          hint={words.note}
          label={words.noteFor(row.title)}
          maxLength={inspectionNoteLimit}
        />
      )}
    </>
  ) : (
    !loading && (
      <>
        <kit.KitText part="condition" role="label" tone={conditionTone[row.condition]} {...{ density }}>
          {words.condition[row.condition]}
        </kit.KitText>
        {row.note && (
          <kit.KitText part="note" role="label" tone="muted" {...{ density }}>
            {row.note}
          </kit.KitText>
        )}
      </>
    )
  );
}

function InspectionPhotos(
  row: EvidenceCheck,
  edit: boolean,
  density: Density,
  words: InspectionWords,
  loading: boolean,
  lang: string,
) {
  const photo = (reference: string, index: number) => (
    <kit.KitPhoto
      key={index}
      part={loading ? null : inspectionPhotoParts[index]!}
      photo={reference}
      shape={row.photos.length === 1 ? "wide" : "square"}
      {...{ loading }}
      label={words.photoFor(row.title, c.numberLine(index + 1, lang))}
    />
  );
  const actions = (
    <kit.KitContent {...{ density }}>
      {row.canAddPhoto &&
        (loading ? (
          <kit.KitSkeleton shape="control" kind="secondary" label={words.addPhoto} full />
        ) : (
          <kit.KitAction part="photo" label={words.addPhoto} kind="secondary" full />
        ))}
      {row.hasPhoto &&
        (loading ? (
          <kit.KitSkeleton shape="control" kind="danger" label={words.removePhoto} full />
        ) : (
          <kit.KitAction part="remove_photo" label={words.removePhoto} kind="danger" full />
        ))}
    </kit.KitContent>
  );
  return (
    <kit.KitContent group="response" {...{ density }}>
      {row.photos.length === 1
        ? photo(row.photos[0]!, 0)
        : row.hasPhoto && (
            <kit.KitGrid columns={row.photos.length === 2 ? 2 : 3} {...{ density }}>
              {row.photos.map(photo)}
            </kit.KitGrid>
          )}
      {edit && actions}
    </kit.KitContent>
  );
}

function CheckDetails({
  row,
  edit,
  density,
  loading,
  separated,
}: {
  row: EvidenceCheck;
  edit: boolean;
  density: Density;
  loading: boolean;
  separated: boolean;
}) {
  const {
    lang,
    words: { inspections: words },
  } = kit.useWords(propertyWordsFor);
  return (
    <kit.KitContent group={separated ? "response" : "content"} {...{ density }}>
      {loading ? (
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          {...{ density }}
          content={[
            ["body", row.title],
            ["label", edit ? undefined : words.condition[row.condition]],
            ["label", edit ? undefined : row.note],
          ]}
        />
      ) : (
        <kit.KitText part="title" role="body" emphasis="strong" {...{ density }}>
          {row.title}
        </kit.KitText>
      )}
      {InspectionCondition(row, edit, density, words, loading)}
      {(row.hasPhoto || edit) && InspectionPhotos(row, edit, density, words, loading, lang)}
      <TenantReview {...{ row, edit, density, loading }} />
    </kit.KitContent>
  );
}

function InspectionHeading(
  unit: string,
  { date, kind, completion, signed, previous }: ReturnType<typeof inspectionSummary>,
  state: c.StateName,
  density: Density,
  finalised: string,
) {
  const loading = state === "loading";
  return (
    <>
      {state === "filled" && signed && (
        <kit.KitText part="message" role="label" tone="good">
          {finalised}
        </kit.KitText>
      )}
      <kit.KitContent {...{ density }}>
        <kit.KitHeader
          title={{ text: unit, part: "unit" }}
          meta={[
            { text: kind, part: "kind" },
            { text: date, part: "date" },
          ]}
          {...{ density }}
        />
        {loading ? (
          <kit.KitLayoutText
            line={{ text: `${completion.count} ${completion.label}`, role: "meta" }}
            {...{ density }}
          />
        ) : (
          <kit.KitText part="completion" role="label" tone="muted" {...{ density }}>
            <kit.KitText part={null} role="label" emphasis="strong" tabular {...{ density }}>
              {completion.count}
            </kit.KitText>{" "}
            {completion.label}
          </kit.KitText>
        )}
        <kit.KitLayoutText
          line={{ text: signed, part: "signed", role: "meta", tone: "good" }}
          {...{ density }}
        />
        <kit.KitLayoutText
          line={{ text: previous, part: "previous", role: "meta", tone: "muted" }}
          {...{ density }}
        />
      </kit.KitContent>
    </>
  );
}

type InspectionRoom = Extract<Entry, { entryKind: "room" }>;
function InspectionRoomSelector(rooms: InspectionRoom[], current: string | undefined, label: string) {
  return (
    <kit.KitTrack part="rooms" role="radiogroup" label={label}>
      {rooms.map((row) => (
        <kit.KitChip
          key={row.id}
          item={row.id}
          role="radio"
          disabled={false}
          labelPart="room_name"
          label={row.title}
          on={row.roomRef === current}
        />
      ))}
    </kit.KitTrack>
  );
}

type RoomFinish = { selector: boolean; edit: boolean; loading: boolean; density: Density };
function InspectionRoomView(
  room: InspectionRoom,
  visible: Entry[],
  { selector, edit, loading, density }: RoomFinish,
) {
  return (
    <kit.KitContent key={room.id} group={selector ? "content" : "response"} {...{ density }}>
      {!selector &&
        (loading ? (
          <kit.KitSkeleton shape="figure" inset="none" content={[["label", room.title]]} />
        ) : (
          <kit.KitText item={room.id} part="root" role="label" tone="muted" {...{ density }}>
            <kit.KitText item={room.id} part="title" role="label" tone="muted" {...{ density }}>
              {room.title}
            </kit.KitText>
          </kit.KitText>
        ))}
      <kit.KitRowGroup {...{ density }} spacing="groups">
        {visible
          .filter((row): row is Check => row.entryKind === "check" && row.roomRef === room.roomRef)
          .map((row, index) => (
            <kit.KitRow
              key={row.id}
              item={row.id}
              part={loading ? null : "root"}
              label={row.title}
              inline
              inset="none"
              {...{ density }}
            >
              <CheckDetails
                {...{ row, density, loading }}
                separated={index > 0}
                edit={edit && row.editable}
              />
            </kit.KitRow>
          ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

function InspectionReport({
  input,
  density,
  state,
  lang,
}: {
  input: InspectionProps;
  density: Density;
  state: c.StateName;
  lang: string;
}) {
  const {
    words: { inspections: words },
  } = kit.useWords(propertyWordsFor);
  const summary = inspectionSummary(input, lang);
  const rooms = input.entries.filter((row) => row.entryKind === "room");
  const current = input.roomRef ?? rooms[0]?.roomRef;
  const visible = input.entries.filter((row) => row.visible);
  const loading = state === "loading",
    edit = state !== "success",
    selector = input.style === "rooms" && edit;
  return (
    <>
      {InspectionHeading(input.unit, summary, state, density, words.finalised)}
      {selector && InspectionRoomSelector(rooms, current, words.rooms)}
      {rooms
        .filter((room) => input.style === "report" || room.roomRef === current)
        .map((room) => InspectionRoomView(room, visible, { selector, edit, loading, density }))}
      {edit && input.canFinalise && (
        <kit.KitActionFooter {...{ density }}>
          {loading ? (
            <kit.KitSkeleton shape="control" kind="primary" label={words.finalise} full />
          ) : (
            <kit.KitAction part="finalise" label={words.finalise} full />
          )}
        </kit.KitActionFooter>
      )}
    </>
  );
}
export function Inspections(input: InspectionProps) {
  const state = kit.useComponentState();
  const {
    lang,
    words: { inspections: words },
  } = kit.useWords(propertyWordsFor);
  const visible = kit.useLiveControls(meta, input) as InspectionProps;
  const density = kit.useKit().density;
  const surface = "card";
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const content = <InspectionReport {...{ input: { ...visible, detail }, density, state, lang }} />;
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitState
        part="message"
        loading={content}
        retain
        message={state === "error" ? words.error : state === "success" ? words.finalised : undefined}
        {...{ density }}
      >
        {state === "error" ? (
          <kit.KitLayoutText
            line={{ text: words.errorDetail, part: "help", role: "meta", tone: "muted" }}
            {...{ density }}
          />
        ) : (
          content
        )}
      </kit.KitState>
    </kit.KitCard>
  );
}
