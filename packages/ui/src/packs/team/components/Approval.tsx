import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Checklist/check records completion, not a manager's approve or decline decision on a request.
export const meta = {
  id: "Approval",
  status: "draft",
  group: "action",
  purpose: "Review staff requests and decide whether to approve or decline them.",
  pick: "A manager decides on submitted staff requests such as time off, swaps and expenses. Not jobs to tick off (Checklist) or a client accepting a quote (Invoice).",
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared app stores requests and tells each requester the decision.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: {
    key: "requests",
    parts: ["root", "from", "photo", "kind", "title", "dates", "amount", "note", "approve", "decline"],
  },
  confirmParts: ["decline"],
  states: ["filled", "empty", "success"],
  actions: { items: { approve: ["press"], decline: ["press"] } },
  read: (input, _state, lang): string[] => {
    const { requests } = input as z.output<typeof props>;
    return requests.map(
      ({ kind, amount }, index) =>
        `r${index + 1} ${kind}${amount === undefined ? "" : ` · ${c.moneyLine(amount, undefined, undefined, lang)}`}`,
    );
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  requests: z
    .array(
      z.strictObject({
        from: c.text(20),
        photo: c.photo,
        kind: z.enum(["time_off", "swap", "expense", "other"]),
        title: c.text(32),
        dates: c.text(24).optional(),
        amount: z.number().min(0).optional(),
        note: c.text(100).optional(),
      }),
    )
    .min(1)
    .max(5),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const request = (from: string, title: string) => ({
    from,
    photo: "lib:people",
    kind: "other" as const,
    title,
  });
  const requests = c.itemsOf(cast, 5).flatMap((item, index) => {
    const from = c.titleOf(item, 20, thing);
    const detail = c.detailOf(item, 32, thing);
    return from ? [request(from, detail ?? c.placeholderTitle(index, lang))] : [];
  });
  return {
    requests: requests.length
      ? requests
      : [request(c.placeholderTitle(0, lang), c.placeholderTitle(1, lang))],
  };
}

export const examples = [
  {
    requests: [
      {
        from: "Anna",
        photo: "lib:people",
        kind: "time_off",
        title: "Friday off",
        dates: "20 Nov",
        note: "Rae can water the ferns.",
      },
      {
        from: "Rae",
        photo: "lib:people",
        kind: "expense",
        title: "Seed trays",
        amount: 24,
        note: "Receipt is in the greenhouse.",
      },
    ],
  },
  {
    density: "compact",
    requests: [
      {
        from: "Sam",
        photo: "lib:people",
        kind: "swap",
        title: "Swap Saturday walks",
        dates: "21 Nov",
        note: "Lee can take the park route.",
      },
      { from: "Lee", photo: "lib:people", kind: "other", title: "Add a spare lead" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Approval");
export const probes = [
  choose(
    "Show submitted time-off, swap and expense requests with the employee's note and an approve or decline button for each.",
  ),
  choose(
    "Give me a simple list of chores I can tick off myself when done, with no requests or decisions.",
    "Checklist",
  ),
  write(
    "Anna (lib:people) requests Friday off on 20 Nov, note Rae can water the ferns. Rae (lib:people) asks for reimbursement of 24 for seed trays.",
  ),
  read("Decline Rae's seed tray expense request", { address: "a1/r2/decline", action: "press" }),
] satisfies c.Probe[];
