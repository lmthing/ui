import { z } from "zod";
import * as c from "../../../catalog";
import { seedDate, seedTitles } from "../seeds";

// Core first: Choice/cards cannot collect an invitation reply, companions, meal and note together.
export const meta = {
  id: "RSVP",
  status: "draft",
  group: "input",
  purpose: "Reply to an event invitation with attendance, companions and a meal choice.",
  pick: "A guest answers one invitation: yes or no, plus-ones, meal, note and send. Not a standalone choice with explanations (Choice), a poll (Poll), booking a time (Slots), or tracking all replies (GuestList).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "The guest sends their reply to the organiser through a shared app or link.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "event", "date", "yes", "no", "plus", "meal", "note", "send"],
  confirmParts: ["no"],
  states: ["filled", "success"],
  actions: {
    parts: {
      yes: ["press"],
      no: ["press"],
      plus: ["set"],
      meal: ["select"],
      note: ["type"],
      send: ["press"],
    },
    when: { plus: { allowsPlus: true }, meal: { allowsMeals: true } },
  },
  selections: { meal: { prop: "selectedMeal", choices: { prop: "meals" }, runtime: true } },
  live: { text: { note: { prop: "note", max: 200 } } },
  read: (input, state): string[] => {
    const { date, answer } = input as z.output<typeof props>;
    return state === "filled" ? [date, answer] : [];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    event: c.text(32),
    date: c.isoDate,
    plusMax: z.int().min(0).max(4),
    meals: z.array(c.text(20)).min(0).max(4),
    answer: z.enum(["none", "yes", "no"]),
  })
  .overwrite((input) => ({
    ...input,
    allowsPlus: input.answer !== "no" && input.plusMax > 0,
    allowsMeals: input.answer !== "no" && input.meals.length > 0,
  }));

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return { event: seedTitles(input, 32, 1)[0]!, date: seedDate, plusMax: 0, meals: [], answer: "none" };
}

export const examples = [
  {
    event: "Ruth and Sam's wedding",
    date: "2027-06-12",
    plusMax: 2,
    meals: ["Lemon chicken", "Roast squash"],
    answer: "none",
  },
  {
    event: "Harbour reunion",
    date: "2027-09-04",
    plusMax: 0,
    meals: [],
    answer: "no",
    density: "compact",
    surface: "outlined",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("RSVP");
export const probes = [
  choose(
    "Let me accept or decline a wedding invitation, say how many companions I'll bring, pick a meal, add a note and send my reply.",
  ),
  choose(
    "Let me choose one of three dinner menus, each with a name and its own short description. No invitation or attendance reply.",
    "Choice",
  ),
  write(
    "Create the invitation reply for Ruth and Sam's wedding on 2027-06-12, no reply yet, at most two companions and a choice of Lemon chicken or Roast squash.",
  ),
  read("Decline the invitation.", { address: "r1/no", action: "press" }),
] satisfies c.Probe[];
