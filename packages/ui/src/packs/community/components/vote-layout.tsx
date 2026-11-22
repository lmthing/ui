import type * as c from "../../../catalog";
import * as kit from "../../../kit";
import { voteCopy, type VoteFacts } from "../copy";
import { communityWordsFor } from "../lang";

type Copy = ReturnType<typeof voteCopy>;
type Density = c.ThemeDensity;
type Arrange = "grid" | "rows";

// prettier-ignore
function Quorum({ copy, facts, density, loading, label }: {
  copy: Copy; facts: VoteFacts; density: Density; loading: boolean; label: string;
}) {
  const ratio = facts.participation / facts.quorum;
  return <kit.KitRow part={loading ? null : "quorum"} label={label} inline fitContent density={density}>
    <kit.KitGrid fitLast density={density}>
      <kit.KitLayoutText density={density} line={{ text: label, role: "meta", strong: true }} />
      <kit.KitLayoutText density={density} align="end" line={{ text: copy.participation, part: "participation", role: "meta", tabular: true }} />
    </kit.KitGrid>
    <kit.KitMeter label="" amount="" ratio={loading ? 0 : ratio} tone={ratio >= 1 ? "good" : "accent"} addressed={false} slim />
  </kit.KitRow>;
}

// prettier-ignore
function MotionChoices({ copy, facts, density, arrange, voting }: {
  copy: Copy; facts: VoteFacts; density: Density; arrange: Arrange; voting: boolean;
}) {
  if (copy.decision) return <kit.KitRowGroup density={density}>
    {copy.counts.map(({ choice, label, count }) => <kit.KitRow key={choice} part={null} label={label} inset="none" density={density}>
      <kit.KitGrid fitLast density={density}>
        <kit.KitLayoutText density={density} line={{ text: label, part: `${choice}_label`, role: "meta" }} />
        <kit.KitLayoutText density={density} align="end" line={{ text: count, part: choice, role: "figure", compact: true, tabular: true }} />
      </kit.KitGrid>
    </kit.KitRow>)}
  </kit.KitRowGroup>;
  if (!voting) return null;
  return <kit.KitGrid columns={3} list={arrange === "rows"} listRowGap="cards" {...{ arrange, density }}>
    {copy.counts.map(({ choice, label }) => <kit.KitChip key={choice} item="" part={choice}
      labelPart={`${choice}_label`} role="radio" look="box" label={label} on={facts.own_ballot === choice} />)}
  </kit.KitGrid>;
}

// prettier-ignore
function ElectionChoices({ copy, facts, voting, density, arrange, abstain, elected }: {
  copy: NonNullable<Copy["election"]>; facts: VoteFacts; voting: boolean; density: Density; arrange: Arrange;
  abstain: string; elected: string;
}) {
  const scope = kit.usePartContext(), loading = kit.useComponentState() === "loading";
  return <kit.KitContent density={density}>
    {voting ? <kit.KitGrid {...{ arrange, density }} columns={2} list listRowGap="cards">
      {copy.rows.map(({ id, name, selected, can_select }) => <kit.KitChip key={id} item={id} role="checkbox"
        look="box" label={name} on={selected} disabled={!can_select} />)}
      <kit.KitChip item="" part="abstain" labelPart="abstain_label" role="checkbox" look="box" label={abstain}
        on={facts.election?.abstained === true} />
    </kit.KitGrid> : <kit.KitRowGroup density={density}>
      {copy.rows.map(({ id, name, countText, elected: won }) => <kit.PartScope key={id} {...scope} item={id}>
        <kit.KitRow part={loading ? null : "root"} label={name} inline fitContent>
          <kit.KitGrid density={density}>
            <kit.KitMetaLine density={density} title={{ text: name, part: "label" }}
              meta={{ text: won ? elected : undefined, part: "elected", tone: "good" }} />
            <kit.KitLayoutText density={density} align="end" line={{ text: countText, part: "count", role: "figure", compact: true, tabular: true }} />
          </kit.KitGrid>
        </kit.KitRow>
      </kit.PartScope>)}
    </kit.KitRowGroup>}
  </kit.KitContent>;
}

// prettier-ignore
export function VoteLayout({ motion, detail, facts, density, surface, arrange }: {
  motion: string; detail?: string | undefined; facts: VoteFacts; density: Density; surface: "card" | "outlined"; arrange: Arrange;
}) {
  const state = kit.useComponentState(), loading = state === "loading";
  const { lang, words: { vote: w } } = kit.useWords(communityWordsFor);
  const copy = voteCopy(facts, state, lang), resolved = state === "success" || state === "error";
  const voting = facts.can_vote && (loading || state === "filled");
  const content = <>
    {state === "error" && <kit.KitEmpty title={copy.status} part="status" tone="bad" icon="alert"
      prominence="heading" announce="alert" decorativeIcon density={density} />}
    <kit.KitHeader density={density} title={{ text: motion, part: "motion", role: "body", strong: true }}
      meta={{ text: detail, part: "detail", role: "body" }} />
    {state === "success" && <kit.KitState part="status" message={copy.status} density={density} />}
    <kit.KitContent group="response" density={density}>
      {!resolved && <kit.KitLayoutText density={density} line={{ text: copy.status, part: "status", role: "meta", strong: true }} />}
      {(["opens", "closes", "rule"] as const).map((part) => <kit.KitLayoutText key={part} density={density}
        line={{ text: copy[part], part, role: "meta", tone: "muted" }} />)}
      {copy.election && <kit.KitLayoutText density={density}
        line={{ text: copy.election.seats, part: "seats", role: "meta", tone: "muted" }} />}
    </kit.KitContent>
    <kit.KitContent group="response" density={density}>
      <Quorum label={w.quorum} {...{ copy, facts, density, loading }} />
    </kit.KitContent>
    {(copy.own || voting || copy.decision || copy.election) && <kit.KitContent group="response" density={density}>
      <kit.KitLayoutText density={density} line={{ text: copy.decision, part: "decision", strong: true,
        tone: facts.decision === "passed" ? "good" : "text" }} />
      <kit.KitLayoutText density={density} line={{ text: copy.own, part: "own", role: "meta", tone: "muted" }} />
      {copy.election ? <ElectionChoices copy={copy.election} {...{ facts, voting, density, arrange }} abstain={w.choice.abstain} elected={w.elected} />
        : <MotionChoices {...{ copy, facts, density, arrange, voting }} />}
    </kit.KitContent>}
    {facts.can_cancel && (loading || state === "filled") && <kit.KitActionFooter align="end" density={density}>
      <kit.KitAction part={loading ? null : "cancel"} action="press" kind="quiet" icon="close" contentParts={{ label: "cancel_label" }}
        label={copy.election ? w.cancelElection : w.cancel} />
    </kit.KitActionFooter>}
  </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {loading ? <kit.KitState loading={content} density={density} /> : content}
  </kit.KitCard>;
}
