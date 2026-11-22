import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { approvalAmount, approvalPortrait, approvalReading } from "../copy";
import { teamWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Approval.generated";

// Core first: Checklist/check records completion, not a manager's approve or decline decision on a request.
export const meta = {
  id: "Approval",
  status: "ready",
  group: "action",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "people",
  realPath: "A shared app stores requests and tells each requester the decision.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    lead: ["avatar", "none"],
  },
  variantParts: { "lead.none": { hides: ["photo"] } },
  parts: ["root", "message"],
  items: {
    key: "requests",
    // prettier-ignore
    parts: [
      "root", "content", "from", "photo", "kind", "title", "dates", "amount", "note",
      "approve", "approve_label", "decline", "decline_label",
    ],
  },
  confirmParts: ["decline"],
  states: ["filled", "empty", "success"],
  actions: { items: { approve: ["press"], decline: ["press"] } },
  read: (input, state, lang): string[] =>
    state === "filled" ? approvalReading(input as z.output<typeof props>, lang) : [],
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
  const placeholder = request(c.placeholderTitle(0, lang), c.placeholderTitle(1, lang));
  return { requests: requests.length ? requests : [placeholder] };
}

// prettier-ignore
export const examples = [
  {
    requests: [
      { from: "Anna", photo: "lib:people", kind: "time_off", title: "Friday off",
        dates: "20 Nov", note: "Rae can water the ferns." },
      { from: "Rae", photo: "lib:people", kind: "expense", title: "Seed trays",
        amount: 24, note: "Receipt is in the greenhouse." },
    ],
  },
  {
    requests: [
      { from: "Sam", photo: "lib:people", kind: "swap", title: "Swap Saturday walks",
        dates: "21 Nov", note: "Lee can take the park route." },
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
  {
    ...write(
      "Show Sam's request to swap Saturday walks on 21 Nov with approve and decline buttons. Save Sam's lib:people photo reference but hide the portrait. Leave spacing and card treatment to the app; only change whether the portrait is visible.",
    ),
    variant: { axis: "lead", value: "none" },
  },
  read("Decline Rae's seed tray expense request", { address: "a1/r2/decline", action: "press" }),
] satisfies c.Probe[];

type ApprovalProps = c.Props<typeof props, typeof meta>;
type RequestProps = Pick<ApprovalProps, "lead" | "surface"> & {
  row: ApprovalProps["requests"][number];
  density: c.ThemeDensity;
};

// prettier-ignore
function ApprovalRow({ row, lead, surface, density }: RequestProps) {
  const { words, lang } = kit.useWords(teamWordsFor);
  const { approve, decline, kinds } = words.approval;
  const amount = approvalAmount(row.amount, lang);
  const portrait =
    lead === "avatar" ? (
      <kit.KitPhoto part="photo" {...approvalPortrait(row.from, row.photo)} label={row.from} shape="round" />
    ) : undefined;
  return (
    <kit.KitRow item={row.id} part="root" label={row.title} inline density={density} surface={surface}>
      <kit.KitCard part="content" style="plain" padded density={density}>
        <kit.KitContent lead={portrait} leadingAlign="row" density={density}>
          <kit.KitText part="title" role="heading" density="comfortable">{row.title}</kit.KitText>
          <kit.KitText part={null} role="label" tone="muted" density={density}>
            <kit.KitText part="from" role="label" tone="muted" density={density}>{row.from}</kit.KitText>
            {"\n"}
            <kit.KitText part="kind" role="label" tone="muted" density={density}>{kinds[row.kind]}</kit.KitText>
          </kit.KitText>
        </kit.KitContent>
        {(row.dates !== undefined || amount !== undefined || row.note !== undefined) && (
          <kit.KitContent group="response" density={density}>
            {row.dates !== undefined && <kit.KitText part="dates" role="label" density={density}>{row.dates}</kit.KitText>}
            {amount !== undefined && (
              <kit.KitText part="amount" role="number" numberScale="compact" tabular density={density}>
                {amount}
              </kit.KitText>
            )}
            {row.note !== undefined && <kit.KitText part="note" role="body" tone="muted" density={density}>{row.note}</kit.KitText>}
          </kit.KitContent>
        )}
        <kit.KitGrid density={density}>
          <kit.KitAction part="approve" label={approve} kind="secondary" full />
          <kit.KitAction part="decline" label={decline} kind="quiet" full />
        </kit.KitGrid>
      </kit.KitCard>
    </kit.KitRow>
  );
}

export function Approval(input: ApprovalProps) {
  const state = kit.useComponentState();
  const { words } = kit.useWords(teamWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const lead = kit.useVariant("lead", meta.variants.lead, input.lead);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const filled = state === "filled";
  const success = state === "success";
  return (
    <kit.KitCard part="root" style={filled ? "cards" : "inset"} density={density} surface={surface}>
      {filled ? (
        <kit.KitGrid arrange="rows" list listRowGap="cards" density={density}>
          {input.requests.map((row) => (
            <ApprovalRow key={row.id} {...{ row, lead, density, surface }} />
          ))}
        </kit.KitGrid>
      ) : (
        <kit.KitEmpty
          icon={success ? "check" : "clipboard_list"}
          part="message"
          {...(success ? { title: words.approval.success } : {})}
          tone={success ? "good" : "neutral"}
          decorativeIcon
        />
      )}
    </kit.KitCard>
  );
}
