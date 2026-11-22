import type { ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
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
  return (
    <kit.KitRow
      item={id}
      part={loading ? null : "root"}
      goto={loading ? undefined : goto}
      label={activityLabel(entry, lang)}
      density={density}
      inset={upgraded ? "none" : "md"}
      leadingAlign="row"
      leading={avatar ? <kit.KitPhoto {...portrait} shape="round" label={who} part={loading ? null : "photo"} loading={loading} /> : undefined}
      trailing={upgraded ? undefined : <kit.KitIcon name="chevron_right" decorative loading={loading} />}
    >
      <kit.KitContent density={density}>
        <kit.KitContent density={density} rhythm="flush">
          <kit.KitLayoutText line={{ part: "who", text: who, role: "meta", tone: "muted" }} density={density} />
          <kit.KitLayoutText line={{ part: "text", text, strong: true }} density={density} />
        </kit.KitContent>
        <kit.KitLayoutText density={density}
          line={{ text: entry.diff && activityDiff(entry.diff, lang), part: "diff", role: "caption", tone: "muted" }} />
        <kit.KitLayoutText density={density}
          line={{ part: "time", text: time, role: "caption", tone: "muted", tabular: true }} />
      </kit.KitContent>
    </kit.KitRow>
  );
}
