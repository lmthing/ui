import type { Props } from "../../../catalog";
import { KitCard, KitState, useComponentState, useWords, useKit } from "../../../kit";
import { SeatPlan, type SeatPlanProps } from "../../../kit/renderers";
import { Seating } from "../components";
import { eventsWordsFor } from "../lang";

type Input = Props<typeof Seating.props, typeof Seating.meta>;
type Guest = Extract<Input["entries"][number], { kind: "guest" }>;
type Tables = Extract<SeatPlanProps, { kind: "tables" }>;
type Words = ReturnType<typeof eventsWordsFor>["seating"];
type Moves = Readonly<Record<string, readonly string[]>>;

function guestSeat(guest: Guest, words: Words, moves: Moves | undefined) {
  const { id, name } = guest;
  return {
    id,
    label: name,
    namePart: "name",
    initials: name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => Array.from(word)[0])
      .join(""),
    target: { item: id, part: "root" },
    move: { destinations: moves?.[id] ?? [], label: (table: string) => words.move(name, table) },
  };
}

function tablePlan(
  entries: Input["entries"],
  words: Words,
  lang: string,
  moves: Moves | undefined,
): Tables["tables"] {
  return entries.flatMap((table, index) => {
    if (table.kind !== "table") return [];
    const guests = entries.flatMap((guest) =>
      guest.kind === "guest" && guest.at === index ? [guestSeat(guest, words, moves)] : [],
    );
    return [
      {
        id: table.id,
        label: table.label,
        shape: table.shape,
        target: { item: table.id, part: "root" },
        labelPart: "label",
        count: { part: "seats", text: words.count(guests.length, table.seats, lang) },
        seats: [
          ...guests,
          ...Array.from({ length: Math.max(0, table.seats - guests.length) }, (_, at) => ({
            id: `vacancy-${at}`,
            label: words.available,
          })),
        ],
      },
    ];
  });
}

/** Adapts the draft's stamped table and guest entries without changing its Writer contract. */
export function SeatingPlan({
  entries,

  moves,
}: Input & { moves?: Moves }) {
  const {
    lang,
    words: { seating: words },
  } = useWords(eventsWordsFor);
  const density = useKit().density;
  const loading = useComponentState() === "loading";
  const trayGuests = entries.flatMap((guest) =>
    guest.kind === "guest" && guest.at === null ? [guestSeat(guest, words, moves)] : [],
  );
  const plan = (
    <SeatPlan
      kind="tables"
      part={null}
      loading={loading}
      tables={tablePlan(entries, words, lang, moves)}
      tray={{ part: "tray", text: words.tray, role: "meta" }}
      trayGuests={trayGuests}
    />
  );
  return (
    <KitCard padded density={density}>
      <KitState loading={plan} density={density}>
        {plan}
      </KitState>
    </KitCard>
  );
}
