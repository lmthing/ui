import { z } from "zod";
import type { Definition } from "../types";
import { text } from "../../props";

const base = {
  id: "ReportFixture",
  group: "data",
  purpose: "Read host projections.",
  pick: "Use for host projection tests.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Dispatch to the host.",
} as const;
const title = { title: text(30) };
const example = { title: "Quarterly summary" };
export const statement = {
  accounts: [
    { label: "Sales", goto: "sales", internal: "not displayed", id: "injected-id" },
    { label: 12 },
    { label: 'Costs "direct"', goto: "costs" },
  ],
};
export const reportFixture: Definition = {
  meta: {
    ...base,
    items: {
      key: "rows",
      prefix: "a",
      parts: ["root", "label"],
      deviceData: {
        rows: (data) => data.accounts ?? [],
        schema: z.object({ label: text(30), goto: z.string() }),
      },
    },
    actions: { items: { root: ["press"] } },
    deviceData: ["accounts"],
    previewDeviceData: () => statement,
    read: (props) => [`${(props as { rows: unknown[] }).rows.length} lines`],
  },
  props: z.strictObject(title),
  fallback: () => example,
  examples: [example],
  probes: [
    { kind: "read", screen: 0, task: "Open the direct costs.", expect: { address: "r/a2", action: "press" } },
  ],
};

export const opens = Date.UTC(2026, 10, 21, 12);
export const closes = Date.UTC(2026, 10, 21, 13);
export const ballot = { viewer: [{ eligible: true }], window: [{ opens, closes }] };
const eligibility = z.object({ eligible: z.literal(true) });
const window = z.object({ opens: z.number(), closes: z.number() });
const question = { title: "Choose a venue", options: [{ label: "Library" }, { label: "Park" }] };
export const ballotFixture: Definition = {
  meta: {
    ...base,
    id: "BallotFixture",
    items: { key: "options", parts: ["root", "vote"] },
    deviceData: ["viewer", "window"],
    deviceDataFlags: {
      eligibleViewer: (data) => eligibility.safeParse(data.viewer?.[0]).success,
      inWindow: (data, _props, now) => {
        const result = window.safeParse(data.window?.[0]);
        return result.success && result.data.opens <= now && now < result.data.closes;
      },
    },
    deviceDataWake: (data, _props, now) => {
      const result = window.safeParse(data.window?.[0]);
      if (!result.success) return;
      const { opens, closes } = result.data;
      if (now < opens && opens < closes) return opens;
      if (now < closes) return closes;
    },
    previewDeviceData: () => ballot,
    actions: { items: { vote: ["press"] }, when: { "vote.press": { eligibleViewer: true, inWindow: true } } },
  },
  // Deliberately accept colliding row keys to test that a Writer row cannot shadow a trusted flag.
  props: z.strictObject({
    ...title,
    options: z.array(z.strictObject({ label: text(30), eligibleViewer: z.boolean().optional() })),
  }),
  fallback: () => question,
  examples: [question],
  probes: [
    {
      kind: "read",
      screen: 0,
      at: opens,
      task: "Vote for the park.",
      expect: { address: "b/r2/vote", action: "press" },
    },
  ],
};

const service = z.object({ id: z.literal("marketQuotes") });
export const quotes = { services: [{ id: "marketQuotes" }] };
export const refreshFixture: Definition = {
  meta: {
    ...base,
    id: "RefreshFixture",
    deviceData: ["services"],
    deviceDataFlags: {
      refreshAttached: (data) => data.services?.some((row) => service.safeParse(row).success) ?? false,
    },
    previewDeviceData: () => quotes,
    actions: { parts: { refresh: ["press"] }, when: { "refresh.press": { refreshAttached: true } } },
    partTiers: { refresh: "service" },
  },
  props: z.strictObject(title),
  fallback: () => example,
  examples: [example],
  probes: [
    {
      kind: "read",
      screen: 0,
      task: "Refresh the quote.",
      expect: { address: "q/refresh", action: "press" },
    },
  ],
};
