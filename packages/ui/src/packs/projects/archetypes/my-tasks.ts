import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const my_tasks = {
  id: "my_tasks",
  job: "Review and edit my assigned project work",
  defaultLayout: "projects_assigned",
  layouts: {
    projects_assigned: {
      writeHints: ['Set Tasks.group to "sections" for the required grouping by project.'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Tasks"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "t1", c: "Tasks", group: "sections" },
        { id: "b1", c: "Button" },
      ],
    },
    projects_task_edit: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Field"], required: true, variant: "text" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Field"], required: true, variant: "choice" },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "f1", c: "Field", kind: "text" },
        { id: "f2", c: "Field", kind: "date" },
        { id: "f3", c: "Field", kind: "choice", options: [placeholderTitle(0), placeholderTitle(1)] },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "my_tasks",
    layout: "projects_assigned",
    brief:
      "Heading My work, with All and Due soon chips. Group my assigned work by project. For folio, Jo has Draft sitemap (sitemap) due 2026-11-18 and Design pages (pages), blocked by sitemap; both todo. Add a New task button to projects_task_edit.",
  },
  {
    kind: "compose",
    archetype: "my_tasks",
    layout: "projects_task_edit",
    brief:
      "Back heading Edit task. In order, text field Title set to Draft sitemap, date field Due set to 2026-11-18, choice field Priority with Normal, Low and High set to Normal, a multiline Notes entry with hint Describe the task, and one Save task button.",
  },
] satisfies ComposeProbe[];
