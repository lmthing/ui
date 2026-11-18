import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  isoDate,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Profile/row cannot show client tenure, next business visit and contact actions together.
export const meta = {
  id: "ClientCard",
  status: "draft",
  group: "content",
  purpose: "Recognise one business client, their next visit and how to contact them.",
  pick: "One business client's page head with tenure, next booking or order, tags and contact actions. Not another kind of identity (Profile), multiple clients as tappable rows (List), or plain labelled phone and address details without contact buttons (KeyValue). All clients with a photo and last-visit detail on each row remain List, never this one-client page head.",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A client record on the device; calling and messaging use the phone's own apps.",
  parts: ["root", "photo", "name", "since", "next", "tags", "call", "message", "directions"],
  partTiers: { call: "service", message: "service", directions: "service" },
  states: ["filled", "loading"],
  actions: {
    parts: { call: ["press"], message: ["press"], directions: ["press"] },
    when: { call: { phone: true }, directions: { address: true } },
  },
} as const satisfies Meta;
export const props = z.strictObject({
  name: text(28),
  photo,
  since: isoDate.optional(),
  next: text(36).optional(),
  tags: z.array(text(12)).min(0).max(3),
  phone: z.boolean(),
  address: z.boolean(),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const item = itemsOf(cast, 1)[0],
    thing = thingOf(cast);
  return {
    name: (item && titleOf(item, 28, thing)) || placeholderTitle(0),
    photo: "local:1",
    next: (item && detailOf(item, 36, thing)) || undefined,
    tags: [],
    phone: false,
    address: false,
  };
}
export const examples = [
  {
    name: "Anna Patel",
    photo: "lib:people",
    since: "2025-04-03",
    next: "Plant care · Friday 09:00",
    tags: ["Regular", "Key holder"],
    phone: true,
    address: true,
  },
  {
    name: "Ben Carter",
    photo: "lib:people",
    next: "Clover and Pip · Monday 10:00",
    tags: ["New"],
    phone: false,
    address: false,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ClientCard");
export const probes = [
  choose("At the top of a client's page, show their photo, when they joined, next visit and contact buttons"),
  choose("Show my own identity with a photo, name, short bio and an edit button", "Profile"),
  write(
    "Client Ben Carter, photo lib:people, joined 2025-04-03, next park walk Monday 10:00, tag Regular, allow calls and directions",
  ),
  read("Call Anna", { address: "c1/call", action: "press" }),
] satisfies Probe[];
