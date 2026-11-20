import { numberLine, type DrawState } from "../../../catalog";
import { playWordsFor } from "../lang";

type Player = { name: string; team?: number | undefined };
type Roster<P extends Player = Player> = {
  players: readonly P[];
  teams: readonly { label: string }[];
};

export function teamPickerCopy<P extends Player>(
  { players, teams }: Roster<P>,
  draw: DrawState | undefined,
  lang?: string,
) {
  const words = playWordsFor(lang).teamPicker;
  const assignments = draw?.kind === "partition" ? draw.teams : [];
  const grouped = assignments.length > 0;
  const slots = players.map((player, index) => assignments[index] ?? player.team);
  const unassigned = players.filter((_, index) => slots[index] === undefined);
  const panels = teams.map(({ label }, index) => ({
    id: `team_${index}`,
    label,
    players: players.filter((_, player) => slots[player] === index),
  }));
  if (unassigned.length) panels.unshift({ id: "unassigned", label: words.unassigned, players: unassigned });
  return {
    status: grouped ? words.grouped : words.ready,
    action: grouped ? ("remake" as const) : ("make" as const),
    panels: panels.map((panel) => ({ ...panel, count: numberLine(panel.players.length, lang) })),
  };
}

export function teamPickerReading(setup: Roster, draw: DrawState | undefined, lang?: string): string[] {
  const words = playWordsFor(lang).teamPicker;
  const { status, action, panels } = teamPickerCopy(setup, draw, lang);
  return [
    status,
    ...panels.map(({ label, count, players }) =>
      words.teamLine(
        label,
        count,
        players.length
          ? players.map(({ name, team }) => (team === undefined ? name : words.lockedName(name)))
          : [words.noPlayers],
      ),
    ),
    words[action],
  ];
}
