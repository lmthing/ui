import { z } from "zod";
import {
  clip,
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

// Core first: Card[plain] with a badge cannot separate wins and blockers or link independently to a milestone and a check-in form.
export const meta = {
  id: "ProjectStatus",
  status: "draft",
  group: "content",
  tier: "phone",
  pick: "reporting periodic project health, wins, and blockers over time. Not gated deliverable dates (Milestones), generic cards (Card), or shift handovers (team Handover).",
  purpose:
    "A periodic project health check-in card showing RAG status (on_track, at_risk, blocked), a short headline summary.",
  region: "body",
  weight: 2,
  realPath:
    "periodic health check-ins saved locally with the project; sharing updates with collaborators uses a shared app (people).",
  parts: ["root", "milestone", "update"],
  actions: { parts: { milestone: ["press"], update: ["press"] } },
  states: ["filled", "empty", "loading"],
} as const satisfies Meta;
export const props = z.strictObject({
  projectRef: text(32),
  status: z.enum(["on_track", "at_risk", "blocked"]).default("on_track"),
  headline: text(80),
  author: text(24).optional(),
  updatedAt: isoDate,
  wins: z.array(text(80)).min(0).max(3),
  blockers: z.array(text(80)).min(0).max(3),
  nextMilestone: z.strictObject({ title: text(32), due: isoDate, goto: screenId.optional() }).optional(),
  postGoto: screenId.optional(),
  style: z.enum(["update", "compact"]).default("update"),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    projectRef: castTitle(32, 0),
    headline: castTitle(80, 0),
    updatedAt: "2000-01-01",
    wins: Array.from({ length: 0 }, (_, index) => castTitle(80, index)),
    blockers: Array.from({ length: 0 }, (_, index) => castTitle(80, index)),
  };
}

// TODO: Replace the neutral seed with two real examples covering styles and optional fields.
export const examples = [fallback({ cast: { things: [], items: [] } })] satisfies z.input<typeof props>[];

// TODO: Replace the probe prompts and verify the fixture address and any action gates.
const { choose, write, read } = probesFor("ProjectStatus");
export const probes = [
  choose("TODO: describe the need this component should win"),
  choose(
    "Feature one project with a short description and a badge, and tap anywhere on the card to open it.",
    "Card",
  ),
  write("TODO: describe realistic values and intent in the person’s words"),
  read("TODO: ask for this action in the person’s words", { address: "c1/milestone", action: "press" }),
] satisfies Probe[];

export function ProjectStatus(_input: Props<typeof props, typeof meta>) {
  return null;
}
