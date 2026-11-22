import { z } from "zod";
import { numberLine, text, type DeviceData, type StateName, type Values } from "../../../catalog";
import { eventsWordsFor } from "../lang";

export const doorSearchMax = 40;
const maxResults = 4;
const maxRecent = 3;
const ticket = z.object({
  instance: z.string(),
  id: z.string().regex(/^r[1-9]\d*$/),
  name: text(24),
  arrivedAt: z.int().nonnegative().optional(),
});
const outcome = z.object({ instance: z.string(), reason: z.enum(["already_in", "not_found"]) });

export function projectDoor(input: Readonly<Values>, instance: string, data: DeviceData) {
  const query = typeof input.query === "string" ? input.query : "";
  const needle = query.trim().toLowerCase();
  const unique = new Map<string, z.output<typeof ticket>>();
  for (const raw of data.doorTickets ?? []) {
    const parsed = ticket.safeParse(raw);
    if (parsed.success && parsed.data.instance === instance && !unique.has(parsed.data.id))
      unique.set(parsed.data.id, parsed.data);
  }
  const tickets = [...unique.values()];
  const arrived = tickets.filter(({ arrivedAt }) => arrivedAt !== undefined);
  const results = tickets
    .filter(({ name, arrivedAt }) => (needle ? name.toLowerCase().includes(needle) : arrivedAt === undefined))
    .slice(0, maxResults)
    .map(({ id, name, arrivedAt }) => ({ id, name, available: arrivedAt === undefined }));
  const reason = (data.doorFeedback ?? [])
    .map((raw) => outcome.safeParse(raw))
    .find((entry) => entry.success && entry.data.instance === instance);
  return {
    query,
    results,
    scannerReady: data.doorScanner?.includes(instance) ?? false,
    expected: tickets.length,
    arrived: arrived.length,
    recent: arrived
      .sort((a, b) => b.arrivedAt! - a.arrivedAt!)
      .slice(0, maxRecent)
      .map(({ name }) => name),
    reason: reason?.data?.reason,
  };
}

type Projected = ReturnType<typeof projectDoor> & { detail?: "full" | "brief" | undefined };

export function doorSummary(input: Projected, state: StateName, lang?: string) {
  const { door } = eventsWordsFor(lang);
  const { expected, arrived, recent, reason, detail } = input;
  return {
    arrivals: expected ? door.count(numberLine(arrived, lang), numberLine(expected, lang)) : door.noTotals,
    recent: detail !== "brief" && recent.length > 0 ? door.recent(recent) : undefined,
    feedback:
      state === "success" ? door.success : state === "error" ? door.errors[reason ?? "not_found"] : undefined,
  };
}

export function doorReading(input: Projected, state: StateName, lang?: string): string[] {
  const { door } = eventsWordsFor(lang);
  const { arrivals, recent, feedback } = doorSummary(input, state, lang);
  const header = [arrivals, door.arrivals, ...(recent ? [recent] : []), ...(feedback ? [feedback] : [])];
  if (state === "error") return header;
  return [
    ...header,
    door.scan,
    door.search,
    ...(input.query.trim() && !input.results.length ? [door.noMatch] : []),
    ...input.results.map(({ id, name, available }) =>
      door.match(id, name, available ? door.checkin : door.admitted),
    ),
  ];
}
