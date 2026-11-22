import { appointmentDate, isoDate } from "../../../catalog";
import { hiringWordsFor } from "../lang";

type Experience = {
  role: string;
  org: string;
  start: string;
  end?: string | undefined;
  summary?: string | undefined;
};
type Education = { credential: string; school: string; year?: string | undefined };
type Resume = {
  openToWork: boolean;
  experience: readonly Experience[];
  education: readonly Education[];
  skills: readonly string[];
  location?: string | undefined;
  cvLabel?: string | undefined;
  editGoto?: string | undefined;
};

function sortableDate(value: string) {
  const candidate = /^\d{4}$/.test(value)
    ? `${value}-01-01`
    : /^\d{4}-\d{2}$/.test(value)
      ? `${value}-01`
      : value;
  return isoDate.safeParse(candidate).success ? candidate : undefined;
}

function byNewest(rows: readonly Experience[]) {
  const dated = rows.map((row) => ({ row, start: sortableDate(row.start) }));
  if (dated.some(({ start }) => start === undefined)) return rows;
  return dated.sort((a, b) => b.start!.localeCompare(a.start!)).map(({ row }) => row);
}

export function resumeProjection<T extends Resume>(input: T, brief: boolean, topSkills: number) {
  const experience = byNewest(input.experience);
  const cvLabel = brief ? undefined : input.cvLabel;
  return {
    ...input,
    location: brief ? undefined : input.location,
    experience: brief ? experience.slice(0, 1).map((row) => ({ ...row, summary: undefined })) : experience,
    education: brief ? [] : input.education,
    skills: brief ? input.skills.slice(0, topSkills) : input.skills,
    cvLabel,
    goto: input.editGoto,
    canEdit: Boolean(input.editGoto),
    canPreview: Boolean(cvLabel),
    canShare: !brief,
  };
}

export function resumeExperienceLine(row: Experience, lang?: string) {
  const words = hiringWordsFor(lang).resumeProfile;
  const date = (value: string) => (isoDate.safeParse(value).success ? appointmentDate(value, lang) : value);
  return words.metaLine(row.org, words.dateRange(date(row.start), row.end ? date(row.end) : words.present));
}

export function resumeEducationLine(row: Education, lang?: string) {
  const words = hiringWordsFor(lang).resumeProfile;
  return row.year ? words.metaLine(row.school, row.year) : row.school;
}

export function resumeReading(input: ReturnType<typeof resumeProjection>, lang?: string) {
  const words = hiringWordsFor(lang).resumeProfile;
  return [
    input.openToWork ? words.open : words.notOpen,
    ...(input.experience.length
      ? [
          words.experience,
          ...input.experience.flatMap((row) => [
            row.role,
            resumeExperienceLine(row, lang),
            ...(row.summary ? [row.summary] : []),
          ]),
        ]
      : []),
    ...(input.education.length
      ? [
          words.education,
          ...input.education.flatMap((row) => [row.credential, resumeEducationLine(row, lang)]),
        ]
      : []),
    ...(input.skills.length ? [words.skills, ...input.skills] : []),
    ...(input.canEdit ? [words.edit] : []),
    ...(input.cvLabel ? [words.preview(input.cvLabel)] : []),
    ...(input.canShare ? [words.share] : []),
  ];
}
