import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Route/default shows ordered stops, not a live courier, destination and delivery ETA.
export const meta = {
  id: "DeliveryTracker",
  status: "draft",
  group: "data",
  purpose: "Follow a delivery on its way and contact the courier.",
  pick: "Live courier and destination together on a map with delivery ETA and current step. Not order steps without a map (OrderStatus) or a path through planned stops (Route).",
  writeHints: [
    "Write the current step only. Never write an ETA or map positions; the delivery service supplies them.",
    'Use media "none" to hide the courier photo without removing its reference. Leave unrequested axes null.',
  ],
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A delivery service supplies the live courier location and arrival estimate.",
  variants: { density: ["comfortable", "compact"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "map", "eta", "step", "courier", "photo", "call"],
  states: ["filled", "loading", "success"],
  readSuccess: true,
  actions: { parts: { call: ["press"] }, when: { call: { callable: true } } },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    step: z.enum(["preparing", "picked_up", "on_the_way", "nearby", "delivered"]),
    courier: c.text(20).optional(),
    photo: c.photo.optional(),
  })
  .overwrite((value) => ({
    ...value,
    callable: value.courier !== undefined && value.step !== "delivered",
    photo: value.media === "none" ? undefined : value.photo,
  }));

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { step: "preparing" };
}

const potDelivery = { step: "on_the_way", courier: "Nia", photo: "lib:people" } as const;
export const examples = [
  potDelivery,
  { step: "nearby", courier: "Sam", density: "compact" },
  { ...potDelivery, media: "none" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("DeliveryTracker");
export const probes = [
  choose(
    "Show the courier bringing my plant pots on a live map with their ETA, current step, and a call button",
  ),
  choose("Show the planned walk in visiting order from home to the park gate, the pond, then home", "Route"),
  write("Track my pot delivery. Nia picked it up and is on the way. Use lib:people as her photo."),
  {
    ...write("My courier Nia is on the way. Keep her lib:people photo attached but hide it on the tracker."),
    variant: { axis: "media", value: "none" },
  },
  read("Call my courier Nia", { address: "d1/call", action: "press" }),
] satisfies c.Probe[];
