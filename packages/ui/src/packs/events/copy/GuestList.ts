import { numberLine, type StateName, type Values } from "../../../catalog";
import { eventsWordsFor } from "../lang";

const standardStatuses = ["yes", "no", "maybe", "waiting"] as const;
export const guestStatuses = [...standardStatuses, "pending_approval", "waitlisted"] as const;
type Status = (typeof guestStatuses)[number];
type Guest = {
  name: string;
  party?: string | undefined;
  status: Status;
  plus: number;
  diet?: string | undefined;
};
type Detail = "full" | "brief" | undefined;
const tones = {
  yes: "good",
  no: "muted",
  maybe: "warn",
  waiting: "muted",
  pending_approval: "warn",
  waitlisted: "muted",
} as const;

export function groupGuests<T extends Guest>(guests: readonly T[]) {
  const groups = new Map<string | number, { party?: string | undefined; rows: T[] }>();
  guests.forEach((guest, index) => {
    const key = guest.party ?? index;
    const existing = groups.get(key);
    if (existing) existing.rows.push(guest);
    else groups.set(key, { party: guest.party, rows: [guest] });
  });
  return [...groups.values()];
}

export function guestStats(guests: readonly Guest[], lang?: string) {
  const { guestList } = eventsWordsFor(lang);
  return guestStatuses.flatMap((key) => {
    const total = guests.filter(({ status }) => status === key).length;
    if (!total && (key === "pending_approval" || key === "waitlisted")) return [];
    const count = numberLine(total, lang);
    return [{ key, count, line: guestList.stat(count, guestList.status[key]) }];
  });
}

export function guestFacts(guest: Guest, detail: Detail, lang?: string) {
  const { guestList } = eventsWordsFor(lang);
  return {
    plus: guest.plus ? guestList.plus(numberLine(guest.plus, lang)) : undefined,
    diet: detail === "brief" ? undefined : guest.diet,
    status: guestList.status[guest.status],
    tone: tones[guest.status],
  };
}

export function hideGuestDiets(input: Readonly<Values>): Values {
  if (input.detail !== "brief" || !Array.isArray(input.guests)) return {};
  return { guests: (input.guests as Values[]).map((guest) => ({ ...guest, diet: undefined })) };
}

export function guestListReading(
  { guests, detail }: { guests: readonly Guest[]; detail?: Detail },
  state: StateName,
  lang?: string,
): string[] {
  if (state !== "filled") return [];
  const { guestList } = eventsWordsFor(lang);
  const stats = guestStats(guests, lang).map(({ line }) => line);
  if (guests.some(({ status }) => status === "waiting")) stats.push(guestList.remind);
  if (guests.some(({ status }) => status === "pending_approval"))
    stats.push(guestList.approve, guestList.decline);
  return [
    stats.join(guestList.separator),
    ...groupGuests(guests).map(({ rows, party }) =>
      guestList.party(
        party ?? rows[0]!.name,
        rows.map((row) => {
          const { plus, diet } = guestFacts(row, detail, lang);
          const label =
            row.status === "pending_approval" || row.status === "waitlisted"
              ? guestList.status[row.status]
              : row.status;
          return guestList.guest(row.name, plus, label, diet);
        }),
      ),
    ),
  ];
}
