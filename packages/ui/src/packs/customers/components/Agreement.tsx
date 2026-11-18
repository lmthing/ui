import { z } from "zod";
import {
  detailOf,
  isoDate,
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Checklist/default cannot capture one client's consent with terms, typed name and signed date.
export const meta = {
  id: "Agreement",
  status: "draft",
  group: "input",
  purpose: "Keep a client's acceptance of terms with their typed name and signing date.",
  pick: "A waiver, consent or terms signed once by a client. Not jobs to tick (Checklist) or a long read without consent (Article).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "A signed copy kept with the client record on the business's phone; signing remotely needs a shared app.",
  parts: ["root", "title", "terms", "agree", "name", "date"],
  states: ["filled", "success"],
  actions: {
    parts: { agree: ["check"], name: ["type"] },
    when: { agree: { signed: false }, name: { signed: false } },
  },
} as const satisfies Meta;
export const props = z.strictObject({
  title: text(32),
  terms: text(600),
  signed: z.boolean(),
  name: text(28).optional(),
  date: isoDate.optional(),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    title: (item && titleOf(item, 32, thing)) || placeholderTitle(0),
    terms: (item && detailOf(item, 600, thing)) || placeholderDetail,
    signed: false,
  };
}
export const examples = [
  {
    title: "Plant care access consent",
    terms: "I allow the carer to enter for booked plant care visits and keep the spare key securely.",
    signed: false,
  },
  {
    title: "Key-holding consent",
    terms: "I allow Trot to hold my spare key for booked walks. Return it when our agreement ends.",
    signed: true,
    name: "Ben Carter",
    date: "2026-11-18",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Agreement");
export const probes = [
  choose("Show the client's waiver terms, an agreement tick, their typed name and the date they signed"),
  choose("Tick off the three jobs I need to do before leaving home", "Checklist"),
  write("Unsigned Key-holding consent: I allow Trot to keep my spare key for booked walks. Name Ben Carter"),
  read("Accept these access terms", { address: "a1/agree", action: "check" }),
  read("Type the client's name", { address: "a1/name", action: "type" }),
] satisfies Probe[];
