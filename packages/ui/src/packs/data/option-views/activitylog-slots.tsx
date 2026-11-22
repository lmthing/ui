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
  const { id, who, photo, text, time, goto } = entry;
  // The library's generic people placeholder is not an actor's portrait.
  const portrait =
    avatar && photo !== "lib:people" && resolvePhoto?.(photo) ? { photo } : { initials: Array.from(who)[0]! };
  if (upgraded) return <FeedRow density={density} row={{
    item: id, label: activityLabel(entry, lang), goto,
    ...(avatar && { avatar: { ...portrait, shape: "round", label: who, part: "photo" } }),
    author: { text: who, part: "who", strong: true },
    title: { text, part: "text", tone: "muted" },
    body: { text: entry.diff && activityDiff(entry.diff, lang), part: "diff", role: "meta" },
    status: { text: time, part: "time", role: "caption", tone: "muted", tabular: true },
  }} />;
  return (
    <kit.KitRow
      item={id}
      goto={goto}
      label={activityLabel(entry, lang)}
      density={density}
      leadingAlign="row"
      leading={avatar ? <kit.KitPhoto {...portrait} shape="round" label={who} part="photo" /> : undefined}
      trailing={<kit.KitIcon name="chevron_right" decorative />}
    >
      <kit.KitText part="who" emphasis="strong" density={density}>
        {who}
      </kit.KitText>
      <kit.KitText part="text" tone="muted" density={density}>
        {text}
      </kit.KitText>
      <kit.KitText part="time" role="caption" tone="muted" density={density} tabular>
        {time}
      </kit.KitText>
    </kit.KitRow>
  );
}
