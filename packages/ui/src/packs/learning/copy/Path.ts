import { learningWordsFor } from "../lang";

export type PathUnitState = keyof ReturnType<typeof learningWordsFor>["path"]["status"];
type Unit = { title: string; state: PathUnitState };

export function pathUnitCopy(unit: Unit, isMilestone: boolean, lang?: string) {
  const { path } = learningWordsFor(lang);
  const status = path.status[unit.state];
  const milestone = isMilestone ? path.milestone : undefined;
  return { status, milestone, label: path.label(unit.title, status, milestone) };
}

export function readPath(
  units: readonly Unit[],
  milestones: readonly number[],
  brief: boolean,
  lang?: string,
) {
  const { path } = learningWordsFor(lang);
  return units.flatMap((unit, index) => {
    const { status, milestone } = pathUnitCopy(unit, milestones.includes(index), lang);
    if (!brief) return [path.label(unit.title, status, milestone)];
    return milestone ? [path.label(unit.title, milestone)] : [];
  });
}
