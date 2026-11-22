import { words as ProjectBriefWords } from "./en/ProjectBrief";
import { words as ProjectStatusWords } from "./en/ProjectStatus";
import { words as ScopeWords } from "./en/Scope";
import { words as TimeLogWords } from "./en/TimeLog";
import { words as GanttWords } from "./en/Gantt";
import { words as MilestonesWords } from "./en/Milestones";
import { words as TasksWords } from "./en/Tasks";
export const en = {
  ...ScopeWords,
  ...TimeLogWords,
  ...GanttWords,
  ...MilestonesWords,
  ...TasksWords,
  ...ProjectBriefWords,
  ...ProjectStatusWords,
};

export type ProjectsWords = typeof en;
