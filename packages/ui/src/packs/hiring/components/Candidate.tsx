import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { candidateCopy, candidateReading } from "../copy";
import { hiringWordsFor } from "../lang";
import { activeStages, outcomes, seedApplicationId, seedDate, seedGoto, seedJobId, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-Candidate.generated";

const findings = ["unreviewed", "needs_evidence", "meets", "gap"] as const;
const { findings: findingLabels } = hiringWordsFor().candidate;
// Core first: Profile/card identifies a person but cannot capture criterion-by-criterion application evidence.
export const meta = {
  id: "Candidate",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "A human records application evidence and decisions on the phone without sending a message or creating a staff record.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["evidence"] } },
  // prettier-ignore
  parts: ["root", "name", "photo", "role", "applied", "stage", "outcome", "interview", "interview_label",
    "offer", "offer_label", "hire", "hire_label", "reject", "reject_label", "withdraw", "withdraw_label",
    "success", "error"],
  items: {
    key: "criteria",
    parts: ["root", "label", "finding", "evidence"],
    // prettier-ignore
    edits: {
      finding: { action: "select", prop: "finding", choices: findings.map((value) => ({ value, label: findingLabels[value] })) },
      evidence: { action: "type", prop: "evidence", max: 80, empty: "unset" },
    },
  },
  confirmParts: ["reject", "withdraw"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    // prettier-ignore
    parts: { interview: ["press"], offer: ["press"], hire: ["press"], reject: ["press"], withdraw: ["press"] },
    items: { finding: ["select"], evidence: ["type"] },
    // prettier-ignore
    when: { hire: { outcome: "active" }, reject: { outcome: "active" }, withdraw: { outcome: "active" },
      evidence: { detail: "full" } },
  },
  live: {
    // prettier-ignore
    derive: (input): c.Values => ({
      interview: { goto: input.interviewGoto },
      offer: { goto: input.offerGoto },
      ...(input.detail === "brief" ? { criteria: (input.criteria as z.output<typeof props>["criteria"])
        .map((row) => ({ ...row, evidence: undefined })) } : {}),
    }),
  },
  read: (input, state, lang): string[] =>
    state === "filled" ? candidateReading(input as z.output<typeof props>, lang) : [],
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  applicationId: c.text(32).meta({ kind: "id" }), jobId: c.text(32).meta({ kind: "id" }),
  name: c.text(24), photo: c.photo.optional(), role: c.text(32), applied: c.isoDate,
  stage: z.enum(activeStages), outcome: z.enum(outcomes),
  criteria: z.array(z.strictObject({
    label: c.text(32), finding: z.enum(findings).default("unreviewed"), evidence: c.text(80).optional(),
  })).min(1).max(6),
  interviewGoto: c.screenId, offerGoto: c.screenId,
});

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    applicationId: seedApplicationId,
    jobId: seedJobId,
    name: row!.title(24),
    role: row!.detail(32),
    applied: seedDate,
    stage: "applied",
    outcome: "active",
    criteria: [{ label: c.placeholderLabel, finding: "unreviewed" }],
    interviewGoto: seedGoto,
    offerGoto: seedGoto,
  };
}

export const examples = [
  {
    applicationId: "sam",
    jobId: "walker",
    name: "Sam Patel",
    photo: "lib:people",
    role: "Summer dog walker",
    applied: "2027-04-06",
    stage: "interview",
    outcome: "active",
    criteria: [
      { label: "Group handling", finding: "meets", evidence: "Led groups of four at Green Lane Rescue." },
      { label: "Weekday mornings", finding: "needs_evidence" },
    ],
    interviewGoto: "sam_interview",
    offerGoto: "sam_offer",
  },
  {
    applicationId: "mara",
    jobId: "baker",
    name: "Mara Kim",
    detail: "brief",
    role: "Morning baker",
    applied: "2027-05-01",
    stage: "offer",
    outcome: "hired",
    criteria: [
      { label: "Bench work", finding: "meets", evidence: "Trial shift included shaping rye loaves." },
    ],
    interviewGoto: "mara_interview",
    offerGoto: "mara_offer",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Candidate");
export const probes: c.Probe[] = [
  choose(
    "Review one job applicant against each required criterion with a finding and evidence, and record the decision myself.",
  ),
  choose(
    "Show only the person's identity, portrait and short bio, with no job application, work-sample review or decision.",
    "Profile",
  ),
  write(
    "Review Sam Patel's active application for Trot's Summer dog walker role, submitted 2027-04-06, now at interview. I marked Group handling as meets based on volunteer walks; Weekday mornings is unreviewed. Link to the interview and offer.",
  ),
  {
    ...write(
      "Summarize Sam Patel's active Summer dog walker application from 2027-04-06 at interview. I marked Group handling as meets based on volunteer walks. Keep that evidence in the record but show just the finding. Link to the interview and offer.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Reject Sam Patel's application.", { address: "c1/reject", action: "press" }),
] satisfies c.Probe[];

type Review = c.Props<typeof props, typeof meta>;
type ReviewAction = "interview" | "offer" | "hire" | "reject" | "withdraw";

function Criterion({
  row,
  detail,
  density,
}: {
  row: Review["criteria"][number];
  detail: Review["detail"];
  density: c.ThemeDensity;
}) {
  const {
    words: { candidate: words },
  } = kit.useWords(hiringWordsFor);
  const { screen, component } = kit.usePartContext();
  const finding = kit.useControlValue(`${screen}/${component}/${row.id}/finding`, row.finding);
  return (
    <kit.KitRow item={row.id} label={row.label} inset="none" {...{ density }}>
      <kit.KitText part="label" role="heading" {...{ density }}>
        {row.label}
      </kit.KitText>
      <kit.KitTrack part="finding" role="radiogroup" label={row.label}>
        <kit.KitGrid {...{ density }}>
          {findings.map((value) => (
            <kit.KitChip
              key={value}
              item={null}
              role="radio"
              look="box"
              label={words.findings[value]}
              on={value === finding}
              {...{ value }}
            />
          ))}
        </kit.KitGrid>
      </kit.KitTrack>
      {detail === "full" && (
        <kit.KitContent group="response" {...{ density }}>
          <kit.KitInput
            part="evidence"
            label={words.evidenceFor(row.label)}
            hint={words.evidence}
            value={row.evidence}
          />
        </kit.KitContent>
      )}
    </kit.KitRow>
  );
}

function ReviewActions({
  input,
  density,
  loading = false,
}: {
  input: Review;
  density: c.ThemeDensity;
  loading?: boolean;
}) {
  const {
    words: { candidate: words },
  } = kit.useWords(hiringWordsFor);
  const active = input.outcome === "active";
  const action = (part: ReviewAction, kind: kit.ActionKind, goto?: string) => {
    const label = !active && (part === "interview" || part === "offer") ? words.history[part] : words[part];
    return loading ? (
      <kit.KitSkeleton shape="control" {...{ label, kind }} full />
    ) : (
      <kit.KitAction {...{ part, label, kind, goto }} full />
    );
  };
  return (
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitGrid arrange="rows" list listRowGap="cards" {...{ density }}>
        <kit.KitGrid {...{ density }}>
          {action("interview", "secondary", input.interviewGoto)}
          {action("offer", "secondary", input.offerGoto)}
        </kit.KitGrid>
        {active && action("hire", "primary")}
        {active && (
          <kit.KitGrid {...{ density }}>
            {action("reject", "danger")}
            {action("withdraw", "quiet")}
          </kit.KitGrid>
        )}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

type CandidateCopy = ReturnType<typeof candidateCopy>;
type CandidateWords = ReturnType<typeof hiringWordsFor>["candidate"];

function CandidateLoading(
  input: Review,
  { applied, stage, outcome }: CandidateCopy,
  detail: Review["detail"],
  density: c.ThemeDensity,
  words: CandidateWords,
) {
  return (
    <>
      <kit.KitContent
        leadingAlign="row"
        {...{ density }}
        lead={input.photo && <kit.KitPhoto shape="round" part="photo" />}
      >
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          content={[
            ["title", input.name],
            ["body", input.role],
          ]}
        />
      </kit.KitContent>
      <kit.KitSkeleton
        shape="figure"
        inset="none"
        content={[
          ["label", applied],
          ["label", stage],
          ["label", outcome],
        ]}
        {...{ density }}
      />
      {input.criteria.map(({ id, label }) => (
        <kit.KitContent key={id} group="response" {...{ density }}>
          <kit.KitSkeleton shape="figure" inset="none" content={[["heading", label]]} {...{ density }} />
          <kit.KitGrid {...{ density }}>
            {findings.map((value) => (
              <kit.KitSkeleton key={value} shape="control" label={words.findings[value]} full />
            ))}
          </kit.KitGrid>
          {detail === "full" && <kit.KitSkeleton shape="control" label={words.evidence} full />}
        </kit.KitContent>
      ))}
      <ReviewActions {...{ input, density }} loading />
    </>
  );
}

function CandidateDetails(
  input: Review,
  { applied, stage, outcome }: CandidateCopy,
  detail: Review["detail"],
  density: c.ThemeDensity,
) {
  return (
    <>
      <kit.KitContent
        leadingAlign="row"
        {...{ density }}
        lead={
          input.photo && <kit.KitPhoto photo={input.photo} shape="round" part="photo" label={input.name} />
        }
      >
        <kit.KitText part="name" role="title" density="comfortable">
          {input.name}
        </kit.KitText>
        <kit.KitText part="role" tone="muted" {...{ density }}>
          {input.role}
        </kit.KitText>
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitText part="applied" role="label" tone="muted" {...{ density }}>
          {applied}
        </kit.KitText>
        <kit.KitText part="stage" role="label" {...{ density }}>
          {stage}
        </kit.KitText>
        <kit.KitText part="outcome" role="label" {...{ density }}>
          {outcome}
        </kit.KitText>
      </kit.KitContent>
      {input.criteria.map((row) => (
        <Criterion key={row.id} {...{ row, detail, density }} />
      ))}
      <ReviewActions {...{ input, density }} />
    </>
  );
}

export function Candidate(input: Review) {
  const {
    lang,
    words: { candidate: words },
  } = kit.useWords(hiringWordsFor);
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const copy = candidateCopy(input, lang);
  return (
    <kit.KitCard part="root" padded {...{ density }}>
      {state === "loading" ? (
        CandidateLoading(input, copy, detail, density, words)
      ) : state === "success" || state === "error" ? (
        <kit.KitEmpty
          part={state}
          title={state === "success" ? words.success : words.error}
          icon={state === "success" ? "check" : "info"}
          decorativeIcon
        />
      ) : (
        CandidateDetails(input, copy, detail, density)
      )}
    </kit.KitCard>
  );
}
