import { z } from "zod";
import {
  clip,
  detailOf,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";

const experienceLimit = 6;
const educationLimit = 4;
const skillLimit = 12;
const topSkills = 4;
const partNames = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${prefix}_${index + 1}`);
const experienceParts = partNames("experience", experienceLimit);
const summaryParts = partNames("summary", experienceLimit);
const educationParts = partNames("education", educationLimit);
const skillParts = partNames("skill", skillLimit);

// Core first: Profile with default identity and supporting text cannot show a structured CV,
// career and education histories, skill tags, an attachment or a live availability switch.
export const meta = {
  id: "ResumeProfile",
  status: "draft",
  group: "content",
  tier: "phone",
  pick: "A job seeker's structured CV with work history, education, skills and an optional attachment. For just a name, one supporting line and optional portrait, use Profile. Not employer applicant review (Candidate) or flat facts (KeyValue).",
  purpose: "Show a job seeker’s work history, education, skills and availability.",
  region: "body",
  weight: 3,
  realPath:
    "The CV and availability are stored on the phone; the host opens local attachments or shares the profile.",
  dense: true,
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: {
    "detail.brief": {
      hides: [
        "location",
        "education",
        "cv",
        "share",
        ...experienceParts.slice(1),
        ...summaryParts,
        ...educationParts,
        ...skillParts.slice(topSkills),
      ],
    },
  },
  parts: [
    "root",
    "name",
    "headline",
    "location",
    "experience",
    "education",
    "skills",
    "skill_chips",
    "open",
    "edit",
    "cv",
    "share",
    "empty",
    "success",
    "error",
    ...experienceParts,
    ...summaryParts,
    ...educationParts,
    ...skillParts,
  ],
  actions: {
    parts: { open: ["toggle"], edit: ["press"], cv: ["press"], share: ["press"] },
    when: { edit: { canEdit: true }, cv: { canPreview: true }, share: { canShare: true } },
    noGoto: { parts: ["cv", "share"] },
  },
  partTiers: { share: "service" },
  states: ["filled", "empty", "loading", "success", "error"],
  readSuccess: true,
  successActions: ["open.toggle", "edit.press", "cv.press", "share.press"],
  writeHints: [
    "Keep work history in newest-first order if using dates written as words. Do not invent jobs, qualifications, skills or a file.",
    'Use detail "brief" only for a short résumé that shows the headline, latest role and top skills. Keep all supplied experience and education in the record.',
    "Set density, surface and detail to null in a normal résumé. For brief detail leave density and surface null unless a separate visual finish is requested.",
  ],
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  name: text(24),
  headline: text(60),
  location: text(28).optional(),
  openToWork: z.boolean(),
  experience: z
    .array(
      z.strictObject({
        role: text(32),
        org: text(32),
        start: text(10),
        end: text(10).optional(),
        summary: text(120).optional(),
      }),
    )
    .min(0)
    .max(experienceLimit),
  education: z
    .array(z.strictObject({ credential: text(36), school: text(32), year: text(8).optional() }))
    .min(0)
    .max(educationLimit),
  skills: z.array(text(20)).min(0).max(skillLimit),
  cvLabel: text(32).optional(),
  editGoto: screenId.optional(),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const [item] = itemsOf(cast, 1);
  return {
    name: (item && titleOf(item, 24, thing)) ?? clip(placeholderTitle(0, lang), 24),
    headline: (item && detailOf(item, 60, thing)) ?? wordsFor(lang).placeholderDetail,
    openToWork: false,
    experience: [],
    education: [],
    skills: [],
  };
}

const resume = {
  name: "Sam Patel",
  headline: "Dog walker and animal care assistant",
  location: "North Park",
  openToWork: true,
  experience: [
    {
      role: "Dog walker",
      org: "Trot",
      start: "2025",
      summary: "Lead weekday walking groups and keep owners updated.",
    },
    { role: "Shelter volunteer", org: "Green Lane Rescue", start: "2023", end: "2025" },
  ],
  education: [{ credential: "Animal Care Certificate", school: "North College", year: "2023" }],
  skills: ["Group handling", "Pet first aid", "Route planning", "Owner updates", "Animal welfare"],
  cvLabel: "Sam Patel CV",
  editGoto: "resume_edit",
} satisfies z.input<typeof props>;

export const examples: z.input<typeof props>[] = [
  resume,
  { ...resume, detail: "brief", density: "compact", surface: "outlined" },
];

const { choose, write, read } = probesFor("ResumeProfile");
export const probes = [
  choose(
    "Let a job seeker show their dated work history, education, skill tags, CV attachment and open-to-work toggle.",
  ),
  choose(
    "Show my name and short job title under my portrait. No career history, education, skills or settings.",
    "Profile",
  ),
  write(
    "Show Sam Patel’s resume, headline Dog walker and animal care assistant, in North Park and open to work. Sam has worked as Dog walker at Trot since 2025 and earned an Animal Care Certificate from North College in 2023. List Group handling and Pet first aid, attach the label Sam Patel CV, and link to resume_edit.",
  ),
  {
    ...write(
      "Keep Sam Patel’s resume data: Dog walker at Trot since 2025 and Shelter volunteer at Green Lane Rescue from 2023 to 2025, Animal Care Certificate from North College in 2023, Group handling and Pet first aid. Headline Dog walker, open to work. Show only the headline, latest role and top skills, not full history or education.",
    ),
    variant: { axis: "detail", value: "brief" },
    expectProps: {
      experience: [{ role: "Dog walker" }, { role: "Shelter volunteer" }],
      education: [{ school: "North College" }],
    },
  },
  read("Turn off my open-to-work status.", { address: "r1/open", action: "toggle" }),
] satisfies Probe[];

export function ResumeProfile(_input: Props<typeof props, typeof meta>) {
  return null;
}
