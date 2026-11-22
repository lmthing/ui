import { appointmentDate, type Props, type ThemeDensity } from "../../../catalog";
import {
  KitCard,
  KitHeader,
  KitLayoutText,
  KitState,
  useComponentState,
  useWords,
  useKit,
} from "../../../kit";
import { StageBoard, type StageCard } from "../../../kit/renderers";
import { ApplicantPipeline } from "../components";
import { hiringWordsFor } from "../lang";
import { activeStages, outcomes } from "../seeds";

type Input = Props<typeof ApplicantPipeline.props, typeof ApplicantPipeline.meta>;
type Applicant = Input["applicants"][number];
type Words = ReturnType<typeof hiringWordsFor>;
type Moves = Readonly<Record<string, NonNullable<StageCard["destinations"]>>>;

function applicantCard(
  applicant: Applicant,
  density: ThemeDensity,
  lang: string,
  words: Words,
  moves: Moves | undefined,
): StageCard {
  const { applied, id, goto, name, next, nextAt, stage } = applicant;
  const lines: StageCard["lines"][number][] = [
    { part: "name", role: "body", density, text: name },
    {
      part: "applied",
      role: "caption",
      tone: "muted",
      text: words.applications.applied(appointmentDate(applied, lang)),
    },
  ];
  if (next) lines.push({ part: "next", role: "caption", text: next });
  if (nextAt)
    lines.push({
      part: "next_at",
      role: "caption",
      tone: "muted",
      text: words.applications.nextAt(appointmentDate(nextAt, lang)),
    });
  return { id, goto, label: name, column: activeStages.indexOf(stage), lines, destinations: moves?.[id] };
}

/** Active stages draw through StageBoard; the owner supplies the legal move values. */
export function ApplicantLanes({
  applicants,
  title,
  style,

  moves,
}: Input & { moves?: Moves }) {
  const { lang, words } = useWords(hiringWordsFor);
  const density = useKit().density;
  const state = useComponentState();
  const loading = state === "loading";
  const active = applicants.filter(({ outcome }) => outcome === "active");
  const count = new Intl.NumberFormat(lang);
  const columns = activeStages.map((stage) => ({
    id: stage,
    part: stage,
    label: words.stages[stage],
    count: count.format(active.filter((applicant) => applicant.stage === stage).length),
  }));
  const closed = outcomes
    .filter((outcome) => outcome !== "active")
    .map((outcome) =>
      words.pipeline.count(
        words.outcomes[outcome],
        count.format(applicants.filter((applicant) => applicant.outcome === outcome).length),
      ),
    );
  const panel = (
    <>
      <KitHeader title={{ part: "title", text: title }} density={density} />
      <StageBoard
        part={null}
        {...{ loading, style, density }}
        lanes={columns}
        cards={active.map((applicant) => applicantCard(applicant, density, lang, words, moves))}
        {...(moves ? { move: { caption: words.pipeline.move, label: words.pipeline.destination } } : {})}
      />
      <KitLayoutText
        line={{ part: "outcomes", text: words.pipeline.outcomes(closed), role: "meta" }}
        density={density}
      />
    </>
  );
  return (
    <KitCard padded density={density}>
      <KitState
        loading={panel}
        message={state === "error" ? words.pipeline.error : undefined}
        density={density}
        retain
      >
        {panel}
      </KitState>
    </KitCard>
  );
}
