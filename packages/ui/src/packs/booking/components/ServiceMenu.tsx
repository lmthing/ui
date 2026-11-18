import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: List/inset cannot group twelve services with numeric duration and price.
export const meta = {
  id: "ServiceMenu",
  status: "draft",
  group: "content",
  purpose: "Choose a bookable service by duration and price, grouped by offering.",
  pick: "Services to book with numeric duration, price and optional group headings. Not plain things to browse (List), an existing booking (Appointment), or goods for sale (ProductGrid). Several ordinary things each with short details and their own link remain List.",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Services stored on the device by the provider.",
  items: { key: "services", parts: ["root", "name", "minutes", "price", "sub", "group", "photo"] },
  parts: ["root"],
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"] } },
} as const satisfies Meta;
export const props = z.strictObject({
  services: z
    .array(
      z.strictObject({
        name: text(28),
        minutes: z.int().min(5).max(600),
        price: z.number().min(0).optional(),
        sub: text(60).optional(),
        group: text(20).optional(),
        photo: photo.optional(),
        goto: screenId,
      }),
    )
    .min(1)
    .max(12),
  style: z.enum(["rows", "cards"]).default("rows"),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const services = itemsOf(cast, 3).map((item) => ({
    name: titleOf(item, 28, thing) || placeholderTitle(0),
    sub: detailOf(item, 60, thing) || undefined,
    minutes: 30,
    goto: "details",
  }));
  return {
    services: services.length ? services : [{ name: placeholderTitle(0), minutes: 30, goto: "details" }],
  };
}
export const examples = [
  {
    style: "rows",
    services: [
      {
        name: "Plant care visit",
        minutes: 30,
        price: 20,
        group: "Care",
        sub: "Watering and leaf care",
        goto: "time",
      },
      { name: "Repotting visit", minutes: 60, price: 40, group: "Care", goto: "time" },
    ],
  },
  {
    style: "cards",
    services: [
      {
        name: "Morning park walk",
        minutes: 30,
        price: 15,
        sub: "Clover and Pip",
        photo: "lib:dogs",
        goto: "time",
      },
      { name: "Long walk", minutes: 60, price: 25, photo: "lib:dogs", goto: "time" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ServiceMenu");
export const probes = [
  choose("Let clients book one of my services, grouped by type, with minutes and a price for each"),
  choose("Show several plants with short details and a link to open each", "List"),
  write("Offer a 30 minute park walk for 15 and a 60 minute walk for 25, both opening time"),
  read("Book the plant care visit", { address: "s1/r1", action: "press" }),
] satisfies Probe[];
