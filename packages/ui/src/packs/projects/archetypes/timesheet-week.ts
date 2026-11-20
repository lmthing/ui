import { placeholderTitle, type ArchetypeMeta, type ComposeProbe } from "../../../catalog";

export const timesheet_week = {
  id: "timesheet_week",
  job: "Review time spent on project deliverables and add a manual work entry",
  defaultLayout: "projects_time_week",
  layouts: {
    projects_time_week: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["TimeLog"], required: true },
        { allow: ["Bars"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "TimeLog" },
        { id: "b1", c: "Bars" },
        { id: "n1", c: "Note" },
      ],
    },
    projects_time_entry: {
      writeHints: ['The last Field is the Billable switch: kind "toggle" with value "on" or "off".'],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Field"], required: true, variant: "choice" },
        // The composer reserves slot variant "toggle" for List trails; request this kind in the hints.
        { allow: ["Field"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "date" },
        { id: "f2", c: "Field", kind: "time" },
        { id: "f3", c: "Field", kind: "time" },
        { id: "f4", c: "Field", kind: "choice", options: [placeholderTitle(0), placeholderTitle(1)] },
        { id: "f5", c: "Field", kind: "toggle" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "timesheet_week",
    layout: "projects_time_week",
    brief:
      "Heading This week. Week starts 2026-11-16. In project folio save billable Draft sitemap (sitemap) on Mon Nov 16 09:00–10:30 UTC and non-billable Prep images (images) on Tue Nov 17 09:00–09:30 UTC. Manual entry opens projects_time_entry. Compare Mon and Tue hours as bars (1.5 and 0.5 h), and note that this is not a payroll report.",
  },
  {
    kind: "compose",
    archetype: "timesheet_week",
    layout: "projects_time_entry",
    brief:
      "Heading Add work time. In order use date 2026-11-16, Start time 09:00, End time 10:30, choice Task with Sitemap and Images (Sitemap selected), Billable switch on, multiline Notes entry with hint What did you work on?, and one Save entry button.",
  },
] satisfies ComposeProbe[];
