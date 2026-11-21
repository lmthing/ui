import { appointmentDate, numberLine, timeOfDayLine, type StateName, type Values } from "../../../catalog";
import { propertyWordsFor, type PropertyWords } from "../lang";

type Words = PropertyWords["inspections"];
export const inspectionConditions = ["unrecorded", "good", "worn", "damaged", "not_applicable"] as const;
export const inspectionNoteLimit = 100;
export const inspectionPhotoParts = ["evidence_one", "evidence_two", "evidence_three"] as const;
export const inspectionChoices = inspectionConditions.map((value) => ({
  value,
  label: propertyWordsFor().inspections.condition[value],
}));

type Check = {
  checkRef: string;
  title: string;
  condition: (typeof inspectionConditions)[number];
  note?: string | undefined;
  photos: readonly string[];
};
type Room = { roomRef: string; title: string; checks: readonly Check[] };
type Report = {
  unit: string;
  date: string;
  kind: keyof Words["kind"];
  rooms: readonly Room[];
  style: "rooms" | "report";
  detail: "full" | "brief";
  finalisedAt?: string | undefined;
  previousRef?: string | undefined;
};

export function inspectionProgress({ rooms }: Pick<Report, "rooms">) {
  const checks = rooms.flatMap(({ checks }) => checks);
  const recorded = checks.filter(({ condition }) => condition !== "unrecorded").length;
  return { recorded, total: checks.length, complete: recorded === checks.length };
}

export function inspectionEditPath(item: Readonly<Values>, wire: Readonly<Values>) {
  const rooms = wire.rooms as Room[];
  const room = rooms.findIndex(({ roomRef }) => roomRef === item.roomRef);
  const check = rooms[room]?.checks.findIndex(({ checkRef }) => checkRef === item.checkRef);
  return check !== undefined && check >= 0 ? ["rooms", room, "checks", check] : undefined;
}

export function inspectionEntries(input: Report) {
  const editable = input.style === "rooms" && !input.finalisedAt;
  return input.rooms.flatMap(({ roomRef, title, checks }) => [
    { roomRef, title, entryKind: "room", visible: true } as const,
    ...checks.map((check) => ({
      ...check,
      roomRef,
      entryKind: "check" as const,
      visible: input.style === "report" || roomRef === input.rooms[0]?.roomRef,
      editable,
      note: check.note ?? "",
      hasPhoto: check.photos.length > 0,
      canAddPhoto: check.photos.length < inspectionPhotoParts.length,
    })),
  ]);
}

export function inspectionDisplay(input: Values): Values {
  const { style, rooms, roomRef, entries } = input as Report & {
    roomRef?: string;
    entries: ReturnType<typeof inspectionEntries>;
  };
  const selected = rooms.find((room) => room.roomRef === roomRef)?.roomRef ?? rooms[0]?.roomRef;
  return {
    roomRef: selected,
    entries: entries.map((row) => ({
      ...row,
      visible: row.entryKind === "room" || style === "report" || row.roomRef === selected,
    })),
  };
}

export function inspectionSummary(input: Report, lang?: string) {
  const { inspections: words } = propertyWordsFor(lang);
  const { recorded, total } = inspectionProgress(input);
  const at = input.finalisedAt;
  return {
    date: appointmentDate(input.date, lang),
    kind: words.kind[input.kind],
    completion: words.completion(numberLine(recorded, lang), numberLine(total, lang)),
    previous: input.detail === "full" && input.previousRef ? words.previous(input.previousRef) : undefined,
    signed: at
      ? words.signedOff(
          words.dateTime(appointmentDate(at.slice(0, 10), lang), timeOfDayLine(at.slice(11, 16), lang)),
        )
      : undefined,
  };
}

export function readInspection(raw: unknown, state: StateName, lang?: string): string[] {
  if (state !== "filled" && state !== "success") return [];
  const input = raw as Report & {
    entries: (ReturnType<typeof inspectionEntries>[number] & { id: string })[];
    canFinalise: boolean;
  };
  const { inspections: words } = propertyWordsFor(lang);
  return [
    ...(state === "success" || input.finalisedAt ? [words.finalised] : []),
    ...Object.values(inspectionSummary(input, lang)).filter((line): line is string => Boolean(line)),
    ...input.entries.map((row) =>
      row.entryKind === "room"
        ? `${row.id} ${row.title}`
        : [
            row.id,
            row.title,
            words.condition[row.condition],
            row.note,
            ...row.photos,
            state === "filled" && row.editable && row.canAddPhoto && words.addPhoto,
            state === "filled" && row.editable && row.hasPhoto && words.removePhoto,
          ]
            .filter(Boolean)
            .join(" · "),
    ),
    ...(state === "filled" && input.canFinalise ? [words.finalise] : []),
  ];
}
