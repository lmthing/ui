import { z } from "zod";
import {
  probesFor,
  clip,
  badgeLine,
  icon,
  placeholderTitle,
  screenId,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitTabBar } from "../kit";

export const meta = {
  id: "TabBar",
  group: "structure",
  purpose: "Move between the app's main sections.",
  pick: "Host-built navigation between main sections. Not views of one screen (Segmented) or quick task shortcuts (Actions).",
  region: "bottom",
  weight: 1,
  tier: "phone",
  realPath: "The host builds linked tabs from sections marked nav and tracks the current screen.",
  codeOwned: true,
  items: { key: "tabs", parts: ["root", "icon", "label", "badge"] },
  select: { prop: "at", value: "index" },
  parts: ["root"],
  states: ["filled"],
  actions: { items: { root: ["select"] } },
  read: (input) =>
    (input as { tabs: { label: string; count?: number }[] }).tabs
      .filter((tab) => Boolean(tab.count))
      .map((tab) => `${tab.label}: ${badgeLine(tab.count!)}`),
} as const satisfies Meta;

export const props = z
  .strictObject({
    tabs: z
      .array(
        z.strictObject({ icon, label: text(12), goto: screenId, count: z.int().min(0).max(9999).optional() }),
      )
      .min(2)
      .max(5),
    at: z.int().min(0).default(0),
  })
  .refine(({ tabs, at }) => at < tabs.length, {
    path: ["at"],
    message: "Must index an available tab",
  });

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const tabs = [0, 1].map((index) => {
    const thing = thingOf({ ...cast, things: cast.things.slice(index) });
    const type = thing?.type.trim();
    const readable = type?.replace(/[_-]+/g, " ").trim();
    const label = readable
      ? clip(readable.charAt(0).toUpperCase() + readable.slice(1), 12)
      : placeholderTitle(index);
    return {
      icon: icon.safeParse(type).data ?? "dot",
      label,
      goto: screenId.safeParse(type).data ?? placeholderTitle(index).toLowerCase().replace(/\s+/g, "_"),
    };
  });
  return { tabs, at: 0 };
}

export const examples = [
  {
    tabs: [
      { icon: "leaf", label: "Plants", goto: "plants" },
      { icon: "calendar", label: "Schedule", goto: "schedule" },
      { icon: "settings", label: "Settings", goto: "settings" },
    ],
    at: 0,
  },
  {
    tabs: [
      { icon: "sun", label: "Today", goto: "today" },
      { icon: "users", label: "Clients", goto: "clients" },
      { icon: "wallet", label: "Earnings", goto: "earnings" },
      { icon: "user", label: "Profile", goto: "profile" },
    ],
    at: 3,
  },
  {
    tabs: [
      { icon: "message", label: "Messages", goto: "messages", count: 3 },
      { icon: "calendar", label: "Schedule", goto: "schedule", count: 120 },
      { icon: "settings", label: "Settings", goto: "settings", count: 0 },
    ],
    at: 0,
  },
] satisfies z.input<typeof props>[];

const { read } = probesFor("TabBar");
export const probes = [
  read("Open the care schedule", { address: "t1/r2", action: "select" }),
  read("Go to my clients", { address: "t1/r2", action: "select" }, 1),
] satisfies Probe[];

export function TabBar({ tabs, at }: Props<typeof props, typeof meta>) {
  return <KitTabBar tabs={tabs} at={at} />;
}
