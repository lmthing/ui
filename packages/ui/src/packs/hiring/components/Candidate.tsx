import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { candidateCopy, candidateReading, panelFindingCopy } from "../copy";
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
    "success", "error", "resume", "resume_label"],
  items: {
    key: "criteria",
    parts: ["root", "label", "finding", "evidence", "panel"],
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
    parts: { interview: ["press"], offer: ["press"], hire: ["press"], reject: ["press"], withdraw: ["press"], resume: ["press"] },
    items: { finding: ["select"], evidence: ["type"] },
    // prettier-ignore
    when: { hire: { outcome: "active" }, reject: { outcome: "active" }, withdraw: { outcome: "active" },
      evidence: { detail: "full" }, resume: { hasResume: true } },
  },
  live: {
    // prettier-ignore
    derive: (input): c.Values => ({
      interview: { goto: input.interviewGoto },
      offer: { goto: input.offerGoto },
      hasResume: typeof input.resumeGoto === "string",
      resume: input.resumeGoto ? { goto: input.resumeGoto } : undefined,
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
    panelFindings: z.array(z.strictObject({
      interviewer: c.text(24), finding: z.enum(findings), evidence: c.text(80).optional(),
    })).min(2).max(4).optional(),
  })).min(1).max(6),
  interviewGoto: c.screenId, offerGoto: c.screenId,
  resumeGoto: c.screenId.optional(),
  style: z.literal("panel").optional(),
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
  {
    applicationId: "imani",
    jobId: "walker",
    name: "Imani Cole",
    role: "Summer dog walker",
    applied: "2027-04-07",
    stage: "interview",
    outcome: "active",
    style: "panel",
    criteria: [
      {
        label: "Group handling",
        panelFindings: [
          { interviewer: "Jo Ellis", finding: "meets", evidence: "Led the practice walk." },
          { interviewer: "Ari Lane", finding: "needs_evidence", evidence: "Ask about larger groups." },
        ],
      },
    ],
    interviewGoto: "imani_interview",
    offerGoto: "imani_offer",
    resumeGoto: "imani_resume",
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
  {
    ...write(
      "Show side-by-side interviewer findings for Imani Cole's active Summer dog walker application from 2027-04-07, at interview. For Group handling, Jo Ellis marked Meets after Imani led the practice walk and Ari Lane marked Needs evidence. Do not set a final finding. Link to the interview and offer.",
    ),
    expectProps: { style: "panel" },
    fields: {
      "criteria.0.panelFindings.0.interviewer": "Jo Ellis",
      "criteria.0.panelFindings.0.finding": "meets",
      "criteria.0.panelFindings.1.interviewer": "Ari Lane",
      "criteria.0.panelFindings.1.finding": "needs_evidence",
    },
  },
  {
    ...write(
      "Review Sam Patel's active Summer dog walker application from 2027-04-06 at interview. Group handling is unreviewed. Link to the interview and offer and add a View résumé link to the sam_resume screen.",
    ),
    expectProps: { resumeGoto: "sam_resume" },
  },
  read("Reject Sam Patel's application.", { address: "c1/reject", action: "press" }),
] satisfies c.Probe[];

type Review = c.Props<typeof props, typeof meta>;
type ReviewAction = "interview" | "offer" | "hire" | "reject" | "withdraw" | "resume";
type CriterionRow = Review["criteria"][number];

function PanelFindings({
  row,
  detail,
  density,
  lang,
}: {
  row: CriterionRow;
  detail: Review["detail"];
  density: c.ThemeDensity;
  lang: string;
}) {
  const loading = kit.useComponentState() === "loading";
  if (!row.panelFindings) return null;
  const { candidate: words } = hiringWordsFor(lang);
  return (
    <kit.KitRow
      part={loading ? null : "panel"}
      label={words.panel}
      inset="none"
      inline
      fitContent
      density={density}
    >
      <kit.KitLayoutText line={{ text: words.panel, role: "meta", tone: "muted" }} density={density} />
      <kit.KitGrid density={density}>
        {row.panelFindings.map((review, index) => {
          const { interviewer, finding, evidence } = panelFindingCopy(review, detail, lang);
          return (
            <kit.KitMetaLine
              key={index}
              title={{ text: interviewer, strong: true }}
              meta={[{ text: finding, tone: "text" }, { text: evidence }]}
              density={density}
            />
          );
        })}
      </kit.KitGrid>
    </kit.KitRow>
  );
}

function Criterion({
  row,
  detail,
  density,
  panel,
}: {
  row: CriterionRow;
  detail: Review["detail"];
  density: c.ThemeDensity;
  panel: boolean;
}) {
  const {
    lang,
    words: { candidate: words },
  } = kit.useWords(hiringWordsFor);
  const loading = kit.useComponentState() === "loading";
  const comparison = panel && row.panelFindings;
  return (
    <kit.KitRow
      item={row.id}
      label={row.label}
      inset="none"
      density={density}
      {...(loading && { part: null })}
    >
      <kit.KitLayoutText
        line={{ part: "label", text: row.label, role: "body", strong: true }}
        density={density}
      />
      {comparison && <PanelFindings {...{ row, detail, density, lang }} />}
      <kit.KitContent group={comparison ? "response" : "content"} density={density}>
        <FindingChoices {...{ row, density, loading }} />
      </kit.KitContent>
      {detail === "full" && (
        <kit.KitContent group="response" density={density}>
          <kit.KitInput
            part={loading ? null : "evidence"}
            label={words.evidenceFor(row.label)}
            hint={words.evidence}
            value={row.evidence}
          />
        </kit.KitContent>
      )}
    </kit.KitRow>
  );
}

function FindingChoices({
  row,
  density,
  loading,
}: {
  row: CriterionRow;
  density: c.ThemeDensity;
  loading: boolean;
}) {
  const {
    words: { candidate: words },
  } = kit.useWords(hiringWordsFor);
  const { screen, component } = kit.usePartContext();
  const finding = kit.useControlValue(`${screen}/${component}/${row.id}/finding`, row.finding);
  const choices = (
    <kit.KitGrid density={density}>
      {findings.map((value) => (
        <kit.KitChip
          key={value}
          item={null}
          role="radio"
          look="box"
          label={words.findings[value]}
          on={value === finding}
          value={value}
        />
      ))}
    </kit.KitGrid>
  );
  return loading ? (
    choices
  ) : (
    <kit.KitTrack part="finding" role="radiogroup" label={row.label}>
      {choices}
    </kit.KitTrack>
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
      <kit.KitAction {...{ part, label, kind, goto }} tone={kind === "quiet" ? "neutral" : "accent"} full />
    );
  };
  return (
    <kit.KitContent group="response" {...{ density }}>
      <kit.KitGrid arrange="rows" list listRowGap="cards" {...{ density }}>
        {input.resumeGoto && action("resume", "quiet", input.resumeGoto)}
        <kit.KitGrid {...{ density }}>
          {action("interview", "quiet", input.interviewGoto)}
          {action("offer", "quiet", input.offerGoto)}
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
function CandidateDetails({
  input,
  copy: { applied, stage, outcome },
  detail,
  density,
}: {
  input: Review;
  copy: CandidateCopy;
  detail: Review["detail"];
  density: c.ThemeDensity;
}) {
  const loading = kit.useComponentState() === "loading";
  return (
    <>
      <kit.KitContent
        leadingAlign="row"
        {...{ density }}
        lead={
          input.photo && (
            <kit.KitPhoto
              photo={input.photo}
              shape="round"
              part="photo"
              label={input.name}
              loading={loading}
            />
          )
        }
      >
        <kit.KitHeader
          title={{ part: "name", text: input.name }}
          meta={{ part: "role", text: input.role, role: "body" }}
          density={density}
        />
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        <kit.KitLayoutText
          line={{ part: "applied", text: applied, role: "meta", tone: "muted" }}
          density={density}
        />
        <kit.KitLayoutText line={{ part: "stage", text: stage, role: "meta" }} density={density} />
        <kit.KitLayoutText line={{ part: "outcome", text: outcome, role: "meta" }} density={density} />
      </kit.KitContent>
      {input.criteria.map((row) => (
        <Criterion key={row.id} {...{ row, detail, density }} panel={input.style === "panel"} />
      ))}
      <ReviewActions {...{ input, density, loading }} />
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
  const details = <CandidateDetails {...{ input, copy, detail, density }} />;
  return (
    <kit.KitCard part="root" padded {...{ density }}>
      <kit.KitState
        density={density}
        loading={details}
        part={state === "success" || state === "error" ? state : null}
        message={state === "success" || state === "error" ? words[state] : undefined}
      >
        {details}
      </kit.KitState>
    </kit.KitCard>
  );
}
