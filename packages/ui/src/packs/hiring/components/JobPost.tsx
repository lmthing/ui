import { z } from "zod";
import * as c from "../../../catalog";
import { payPeriods, seedGoto, seedJobId, seedRows } from "../seeds";
import { prompt } from "../../../entry/prompt-JobPost.generated";

// Core first: Card/card can spotlight a role but cannot show structured pay terms and an application window.
export const meta = {
  id: "JobPost",
  status: "draft",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { publish: "service" },
  realPath:
    "An opening and its save state live on the phone, while publishing needs a job board or website service.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: [
    "root",
    "title",
    "employer",
    "place",
    "workplace",
    "contract",
    "pay",
    "about",
    "requirements",
    "closes",
    "save",
    "apply",
    "publish",
  ],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { save: ["toggle"], apply: ["press"], publish: ["press"] },
    when: { apply: { acceptingApplications: true } },
    noGoto: { parts: ["publish"] },
  },
  live: {
    derive: ({ closes }) => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return { acceptingApplications: typeof closes !== "string" || closes >= today };
    },
  },
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  jobId: c.text(32),
  title: c.text(32),
  employer: c.text(32),
  place: c.text(36).optional(),
  workplace: z.enum(["onsite", "hybrid", "remote"]),
  contract: z.enum(["permanent", "fixed_term", "casual", "volunteer"]),
  pay: z
    .strictObject({
      min: z.number().min(0),
      max: z.number().min(0),
      per: z.enum(payPeriods),
    })
    .refine(({ min, max }) => min <= max, "Pay minimum cannot exceed maximum")
    .optional(),
  about: c.text(400),
  requirements: z.array(c.text(80)).min(1).max(6),
  closes: c.isoDate.optional(),
  saved: z.boolean(),
  goto: c.screenId,
});

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const [row] = seedRows(input, 1);
  return {
    jobId: seedJobId,
    title: row!.title(32),
    employer: row!.detail(32),
    workplace: "onsite",
    contract: "casual",
    about: row!.detail(400),
    requirements: [row!.detail(80)],
    saved: false,
    goto: seedGoto,
  };
}

export const examples: z.input<typeof props>[] = [
  {
    jobId: "walker",
    title: "Summer dog walker",
    employer: "Trot",
    place: "North Park",
    workplace: "onsite",
    contract: "fixed_term",
    pay: { min: 18, max: 22, per: "hour" },
    about: "Lead weekday group walks and give each owner a short update.",
    requirements: ["Experience handling groups of dogs", "Available weekday mornings"],
    closes: "2027-04-30",
    saved: false,
    goto: "apply",
  },
  {
    jobId: "editor",
    title: "Copy editor",
    employer: "Harbour Press",
    workplace: "remote",
    contract: "permanent",
    about: "Edit two short newsletters each week.",
    requirements: ["A recent editing sample"],
    saved: true,
    goto: "editor_apply",
    density: "compact",
    surface: "outlined",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("JobPost");
export const probes: c.Probe[] = [
  choose(
    "Show one job opening with an hourly pay range, work arrangement, requirements, an apply link and a closing date.",
  ),
  choose(
    "On the welcome screen, put a tappable preview with one photo, the role title and a one-line teaser. The entire preview opens a separate details screen; don't show pay, requirements or application controls here.",
    "Card",
  ),
  write(
    "Post Trot's on-site, fixed-term Summer dog walker role in North Park, paying 18 to 22 an hour. Lead weekday group walks; group handling experience is required. Closes 2027-04-30. It is not saved; link to the apply form.",
  ),
  read("Bookmark this opening on my phone.", { address: "j1/save", action: "toggle" }),
] satisfies c.Probe[];
