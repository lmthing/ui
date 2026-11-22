import { z } from "zod";
import {
  digitsLine,
  itemsOf,
  numberLine,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitChip,
  KitContent,
  KitEmpty,
  KitGrid,
  KitInput,
  KitRow,
  KitSkeleton,
  KitTable,
  KitText,
  KitTrack,
  useComponentState,
  useWords,
  useKit,
} from "../../../kit";
import { scoreBidLine, scoreCopy, scoreGoalCopy, scoreReading } from "../copy";
import { playWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-ScoreSheet.generated";

// Core first: Counter/default cannot store several players' numeric round cells and compute totals.
const scoreMin = -999;
const scoreMax = 999;
const roundsMax = 12;
const score = z.int().min(scoreMin).max(scoreMax).nullable();
const roundKey = (index: number) => String(index + 1);
export const meta = {
  id: "ScoreSheet",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { share: "people" },
  confirmParts: ["reset"],
  clearItems: { reset: "score" },
  realPath: "Round scores are saved on the device; sharing publishes a versioned snapshot to a shared app.",
  variants: { overflow: ["all", "page"] },
  variantParts: { "overflow.page": { hides: ["root", "round", "score", "bid"] } },
  items: {
    key: "cells",
    parts: ["root", "player", "round", "score", "bid"],
    set: {
      score: {
        prop: "score",
        min: scoreMin,
        max: scoreMax,
        integer: true,
        matrix: { rows: "rounds", values: "points" },
      },
    },
  },
  select: { prop: "selectedRound", choices: { root: { prop: "roundOptions" } } },
  parts: ["root", "sheet", "matrix", "title", "progress", "goal", "goal_reached", "empty", "reset", "share"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { root: ["select"], reset: ["press"], share: ["press"] },
    items: { score: ["set"] },
    when: { share: { share: true }, score: { editable: true } },
  },
  readInState: (input, state): boolean =>
    state === "success" &&
    (input.goal !== undefined ||
      (input as z.output<typeof props>).rounds.some(({ bids }) => bids !== undefined)),
  read: (input, state, lang): string[] =>
    scoreReading(input as z.output<typeof props>, lang, state === "success"),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    players: z
      .array(z.strictObject({ name: text(24) }))
      .min(2)
      .max(6),
    rounds: z
      .array(
        z.strictObject({
          label: text(16),
          points: z.array(score).min(2).max(6),
          bids: z.array(score).min(2).max(6).optional(),
        }),
      )
      .min(1)
      .max(roundsMax),
    goal: z
      .int()
      .min(scoreMin * roundsMax)
      .max(scoreMax * roundsMax)
      .optional(),
    wins: z.enum(["high", "low"]).default("high"),
    share: z.boolean().default(false),
    selectedRound: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]).default("1"),
  })
  .refine(({ selectedRound, rounds }) => Number(selectedRound) <= rounds.length, {
    path: ["selectedRound"],
    message: "Select a round on this sheet",
  })
  .refine(({ players, rounds }) => rounds.every((round) => round.points.length === players.length), {
    path: ["rounds"],
    message: "Every round needs exactly one point entry per player",
  })
  .refine(({ players, rounds }) => rounds.every(({ bids }) => !bids || bids.length === players.length), {
    path: ["rounds"],
    message: "Every bidding round needs exactly one bid entry per player",
  })
  .overwrite((value) => ({
    ...value,
    roundOptions: value.rounds.map(({ label }, index) => ({ value: roundKey(index), label })),
    cells: value.rounds.flatMap((round, at) =>
      value.players.map((player, index) => ({
        player: player.name,
        round: round.label,
        score: round.points[index],
        editable: value.overflow === "all" || roundKey(at) === value.selectedRound,
      })),
    ),
  }));
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const players = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index, lang),
  }));
  while (players.length < 2) players.push({ name: placeholderTitle(players.length, lang) });
  return { players, rounds: [{ label: placeholderTitle(0, lang), points: players.map(() => null) }] };
}
// Ledge's friends play a high-score game after tending the plants.
const game = {
  players: [{ name: "Anna" }, { name: "Ben" }, { name: "Sam" }],
  rounds: [
    { label: "Round 1", points: [4, 2, 4] },
    { label: "Round 2", points: [3, -1, 3] },
  ],
  share: true,
};
export const examples = [
  game,
  // Trot's walkers keep a low-score card-game round.
  {
    players: [{ name: "Jo" }, { name: "Lee" }],
    rounds: [{ label: "First hand", points: [-2, 5] }],
    wins: "low",
  },
  { ...game, overflow: "page" },
  { ...game },
  { ...game, goal: 7, rounds: [{ ...game.rounds[0]!, bids: [3, 2, 4] }, game.rounds[1]!] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ScoreSheet");
export const probes = [
  choose("Enter each of three players' points in every board-game round and compute their totals"),
  choose("One running score with plus and minus, without any round or player records", "Counter"),
  write(
    "Anna and Ben play two rounds: First has 4 and -2 points, Second has not been played. Higher total wins; no sharing.",
  ),
  {
    ...write(
      "Anna and Ben play two rounds: First has 4 and -2 points, Second is unplayed. Show only the selected round's score column at a time, with controls to switch rounds and both rounds kept in the data.",
    ),
    variant: { axis: "overflow", value: "page" },
  },
  {
    ...write(
      "Track Anna and Ben's round scores. They made 4 and 2 in the first round. The target total is 10.",
    ),
    expectProps: { goal: 10 },
  },
  {
    ...write(
      "Record exactly one game round for only two players, Anna then Ben. Anna bid 3 and made 4; Ben bid 1 and made 2. Record the bids and what each player made.",
    ),
    expectProps: { players: [{ name: "Anna" }, { name: "Ben" }], rounds: [{ bids: [3, 1], points: [4, 2] }] },
  },
  read("Change Anna's score in round one", { address: "s1/r1/score", action: "set" }),
  read("Reset the round scores", { address: "s1/reset", action: "press" }),
] satisfies Probe[];
type SheetProps = Props<typeof props, typeof meta> & { cells: { id: string }[] };
type Labels = ReturnType<typeof playWordsFor>["scoreLabels"];
type ScoreWords = ReturnType<typeof playWordsFor>;
type ScoreLanguage = Parameters<typeof scoreCopy>[1];
type TableDisplay = { loading: boolean; readonly: boolean; lang: ScoreLanguage };
type VisibleRounds = {
  rounds: SheetProps["rounds"];
  visible: number[];
  cellId: (round: number, player: number) => string;
  spacer: React.ReactElement | null;
};

function ScoreLineFor(loading: boolean) {
  return function line(
    role: "label" | "caption" | "number",
    text: string,
    tone: "accent" | "text" | "good" | "muted" = "text",
    align: "start" | "end" = "start",
    part: "bid" | null = null,
  ) {
    return loading ? (
      <KitSkeleton shape="figure" inset="none" content={[[role, text, align, "compact"]]} />
    ) : (
      <KitText
        {...{ role, tone, align }}
        part={part}
        numberScale="compact"
        tabular={role === "number"}
        lines={1}
      >
        {text}
      </KitText>
    );
  };
}

function ScoreColumns(
  { rounds, visible, cellId, spacer }: VisibleRounds,
  selected: number,
  readonly: boolean,
  line: ReturnType<typeof ScoreLineFor>,
  labels: Labels,
) {
  return visible.map((round) => ({
    id: roundKey(round),
    label: rounds[round]!.label,
    header: (
      <KitRow item={cellId(round, 0)} inline part="round" label={rounds[round]!.label}>
        {line(
          "label",
          rounds[round]!.label,
          round === selected ? "accent" : "text",
          readonly ? "end" : "start",
        )}
        {spacer &&
          (rounds[round]!.bids ? line("caption", labels.made, "muted", readonly ? "end" : "start") : spacer)}
      </KitRow>
    ),
  }));
}

function ScoreCells(
  { rounds, visible, cellId, spacer }: VisibleRounds,
  { loading, readonly, lang }: TableDisplay,
  words: ScoreWords,
  player: number,
  name: string,
  line: ReturnType<typeof ScoreLineFor>,
) {
  const labels = words.scoreLabels;
  return visible.map((round) => {
    const { label: roundLabel, points, bids } = rounds[round]!;
    const label = words.scoreCell(name, roundLabel, bids ? labels.made : undefined);
    const score = points[player];
    const value = score == null ? "" : String(score);
    return {
      id: cellId(round, player),
      content: (
        <KitRow item={cellId(round, player)} inline label={label}>
          {loading ? (
            <KitSkeleton shape="control" kind="secondary" label={labels.unplayed} full />
          ) : readonly ? (
            <KitText role="number" numberScale="compact" tabular align="end" part="score">
              {score == null ? labels.unplayed : numberLine(score, lang)}
            </KitText>
          ) : (
            <KitInput
              compact
              kind="number"
              action="set"
              label={label}
              part="score"
              hint={labels.unplayed}
              value={value}
              min={scoreMin}
              max={scoreMax}
              step={1}
            />
          )}
          {spacer &&
            (bids
              ? line("caption", scoreBidLine(bids[player]!, lang), "muted", readonly ? "end" : "start", "bid")
              : spacer)}
        </KitRow>
      ),
    };
  });
}

function ScoreRows(
  input: SheetProps,
  grid: VisibleRounds,
  selected: number,
  display: TableDisplay,
  words: ScoreWords,
  line: ReturnType<typeof ScoreLineFor>,
) {
  const { lang, loading } = display;
  const { players: totals } = scoreCopy(input, lang);
  return totals.map(({ name, total, standing, winner }, player) => {
    const amount = line("number", loading ? digitsLine(0, 2, lang) : total, "text", "end");
    const { spacer } = grid;
    return {
      id: grid.cellId(selected, player),
      label: name,
      heading: (
        <KitRow inline part="player" label={name}>
          <KitGrid fitLast>
            <KitContent>
              {line("label", name)}
              {standing ? line("caption", standing, winner ? "good" : "muted") : spacer}
            </KitContent>
            {spacer ? (
              <KitRow inline label={words.scoreLabels.total}>
                {amount}
                {spacer}
              </KitRow>
            ) : (
              amount
            )}
          </KitGrid>
        </KitRow>
      ),
      cells: ScoreCells(grid, display, words, player, name, line),
    };
  });
}

// The presentation can pin another round without ever reordering the underlying score addresses.
function ScoreTable({
  input,
  selected,
  loading,
  readonly,
}: {
  input: SheetProps;
  selected: number;
  loading: boolean;
  readonly: boolean;
}) {
  const { lang, words } = useWords(playWordsFor);
  const labels = words.scoreLabels;
  const { players, rounds, cells, overflow } = input;
  const visible = [
    selected,
    ...rounds.flatMap((_, index) => (overflow === "all" && index !== selected ? [index] : [])),
  ];
  const cellId = (round: number, player: number) => cells[round * players.length + player]!.id;
  const spacer = visible.some((round) => rounds[round]!.bids) ? (
    <KitText role="caption" part={null}>
      {"\u00a0"}
    </KitText>
  ) : null;
  const grid = { rounds, visible, cellId, spacer };
  const line = ScoreLineFor(loading);
  const columns = ScoreColumns(grid, selected, readonly, line, labels);
  const rows = ScoreRows(input, grid, selected, { loading, readonly, lang }, words, line);
  return (
    <KitTable
      part="matrix"
      columns={columns}
      rows={rows}
      fitColumns={columns.length <= 2 && players.every(({ name }) => name.length <= 12)}
      corner={
        <KitRow inline label={labels.player}>
          <KitGrid fitLast>
            {line("label", labels.player, "muted")}
            {line("label", labels.total, "muted", "end")}
          </KitGrid>
          {spacer}
        </KitRow>
      }
    />
  );
}
function ScoreActions({ share, loading, labels }: { share: boolean; loading: boolean; labels: Labels }) {
  if (loading)
    return (
      <KitGrid>
        <KitSkeleton shape="control" kind="quiet" label={labels.reset} />
        {share && <KitSkeleton shape="control" kind="secondary" label={labels.share} full />}
      </KitGrid>
    );
  if (!share) return <KitAction kind="quiet" label={labels.reset} part="reset" />;
  return (
    <KitGrid>
      <KitAction kind="quiet" label={labels.reset} part="reset" full />
      <KitAction kind="secondary" label={labels.share} part="share" full />
    </KitGrid>
  );
}
function ScoreGoal({
  goal,
  loading,
}: {
  goal: NonNullable<ReturnType<typeof scoreGoalCopy>>;
  loading: boolean;
}) {
  if (loading)
    return (
      <KitSkeleton
        shape="figure"
        inset="none"
        content={
          goal.reached
            ? [
                ["label", goal.target],
                ["caption", goal.reached],
              ]
            : [["label", goal.target]]
        }
      />
    );
  return (
    <>
      <KitText role="label" part="goal">
        {goal.prefix}
        <KitText role="number" numberScale="compact" tabular part={null}>
          {goal.value}
        </KitText>
      </KitText>
      {goal.reached && (
        <KitText role="caption" part="goal_reached" tone="good">
          {goal.reached}
        </KitText>
      )}
    </>
  );
}

export function ScoreSheet(input: SheetProps) {
  const state = useComponentState();
  const {
    lang,
    words: { scoreLabels: labels },
  } = useWords(playWordsFor);
  const density = useKit().density;
  const loading = state === "loading";
  const selected = Number(input.selectedRound) - 1;
  if (state === "empty") return <ScoreEmpty density={density} />;
  const { progress } = scoreCopy(input, lang);
  const goal = scoreGoalCopy(input, lang);
  return (
    <KitCard part={state === "success" ? "root" : "sheet"} padded density={density}>
      <KitContent density={density}>
        {loading ? (
          <KitSkeleton
            shape="figure"
            inset="none"
            content={[
              ["heading", labels.title],
              ["caption", progress],
            ]}
          />
        ) : (
          <>
            <KitText role="heading" part="title" density={density}>
              {labels.title}
            </KitText>
            <KitText role="caption" tone="muted" part="progress">
              {progress}
            </KitText>
          </>
        )}
        {goal && <ScoreGoal goal={goal} loading={loading} />}
      </KitContent>
      {state !== "success" && (
        <KitTrack part="root" {...(state === "filled" ? { role: "radiogroup" } : {})} label={labels.rounds}>
          {input.rounds.map(({ label }, index) => (
            <KitChip
              key={roundKey(index)}
              item={null}
              role="radio"
              label={label}
              value={roundKey(index)}
              on={index === selected}
              disabled={loading ? false : undefined}
            />
          ))}
        </KitTrack>
      )}
      <ScoreTable {...{ input, selected, loading }} readonly={state !== "filled" && !loading} />
      {state !== "success" && <ScoreActions {...{ loading, labels }} share={input.share} />}
    </KitCard>
  );
}

function ScoreEmpty({ density }: { density: ReturnType<typeof useKit>["density"] }) {
  return (
    <KitCard part="root" padded density={density}>
      <KitEmpty part="empty" decorativeIcon />
    </KitCard>
  );
}
