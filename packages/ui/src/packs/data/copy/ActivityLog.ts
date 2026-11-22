import { dataWordsFor } from "../lang";

export const activityKinds = ["created", "updated", "deleted"] as const;
export const activityFilters = ["all", ...activityKinds] as const;
export type ActivityFilter = (typeof activityFilters)[number];
type Change = { old: string; new: string };
export type ActivityEntry = {
  id: string;
  who: string;
  photo: string;
  text: string;
  time: string;
  goto: string;
  kind?: string | undefined;
  diff?: Change | undefined;
};

export function activityLive({
  entries: rows,
  kind,
  lead,
}: Record<string, unknown>): Record<string, unknown> {
  const entries = rows as ActivityEntry[];
  const options = activityOptions(entries);
  const active = options.find(({ value }) => value === kind)?.value ?? "all";
  return {
    kind: options.length ? active : undefined,
    kindOptions: options,
    hasKinds: Boolean(options.length),
    entries: entries.map((entry) => {
      const { photo: _photo, ...withoutPhoto } = entry;
      return {
        ...(lead === "none" ? withoutPhoto : entry),
        shown: active === "all" || entry.kind === active,
      };
    }),
  };
}

export function activityReading(
  { entries, kind }: { entries: ActivityEntry[]; kind?: ActivityFilter | undefined },
  lang?: string,
) {
  const words = dataWordsFor(lang);
  return [
    ...(kind && entries.some((entry) => entry.kind) ? [words.activityKind, words.activityKinds[kind]] : []),
    ...entries.flatMap(({ id, diff }) => (diff ? [`${id}: ${activityDiff(diff, lang)}`] : [])),
  ];
}

export function activityOptions(entries: readonly { kind?: string | undefined }[], lang?: string) {
  const available = activityKinds.filter((kind) => entries.some((entry) => entry.kind === kind));
  const values = available.length ? (["all", ...available] as const) : [];
  const words = dataWordsFor(lang);
  return values.map((value) => ({ value, label: words.activityKinds[value] }));
}

export function activityDiff(diff: Change, lang?: string) {
  return dataWordsFor(lang).activityDiff(diff.old, diff.new);
}

export function activityLabel(
  { who, text, time, diff }: { who: string; text: string; time: string; diff?: Change | undefined },
  lang?: string,
): string {
  const words = dataWordsFor(lang);
  return words.activityLabel(who, text, time, diff && activityDiff(diff, lang));
}
