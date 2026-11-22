import { numberLine, pluralForm } from "../../../catalog";
import { sportsWordsFor } from "../lang";

type BadgeData = {
  rating?: number | undefined;
  cards?: readonly ("yellow" | "red")[] | undefined;
  goals?: number | undefined;
};
type Player = BadgeData & { id: string; line: number | undefined; name: string; number: number };
type Line = { players: readonly unknown[] };

export function hasPlayerBadges({ rating, cards, goals }: BadgeData) {
  return rating !== undefined || cards !== undefined || goals !== undefined;
}

export function playerBadges({ rating, cards, goals }: BadgeData, lang?: string) {
  const { lineup } = sportsWordsFor(lang);
  const badges: { part: string; text: string }[] = [];
  if (rating !== undefined) badges.push({ part: "rating", text: lineup.rating(numberLine(rating, lang)) });
  if (cards)
    badges.push({ part: "cards", text: cards.map((card) => lineup.cards[card]).join(lineup.badgeSeparator) });
  if (goals !== undefined)
    badges.push({
      part: "goals",
      text: lineup.goals(numberLine(goals, lang), pluralForm(goals, lang) === "one"),
    });
  return badges;
}

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

export function playerGroups<T extends Pick<Player, "line">>(players: readonly T[]) {
  const groups = new Map<number | undefined, T[]>();
  for (const player of players) {
    const group = groups.get(player.line);
    if (group) group.push(player);
    else groups.set(player.line, [player]);
  }
  return [...groups];
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
  for (const player of input.players) {
    const { id, name, number, line } = player;
    if (line === undefined && !seenBench) {
      lines.push(lineup.bench);
      seenBench = true;
    }
    lines.push(
      [
        lineup.read(id, name, numberLine(number, lang)),
        ...playerBadges(player, lang).map(({ text }) => text),
      ].join(lineup.badgeSeparator),
    );
  }
  return lines;
}
