import { z } from "zod";
// prettier-ignore
import {
  itemsOf, numberLine, placeholderTitle, probesFor, text, thingOf, titleOf,
  type FallbackInput, type Meta, type Probe, type Props,
} from "../../../catalog";
// prettier-ignore
import {
  KitAction, KitCard, KitChip, KitContent, KitEmpty, KitGrid, KitInput,
  KitRow, KitSkeleton, KitTable, KitText, KitTrack, useComponentState, useWords,
} from "../../../kit";
import { scoreCopy, scoreReading } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Counter/default cannot store several players' numeric round cells and compute totals.
const scoreMin = -999;
const scoreMax = 999;
const roundKey = (index: number) => String(index + 1);
// prettier-ignore
export const meta = {
  id: "ScoreSheet", status: "ready", group: "input",
  purpose: "Record players' round scores and compute totals, ranks and tied winners.",
  pick: "An editable scorecard: enter each player's points for each game round, hand or hole and calculate totals and tied winners. Not one running number (Counter), final ranking (List[ranked]), a live match (Scoreboard), or arbitrary records (Table).",
  writeHints: [
    "Each round's points has exactly one entry per player, in roster order: integer -999–999 or null for unplayed. Never write totals, ranks, winners or selected round.",
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  partTiers: { share: "people" },
  confirmParts: ["reset"],
  clearItems: { reset: "score" },
  realPath: "Round scores are saved on the device; sharing publishes a versioned snapshot to a shared app.",
  items: {
    key: "cells", parts: ["root", "player", "round", "score"],
    set: { score: { prop: "score", min: scoreMin, max: scoreMax, integer: true,
      matrix: { rows: "rounds", values: "points" } } },
  },
  select: { prop: "selectedRound", choices: { root: { prop: "roundKeys" } } },
  parts: ["root", "sheet", "matrix", "title", "progress", "empty", "reset", "share"],
  states: ["filled", "empty", "loading", "success"],
  actions: {
    parts: { root: ["select"], reset: ["press"], share: ["press"] },
    items: { score: ["set"] },
    when: { share: { share: true }, score: { editable: true } },
  },
  read: (input, _state, lang) => scoreReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;

// prettier-ignore
export const props = z
  .strictObject({
    players: z.array(z.strictObject({ name: text(24) })).min(2).max(6),
    rounds: z.array(z.strictObject({
      label: text(16),
      points: z.array(z.int().min(scoreMin).max(scoreMax).nullable()).min(2).max(6),
    })).min(1).max(12),
    wins: z.enum(["high", "low"]).default("high"),
    share: z.boolean().default(false),
    style: z.enum(["grid", "round"]).default("grid"),
    selectedRound: z.enum(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]).default("1"),
  })
  .refine(({ selectedRound, rounds }) => Number(selectedRound) <= rounds.length, {
    path: ["selectedRound"], message: "Select a round on this sheet",
  })
  .refine(({ players, rounds }) => rounds.every((round) => round.points.length === players.length), {
    path: ["rounds"], message: "Every round needs exactly one point entry per player",
  })
  .overwrite((value) => ({
    ...value,
    roundKeys: value.rounds.map((_, index) => roundKey(index)),
    cells: value.rounds.flatMap((round, at) =>
      value.players.map((player, index) => ({
        player: player.name,
        round: round.label,
        score: round.points[index],
        editable: value.style === "grid" || roundKey(at) === value.selectedRound,
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
// prettier-ignore
export const examples = [
  // Ledge's friends play a high-score game after tending the plants.
  {
    players: [{ name: "Anna" }, { name: "Ben" }, { name: "Sam" }],
    rounds: [{ label: "Round 1", points: [4, 2, 4] }, { label: "Round 2", points: [3, -1, 3] }],
    style: "grid", share: true,
  },
  // Trot's walkers keep a low-score card-game round.
  {
    players: [{ name: "Jo" }, { name: "Lee" }],
    rounds: [{ label: "First hand", points: [-2, 5] }],
    wins: "low", style: "round",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("ScoreSheet");
// prettier-ignore
export const probes = [
  choose("Enter each of three players' points in every board-game round and compute their totals"),
  choose("One running score with plus and minus, without any round or player records", "Counter"),
  write("Anna and Ben play two rounds: First has 4 and -2 points, Second has not been played. Higher total wins; no sharing."),
  read("Change Anna's score in round one", { address: "s1/r1/score", action: "set" }),
  read("Reset the round scores", { address: "s1/reset", action: "press" }),
] satisfies Probe[];

type SheetProps = Props<typeof props, typeof meta> & { cells: { id: string }[] };
type Labels = ReturnType<typeof playWordsFor>["scoreLabels"];

// The presentation can pin another round without ever reordering the underlying score addresses.
// prettier-ignore
function ScoreTable({ input, selected, loading, readonly }: {
  input: SheetProps; selected: number; loading: boolean; readonly: boolean;
}) {
  const { lang, words } = useWords(playWordsFor), labels = words.scoreLabels;
  const { players, rounds, cells, style } = input;
  const { players: totals } = scoreCopy(input, lang);
  const visible = [selected, ...rounds.flatMap((_, index) => style === "grid" && index !== selected ? [index] : [])];
  const cellId = (round: number, player: number) => cells[round * players.length + player]!.id;
  const columns = visible.map((round) => ({
    id: roundKey(round), label: rounds[round]!.label,
    header: <KitRow item={cellId(round, 0)} inline part="round" label={rounds[round]!.label}>
      {line("label", rounds[round]!.label, round === selected ? "accent" : "text", "center")}
    </KitRow>,
  }));
  const rows = totals.map(({ name, total, standing, winner }, player) => ({
    id: cellId(selected, player), label: name,
    heading: <KitRow inline part="player" label={name}><KitGrid fitLast>
      <KitContent>{line("label", name)}{standing && line("caption", standing, winner ? "good" : "muted")}</KitContent>
      {line("number", total, "text", "end")}
    </KitGrid></KitRow>,
    cells: visible.map((round) => {
      const { label: roundLabel, points } = rounds[round]!;
      const label = words.scoreCell(name, roundLabel);
      const score = points[player];
      const value = score == null ? "" : String(score);
      return { id: cellId(round, player), content:
        <KitRow item={cellId(round, player)} inline label={label}>
          {loading ? <KitSkeleton shape="control" kind="secondary" full />
            : readonly
            ? <KitText align="center" role="number" numberScale="compact" tabular part="score">{score == null ? labels.unplayed : numberLine(score, lang)}</KitText>
            : <KitInput compact kind="number" action="set" label={label} part="score"
                hint={labels.unplayed} value={value} min={scoreMin} max={scoreMax} step={1} />}
        </KitRow> };
    }),
  }));
  function line(role: "label" | "caption" | "number", text: string, tone: "accent" | "text" | "good" | "muted" = "text", align: "start" | "center" | "end" = "start") {
    return loading ? <KitSkeleton shape="figure" inset="none" content={[[role, text, align, "compact"]]} /> :
      <KitText {...{ role, tone, align }} part={null} numberScale="compact" tabular={role === "number"} lines={1}>{text}</KitText>;
  }
  return <KitTable part="matrix" columns={columns} rows={rows}
    fitColumns={columns.length <= 2 && players.every(({ name }) => name.length <= 12)}
    corner={<KitRow inline label={labels.player}><KitGrid fitLast>
      {line("label", labels.player, "muted")}{line("label", labels.total, "muted", "end")}
    </KitGrid></KitRow>} />;
}

// prettier-ignore
function ScoreActions({ share, loading, labels }: {share: boolean; loading: boolean; labels: Labels}) {
  if (loading) return <KitGrid>
    <KitSkeleton shape="control" kind="quiet" label={labels.reset} />
    {share && <KitSkeleton shape="control" kind="secondary" label={labels.share} full />}
  </KitGrid>;
  if (!share) return <KitAction kind="quiet" label={labels.reset} part="reset" />;
  return <KitGrid>
    <KitAction kind="quiet" label={labels.reset} part="reset" full />
    <KitAction kind="secondary" label={labels.share} part="share" full />
  </KitGrid>;
}

// prettier-ignore
export function ScoreSheet(input: SheetProps) {
  const state = useComponentState();
  const { lang, words: { scoreLabels: labels } } = useWords(playWordsFor);
  const loading = state === "loading", active = state === "filled";
  const selected = Number(input.selectedRound) - 1;
  if (state === "empty")
    return <KitCard part="root" padded><KitEmpty part="empty" decorativeIcon /></KitCard>;
  const { progress } = scoreCopy(input, lang);
  return <KitCard part={state === "success" ? "root" : "sheet"} padded>
    <KitContent>
      {loading ? <KitSkeleton shape="figure" inset="none" content={[["heading", labels.title], ["caption", progress]]} /> :
        <><KitText role="heading" part="title">{labels.title}</KitText>
          <KitText role="caption" tone="muted" part="progress">{progress}</KitText></>}
    </KitContent>
    {state !== "success" && <KitTrack part="root" {...(active ? { role: "radiogroup" } : {})} label={labels.rounds}>
      {input.rounds.map(({ label }, index) => <KitChip key={roundKey(index)} item={null} role="radio"
        label={label} value={roundKey(index)} on={index === selected} disabled={loading ? false : undefined} />)}
    </KitTrack>}
    <ScoreTable {...{ input, selected, loading }} readonly={!active && !loading} />
    {state !== "success" && <ScoreActions {...{ loading, labels }} share={input.share} />}
  </KitCard>;
}
