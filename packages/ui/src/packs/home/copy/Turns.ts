import { homeWordsFor } from "../lang";

export function visibleTurns<T>(people: T[], at: number): T[] {
  return [...people.slice(at), ...people.slice(0, at)].slice(0, 3);
}

export function turnReading(people: readonly { name: string }[], lang?: string): string[] {
  const { turnLabels, turnHolder, turnQueue } = homeWordsFor(lang);
  const [current, ...upcoming] = people.map(({ name }) => name);
  return [
    turnHolder(turnLabels.current, current!),
    turnHolder(turnLabels.upcoming, turnQueue(upcoming)),
    turnLabels.next,
    turnLabels.skip,
  ];
}
