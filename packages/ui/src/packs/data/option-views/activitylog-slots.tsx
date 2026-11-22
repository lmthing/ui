import type { ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { FeedRow } from "../../../kit/renderers";
import { activityDiff, activityLabel, type ActivityEntry } from "../copy";
import { dataWordsFor } from "../lang";

type RowProps = {
  entry: ActivityEntry;
  density: ThemeDensity | undefined;
  avatar: boolean;
  upgraded: boolean;
};

// prettier-ignore
export function ActivityRow({ entry, density, avatar, upgraded }: RowProps) {
  const { lang } = kit.useWords(dataWordsFor);
  const { resolvePhoto } = kit.useKit();
  const loading = kit.useComponentState() === "loading";
  const { id, who, photo, text, time, goto } = entry;
  // The library's generic people placeholder is not an actor's portrait.
  const portrait =
    avatar && photo !== "lib:people" && resolvePhoto?.(photo) ? { photo } : { initials: Array.from(who)[0]! };
  if (upgraded) return <FeedRow density={density} row={{
    item: id, label: activityLabel(entry, lang), goto,
    ...(avatar && { avatar: { ...portrait, shape: "round", label: who, part: "photo" } }),
    author: { text: who, part: "who", role: "meta", tone: "muted" },
    title: { text, part: "text", strong: true },
    body: { text: entry.diff && activityDiff(entry.diff, lang), part: "diff", role: "caption", tone: "muted" },
    status: { text: time, part: "time", role: "caption", tone: "muted", tabular: true },
  }} />;
  return (
    <kit.KitRow
      item={id}
      part={loading ? null : "root"}
      goto={loading ? undefined : goto}
      label={activityLabel(entry, lang)}
      density={density}
      leadingAlign="row"
      leading={avatar ? <kit.KitPhoto {...portrait} shape="round" label={who} part={loading ? null : "photo"} loading={loading} /> : undefined}
      trailing={<kit.KitIcon name="chevron_right" decorative loading={loading} />}
    >
      <kit.KitLayoutText line={{ part: "who", text: who, strong: true }} density={density} />
      <kit.KitLayoutText line={{ part: "text", text, tone: "muted" }} density={density} />
      <kit.KitLayoutText line={{ part: "time", text: time, role: "caption", tone: "muted", tabular: true }} density={density} />
    </kit.KitRow>
  );
}
