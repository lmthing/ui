import { appointmentDate, type StateName } from "../../../catalog";
import { projectsWordsFor } from "../lang";

type Dates = {
  owner?: string | undefined;
  start?: string | undefined;
  target?: string | undefined;
  detail: "full" | "brief";
};
type Brief = Dates & { title: string; objective: string; sections: { heading: string; body: string }[] };

export function projectBriefCopy(input: Dates, lang?: string) {
  const { projectBrief: w } = projectsWordsFor(lang);
  const start = input.detail === "full" && input.start ? appointmentDate(input.start, lang) : undefined;
  const target = input.target && appointmentDate(input.target, lang);
  const window =
    start && target && start !== target
      ? w.window(start, target)
      : target
        ? w.target(target)
        : start
          ? w.start(start)
          : undefined;
  return { owner: input.owner && w.owner(input.owner), window };
}

export function projectBriefReading(input: unknown, state: StateName, lang?: string) {
  if (state !== "filled") return [];
  const brief = input as Brief;
  const { projectBrief: w } = projectsWordsFor(lang);
  const { owner, window } = projectBriefCopy(brief, lang);
  return [
    brief.title,
    brief.objective,
    owner,
    window,
    ...(brief.detail === "full" ? brief.sections.map(({ heading, body }) => w.section(heading, body)) : []),
  ].filter((line): line is string => Boolean(line));
}
