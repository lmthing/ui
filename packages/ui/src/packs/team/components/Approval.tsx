import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { approvalAmount, approvalOpen, approvalPortrait, approvalReading } from "../copy";
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
  parts: [
    "root",
    "message",
    "evidence",
    "total",
    "line_items",
    "reason_label",
    "reason",
    "accept",
    "reject",
    "decision_state",
    "decision_reason",
  ],
  items: {
    key: "requests",
    // prettier-ignore
    parts: [
      "root", "content", "from", "photo", "kind", "title", "dates", "amount", "note",
      "approve", "approve_label", "decline", "decline_label", "status",
    ],
  },
  confirmParts: ["decline", "reject"],
  states: ["filled", "empty", "success"],
  readInState: (_input, state) => state === "success",
  actions: {
    parts: { reason: ["type"], accept: ["press"], reject: ["press"] },
    items: { approve: ["press"], decline: ["press"] },
    when: {
      approve: { style: "queue", open: true },
      decline: { style: "queue", open: true },
      reason: { reviewOpen: true },
      accept: { reviewOpen: true },
      reject: { reviewOpen: true, hasReason: true },
    },
  },
  live: {
    text: { reason: { prop: "draftReason", max: 120 } },
    derive: (value) => ({
      hasReason: typeof value.draftReason === "string" && value.draftReason.trim().length > 0,
    }),
  },
  hostCommands: {
    identity: ({ props, row }) =>
      row ? undefined : (props.review as { reference?: string } | undefined)?.reference,
    parts: {
      "accept.press": reviewRequest("approval.accept"),
      "reject.press": reviewRequest("approval.reject"),
    },
    settle: ["accept.press", "reject.press", "reason.type"],
    readFields: ["reason"],
  },
  read: (input, state, lang): string[] =>
    state === "filled"
      ? readApproval(input as z.output<typeof props>, lang)
      : state === "success"
        ? [approvalOutcome((input as z.output<typeof props>).requests, lang)]
        : [],
} as const satisfies c.Meta;

const reviewSheet = z.strictObject({
  reference: c.text(24),
  evidence: c.text(180),
  lines: z
    .array(z.strictObject({ label: c.text(48), amount: z.number().min(0).max(999999) }))
    .min(1)
    .max(6),
  total: z.number().min(0).max(5999994),
  reason: c.text(120).optional(),
});

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    style: z.enum(["queue", "my_requests", "review"]).default("queue"),
    review: reviewSheet.optional(),
    requests: z
      .array(
        z
          .strictObject({
            from: c.text(20),
            photo: c.photo,
            kind: z.enum(["time_off", "swap", "expense", "other", "shift_claim"]),
            title: c.text(32),
            dates: c.text(24).optional(),
            amount: z.number().min(0).optional(),
            note: c.text(100).optional(),
            status: z.enum(["pending", "approved", "declined"]).optional().meta({ kind: undefined }),
          })
          .transform((request) => ({ ...request, open: approvalOpen(request.status) })),
      )
      .min(1)
      .max(5),
  })
  .refine(
    ({ style, review, requests }) =>
      style === "review"
        ? Boolean(review && requests.length === 1 && (!review.reason || !approvalOpen(requests[0]?.status)))
        : !review,
    {
      path: ["review"],
      message: "Review needs evidence and a single request; a recorded reason belongs to a settled decision",
    },
  )
  .overwrite((value) => ({
    ...value,
    reviewOpen: value.style === "review" && approvalOpen(value.requests[0]?.status),
  }));

function reviewRequest(name: "approval.accept" | "approval.reject") {
  return {
    kind: "command",
    name,
    ...(name === "approval.reject" && { confirmation: reviewConfirmation }),
    input: ({ props }: { props: Readonly<Record<string, unknown>> }) => {
      const review = props.review as z.output<typeof reviewSheet>;
      const reason = typeof props.draftReason === "string" ? props.draftReason.trim() : "";
      return { reference: review.reference, ...(reason && { reason }) };
    },
  } as const;
}

function reviewConfirmation({ input }: { input: Readonly<Record<string, unknown>> }, lang?: string) {
  if (typeof input.reference !== "string") return;
  const { review } = teamWordsFor(lang).approval;
  return { message: review.confirmDecline(input.reference), label: review.declineRequest };
}

function readApproval(input: z.output<typeof props>, lang?: string) {
  if (!input.review) return approvalReading(input, lang);
  const { review } = input;
  const { statuses, review: copy, approve, decline, awaitingDecision, kinds } = teamWordsFor(lang).approval;
  const status = input.requests[0]?.status ?? "pending";
  return [
    review.reference,
    review.evidence,
    kinds[input.requests[0]!.kind],
    ...review.lines.map((line) => `${line.label} · ${approvalAmount(line.amount, lang)}`),
    copy.total(approvalAmount(review.total, lang)!),
    ...(status === "pending" ? [awaitingDecision, copy.reason, approve, decline] : [statuses[status]]),
    ...(review.reason ? [review.reason] : []),
  ];
}

function approvalOutcome(requests: z.output<typeof props>["requests"], lang?: string) {
  const { statuses, review } = teamWordsFor(lang).approval;
  const settled = requests.find(({ status }) => !approvalOpen(status));
  if (settled && (settled.status === "approved" || settled.status === "declined"))
    return `${settled.title}: ${statuses[settled.status]}`;
  return review.unavailable;
}

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
      { from: "Anna", photo: "lib:people", kind: "time_off", title: "Monday off", status: "approved" },
    ],
  },
  {
    lead: "none",
    requests: [
      { from: "Rae", photo: "lib:people", kind: "expense", title: "Seed trays", status: "approved" },
      { from: "Anna", photo: "lib:people", kind: "other", title: "New watering can", status: "declined" },
      { from: "Lee", photo: "lib:people", kind: "expense", title: "Potting soil", status: "pending" },
    ],
  },
  {
    style: "review",
    requests: [{ from: "Rae", photo: "lib:people", kind: "other", title: "Restore irrigation bench" }],
    review: {
      reference: "GH-142",
      evidence: "Inspection found two cracked connectors and a leak at the bench valve.",
      lines: [
        { label: "Two hose connectors", amount: 32 },
        { label: "Replace and pressure-test valve", amount: 48 },
      ],
      total: 80,
    },
  },
  {
    style: "review",
    lead: "none",
    requests: [
      { from: "Sam", photo: "lib:people", kind: "other", title: "Meadow gate repair", status: "declined" },
    ],
    review: {
      reference: "WK-515",
      evidence: "Gate closes but the latch slips under light pressure.",
      lines: [{ label: "Fit new latch", amount: 38 }],
      total: 38,
      reason: "Wait for the park team to confirm Monday’s gate replacement.",
    },
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
  choose(
    "I need to review one repair estimate. Show inspection evidence, each priced line and the total, then let me approve it or decline with a reason.",
  ),
  {
    ...write(
      "Review one estimate for Rae, photo lib:people, Restore irrigation bench, GH-142. Evidence: two cracked connectors. Two hose connectors cost 32 and valve service costs 48. Total 80; I haven't decided.",
    ),
    expectProps: { style: "review", review: { reference: "GH-142", total: 80 } },
  },
] satisfies c.Probe[];

type ApprovalProps = c.Props<typeof props, typeof meta>;
type RequestProps = Pick<ApprovalProps, "lead" | "style"> & {
  surface: c.SurfaceFinish;
  row: ApprovalProps["requests"][number];
  density: c.ThemeDensity;
};

function ApprovalRow({ row, lead, surface, density, style }: RequestProps) {
  const { words, lang } = kit.useWords(teamWordsFor);
  const { approve, decline, kinds, statuses, awaitingDecision } = words.approval;
  const amount = approvalAmount(row.amount, lang);
  const status = row.status ?? "pending";
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
        {style === "my_requests" || !row.open ? (
          <kit.KitLayoutText
            line={{
              part: "status",
              text: status === "pending" ? awaitingDecision : statuses[status],
              role: "meta",
              tone: status === "approved" ? "good" : status === "declined" ? "bad" : "muted",
            }}
            density={density}
          />
        ) : (
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
  if (input.review && state === "filled") return <DecisionReview {...input} review={input.review} />;
  if (state === "success") return <ReviewOutcome requests={input.requests} />;
  return (
    <kit.KitCard
      part="root"
      style={state === "filled" ? "cards" : "inset"}
      density={density}
      surface={surface}
    >
      <kit.KitState
        part="message"
        icon="clipboard_list"
        message={
          thing ? undefined : input.style === "my_requests" ? words.approval.empty : words.approval.queueEmpty
        }
        density={density}
      >
        <kit.KitRowGroup separators={false} spacing="groups" density={density}>
          {input.requests.map((row) => (
            <ApprovalRow key={row.id} {...{ row, lead, density, surface }} style={input.style} />
          ))}
        </kit.KitRowGroup>
      </kit.KitState>
    </kit.KitCard>
  );
}

function ReviewOutcome({ requests }: Pick<ApprovalProps, "requests">) {
  const { lang } = kit.useWords(teamWordsFor);
  const settled = requests.find(({ status }) => !approvalOpen(status))?.status;
  return (
    <kit.KitCard style="inset" part="root" surface="card">
      <kit.KitEmpty
        part="message"
        title={approvalOutcome(requests, lang)}
        icon={settled === "approved" ? "check" : settled === "declined" ? "close" : "info"}
        tone={settled === "approved" ? "good" : "neutral"}
        announce="status"
        prominence="body"
        decorativeIcon
      />
    </kit.KitCard>
  );
}

type DecisionProps = ApprovalProps & { review: z.output<typeof reviewSheet> };
function DecisionReview(input: DecisionProps) {
  const { lang, words } = kit.useWords(teamWordsFor);
  const { review, requests } = input;
  const canDecline = kit.useLiveControls(meta, input).hasReason === true;
  const row = requests[0]!;
  const [operation] = kit.useHostOperations();
  const decision =
    operation?.status === "accepted"
      ? operation.name === "approval.accept"
        ? "approved"
        : "declined"
      : row.status;
  return (
    <kit.KitCard part="root" style="inset" padded>
      <kit.KitLayoutText line={{ text: review.reference, part: "message", role: "meta", tone: "muted" }} />
      <kit.KitRow item={row.id} label={row.title} inline inset="none">
        <kit.KitText part="title" role="heading">
          {row.title}
        </kit.KitText>
        <kit.KitText part="from" role="caption">
          {row.from}
        </kit.KitText>
        <kit.KitText part="kind" role="caption">
          {words.approval.kinds[row.kind]}
        </kit.KitText>
        {row.note && <kit.KitText part="note">{row.note}</kit.KitText>}
        {row.dates && (
          <kit.KitText part="dates" role="caption">
            {row.dates}
          </kit.KitText>
        )}
        {row.amount !== undefined && (
          <kit.KitText part="amount" role="caption">
            {approvalAmount(row.amount, lang)}
          </kit.KitText>
        )}
      </kit.KitRow>
      <DecisionStatus decision={decision} phase={operation?.status} />
      <kit.KitText part="evidence">{review.evidence}</kit.KitText>
      <ReviewLines review={review} />
      <ReviewAmount
        label={words.approval.review.totalLabel}
        amount={approvalAmount(review.total, lang)!}
        part="total"
      />
      <DecisionControls {...{ decision, operation, canDecline }} recordedReason={review.reason} />
    </kit.KitCard>
  );
}

function DecisionStatus({
  decision,
  phase,
}: {
  decision: ApprovalProps["requests"][number]["status"];
  phase: c.HostOperation["status"] | undefined;
}) {
  const { approval } = kit.useWords(teamWordsFor).words;
  const settled = decision === "approved" || decision === "declined";
  const text = settled
    ? approval.statuses[decision]
    : phase === "pending"
      ? approval.review.pending
      : phase === "rejected"
        ? approval.review.failed
        : approval.awaitingDecision;
  return (
    <kit.KitText
      announce="status"
      part="decision_state"
      role="label"
      tone={
        decision === "approved" ? "good" : decision === "declined" || phase === "rejected" ? "bad" : "muted"
      }
    >
      {text}
    </kit.KitText>
  );
}

function ReviewLines({ review }: { review: DecisionProps["review"] }) {
  const { lang } = kit.useWords(teamWordsFor);
  return (
    <kit.KitCard part="line_items" style="plain">
      <kit.KitRowGroup separators={false} density="compact">
        {review.lines.map(({ label, amount }, index) => (
          <ReviewAmount label={label} amount={approvalAmount(amount, lang)!} key={index} />
        ))}
      </kit.KitRowGroup>
    </kit.KitCard>
  );
}

function ReviewAmount({
  label,
  amount,
  part = null,
}: {
  label: string;
  amount: string;
  part?: "total" | null;
}) {
  const role = part ? "label" : "body";
  return (
    <kit.KitRow
      {...{ part, label }}
      inline
      fitContent
      trailing={
        <kit.KitText part={null} role={role} tabular>
          {amount}
        </kit.KitText>
      }
    >
      <kit.KitText part={null} role={role}>
        {label}
      </kit.KitText>
    </kit.KitRow>
  );
}

function DecisionControls({
  decision,
  operation,
  recordedReason,
  canDecline,
}: {
  decision: ApprovalProps["requests"][number]["status"];
  operation: c.HostOperation | undefined;
  recordedReason: string | undefined;
  canDecline: boolean;
}) {
  const { words } = kit.useWords(teamWordsFor);
  const copy = words.approval;
  const phase = operation?.status;
  const hostReason = operation?.records?.[0]?.reason;
  const reason = recordedReason ?? (typeof hostReason === "string" ? hostReason : undefined);
  if (decision && decision !== "pending")
    return reason ? <kit.KitText part="decision_reason">{reason}</kit.KitText> : null;
  return (
    <>
      <kit.KitText part="reason_label" role="label">
        {copy.review.reason}
      </kit.KitText>
      <kit.KitInput
        part="reason"
        label={copy.review.reason}
        hint=""
        kind="text"
        max={120}
        visibleBoundary
        disabled={phase === "pending"}
      />
      <kit.KitGrid>
        <kit.KitAction
          part="accept"
          label={copy.approve}
          contentParts={{}}
          full
          disabled={phase === "pending"}
        />
        <kit.KitAction
          part="reject"
          label={copy.decline}
          tone="bad"
          kind="quiet"
          contentParts={{}}
          full
          disabled={!canDecline || phase === "pending"}
        />
      </kit.KitGrid>
    </>
  );
}
