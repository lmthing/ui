import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { approvalAmount, approvalOpen, approvalPortrait, approvalReading, approvalStatus } from "../copy";
import { teamWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Approval.generated";

// Core first: Checklist/check records completion, not a manager's approve or decline decision on a request.
export const meta = {
  id: "Approval",
  status: "ready",
  group: "action",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared app stores requests and tells each requester the decision.",
  variants: {
    lead: ["avatar", "none"],
  },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "message"],
  items: {
    key: "requests",
    // prettier-ignore
    parts: [
      "root", "content", "from", "photo", "kind", "title", "reference", "dates", "amount", "note",
      "approve", "approve_label", "decline", "decline_label", "status",
    ],
  },
  confirmParts: ["decline"],
  states: ["filled", "empty", "success"],
  actions: {
    items: { approve: ["press"], decline: ["press"] },
    when: { approve: { style: "queue", open: true }, decline: { style: "queue", open: true } },
  },
  readSuccess: true,
  read: (input, state, lang): string[] =>
    approvalReading(input as z.output<typeof props>, lang, state === "filled"),
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  style: z.enum(["queue", "my_requests"]).default("queue"),
  requests: z
    .array(
      z
        .strictObject({
          from: c.text(20),
          photo: c.photo,
          kind: z.enum(["time_off", "swap", "expense", "other", "shift_claim"]),
          title: c.text(32),
          reference: c.text(24).optional(),
          dates: c.text(24).optional(),
          amount: z.number().min(0).optional(),
          note: c.text(100).optional(),
          status: z.enum(["pending", "approved", "declined"]).optional().meta({ kind: undefined }),
        })
        .transform((request) => ({ ...request, open: approvalOpen(request.status) })),
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
  const placeholder = request(c.placeholderTitle(0, lang), c.placeholderTitle(1, lang));
  return { requests: requests.length ? requests : [placeholder] };
}

export const examples = [
  {
    requests: [
      {
        from: "Anna",
        photo: "lib:people",
        kind: "time_off",
        title: "Friday off",
        reference: "LV-104",
        dates: "20 Nov",
        note: "Rae can water the ferns.",
      },
      {
        from: "Rae",
        photo: "lib:people",
        kind: "expense",
        title: "Seed trays",
        reference: "EXP-117",
        amount: 24,
        note: "Receipt is in the greenhouse.",
      },
    ],
  },
  {
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
  {
    style: "my_requests",
    requests: [
      {
        from: "Anna",
        photo: "lib:people",
        kind: "shift_claim",
        title: "Friday greenhouse shift",
        dates: "20 Nov",
        status: "pending",
      },
      {
        from: "Anna",
        photo: "lib:people",
        kind: "time_off",
        title: "Friday off",
        reference: "LV-104",
        dates: "20 Nov",
        note: "Rae can water the ferns.",
        status: "approved",
      },
    ],
  },
  {
    lead: "none",
    requests: [
      {
        from: "Rae",
        photo: "lib:people",
        kind: "expense",
        title: "Seed trays",
        reference: "EXP-117",
        amount: 24,
        note: "Receipt is in the greenhouse.",
        status: "approved",
      },
      { from: "Anna", photo: "lib:people", kind: "other", title: "New watering can", status: "declined" },
      { from: "Lee", photo: "lib:people", kind: "expense", title: "Potting soil", status: "pending" },
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
  {
    ...write(
      "Show Sam's request to swap Saturday walks on 21 Nov with approve and decline buttons. Save Sam's lib:people photo reference but hide the portrait. Leave spacing and card treatment to the app; only change whether the portrait is visible.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Decline Rae's seed tray expense request", { address: "a1/r2/decline", action: "press" }),
  {
    ...write(
      "In the manager's approval queue, Anna (photo lib:people) asks to take an open greenhouse shift nobody has. Title it Friday greenhouse shift, dated 20 Nov. This is a claim, not a swap.",
    ),
    expectProps: { requests: [{ kind: "shift_claim" }] },
  },
  {
    ...write(
      "Let me track the requests I submitted myself, with no decision buttons. I'm Anna (photo lib:people), and my request for Monday off was approved.",
    ),
    expectProps: { style: "my_requests", requests: [{ status: "approved" }] },
  },
] satisfies c.Probe[];

type ApprovalProps = c.Props<typeof props, typeof meta>;
type RequestProps = Pick<ApprovalProps, "lead" | "style"> & {
  surface: c.SurfaceFinish;
  row: ApprovalProps["requests"][number];
  density: c.ThemeDensity;
};

function ApprovalRow({ row, lead, surface, density, style }: RequestProps) {
  const state = kit.useComponentState();
  const { words, lang } = kit.useWords(teamWordsFor);
  const { approve, decline, kinds } = words.approval;
  const amount = approvalAmount(row.amount, lang);
  const status = approvalStatus(row.status, words.approval);
  const portrait =
    lead === "avatar" ? (
      <kit.KitPhoto part="photo" {...approvalPortrait(row.from, row.photo)} label={row.from} shape="round" />
    ) : undefined;
  return (
    <kit.KitRow
      item={row.id}
      part="root"
      label={row.title}
      inset="none"
      inline
      density={density}
      surface={surface}
    >
      <kit.KitCard part="content" style="plain" padded density={density}>
        <kit.KitContent lead={portrait} leadingAlign="row" density={density}>
          <kit.KitMetaLine
            title={{ text: row.title, part: "title", role: "body", strong: true }}
            meta={[
              { text: row.from, part: "from" },
              { text: kinds[row.kind], part: "kind" },
              { text: row.reference, part: "reference", breakLongWords: true },
            ]}
            density={density}
          />
        </kit.KitContent>
        <kit.KitMetaLine
          title={{ text: row.note, part: "note", role: "body", tone: "muted" }}
          meta={[
            { text: row.dates, part: "dates" },
            { text: amount, part: "amount", role: "figure", compact: true, tabular: true, tone: "text" },
          ]}
          density={density}
        />
        <kit.KitTrail
          kind="badge"
          inline
          part="status"
          value={status.label}
          tone={status.tone}
          {...{ density }}
        />
        {state === "filled" && style === "queue" && row.open && (
          <kit.KitActionFooter density={density}>
            <kit.KitGrid density={density}>
              <kit.KitAction part="approve" label={approve} kind="secondary" full />
              <kit.KitAction part="decline" label={decline} kind="quiet" tone="bad" full />
            </kit.KitGrid>
          </kit.KitActionFooter>
        )}
      </kit.KitCard>
    </kit.KitRow>
  );
}

export function Approval(input: ApprovalProps) {
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const { words } = kit.useWords(teamWordsFor);
  const density = kit.useKit().density;
  const lead = kit.useVariant("lead", meta.variants.lead, input.lead);
  const surface = "card";
  const empty = state === "empty";
  return (
    <kit.KitCard part="root" style={empty ? "inset" : "cards"} density={density} surface={surface}>
      {empty ? (
        <kit.KitState
          part="message"
          icon="clipboard_list"
          message={
            thing
              ? undefined
              : input.style === "my_requests"
                ? words.approval.empty
                : words.approval.queueEmpty
          }
          density={density}
        />
      ) : (
        <kit.KitRowGroup separators={false} spacing="groups" density={density}>
          {input.requests.map((row) => (
            <ApprovalRow key={row.id} {...{ row, lead, density, surface }} style={input.style} />
          ))}
        </kit.KitRowGroup>
      )}
    </kit.KitCard>
  );
}
