import { localeOf } from "../../../catalog";
import { teamWordsFor } from "../lang";

export const directorySearchMax = 32;
type Member = {
  id: string;
  name: string;
  role: string;
  department?: string | undefined;
  manager?: string | undefined;
  photo?: string | undefined;
  availability: "on_shift" | "break" | "pto" | "off";
};
type Directory<T extends Member> = { departments: string[]; members: T[]; detail: "full" | "brief" };

const searchKey = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function projectDirectory(input: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const { members, detail, query } = input as Directory<Member> & { query?: string };
  const tokens = searchKey(query ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    ...input,
    members: members
      .filter(({ name, role, department, manager }) => {
        const fields = searchKey([name, role, department, manager].filter(Boolean).join(" "));
        return tokens.every((token) => fields.includes(token));
      })
      .map((member) => ({ ...member, $detail: detail })),
  };
}

export function directoryGroups<T extends Member>(input: Directory<T>, lang?: string) {
  const collator = new Intl.Collator(localeOf(lang), { sensitivity: "base" });
  const members = [...input.members].sort((a, b) => collator.compare(a.name, b.name));
  if (!members.length) return [];
  if (input.detail === "brief") return [{ department: undefined, members }];
  const groups = new Map<string | undefined, T[]>();
  for (const department of input.departments) groups.set(department, []);
  for (const member of members) {
    const group = groups.get(member.department);
    if (group) group.push(member);
    else groups.set(member.department, [member]);
  }
  const other = teamWordsFor(lang).teamDirectory.other;
  return [...groups].flatMap(([department, rows]) =>
    rows.length ? [{ department: department ?? other, members: rows }] : [],
  );
}

export function directoryInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
}

export function directoryReading(input: Directory<Member>, lang?: string): string[] {
  const words = teamWordsFor(lang).teamDirectory;
  const groups = directoryGroups(input, lang);
  if (!groups.length) return [words.empty];
  return [
    words.title,
    words.search,
    ...groups.flatMap(({ department, members }) => [
      ...(department ? [department] : []),
      ...members.map((row) =>
        words.summary(row.id, row.name, [
          row.role,
          words.status[row.availability],
          ...(!row.photo ? [directoryInitials(row.name)] : []),
          ...(row.manager ? [words.manager(row.manager)] : []),
        ]),
      ),
    ]),
  ];
}
