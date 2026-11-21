import { numberLine } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type Player = { id: string; line: number | undefined; name: string; number: number };
type Line = { players: readonly unknown[] };

export function formationLabel(lines: readonly Line[], lang?: string) {
  const { lineup } = sportsWordsFor(lang);
  return lines.map(({ players }) => numberLine(players.length, lang)).join(lineup.separator);
}

export function pitchLines(players: readonly Player[], lang?: string) {
  const lines: { id: string; players: ReturnType<typeof pitchPlayer>[] }[] = [];
  for (const player of players) {
    if (player.line === undefined) continue;
    const line = (lines[player.line] ??= { id: player.id, players: [] });
    line.players.push(pitchPlayer(player, lang));
  }
  return lines;
}

function pitchPlayer({ id, name, number }: Player, lang?: string) {
  return {
    id,
    label: name,
    number: numberLine(number, lang),
    namePart: "name",
    numberPart: "number",
    target: { item: id, part: "root" },
  };
}

export function lineupReading(
  input: { players: readonly Player[]; lines: readonly Line[]; detail?: "full" | "brief" },
  lang?: string,
) {
  const { lineup } = sportsWordsFor(lang);
  const lines = [lineup.title];
  if (input.detail !== "brief") lines.push(formationLabel(input.lines, lang));
  let seenBench = false;
  for (const { id, name, number, line } of input.players) {
    if (line === undefined && !seenBench) {
      lines.push(lineup.bench);
      seenBench = true;
    }
    lines.push(lineup.read(id, name, numberLine(number, lang)));
  }
  return lines;
}
