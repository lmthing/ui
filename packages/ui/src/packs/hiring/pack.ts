import type { PackMeta } from "../../catalog";

export const pack = {
  id: "hiring",
  example:
    "Trot tracks openings, reviews applicants, records interviews and makes an offer for a summer walker.",
  probes: [
    {
      kind: "pack",
      idea: "My cafe needs to hire a summer barista. Track applicants against the job requirements, confirm interviews and record employment offers.",
      expect: ["hiring"],
    },
    {
      kind: "pack",
      idea: "I am looking for a new job. Keep track of my applications to different employers, interview dates and when I should follow up.",
      expect: ["hiring"],
    },
    {
      kind: "pack",
      idea: "Make a weekly shift rota for the staff we already employ, with swap requests and manager approval. No recruiting or job openings.",
      expect: ["team"],
    },
    {
      kind: "choose",
      need: "Display four barista openings as short, tappable rows, each with a title and a department subtitle. No full posting, pay terms or other controls.",
      expect: "List",
    },
  ],
} as const satisfies PackMeta;
