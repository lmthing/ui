import type { IconName } from "../../catalog";
import { KitContent } from "./KitContent";
import { KitIcon } from "./KitIcon";
import { KitPhoto } from "./KitPhoto";
import { KitRank } from "./KitRank";
import { KitRow } from "./KitRow";
import { KitText } from "./KitText";
import { KitTrail, type TrailKind } from "./helpers";

export type ListItemRow = {
  id: string;
  title: string;
  meta?: string | undefined;
  icon?: IconName | undefined;
  photo?: string | undefined;
  trail: TrailKind;
  value?: string | undefined;
  goto?: string | undefined;
  body?: string | undefined;
  me?: boolean | undefined;
};

/**
 * One row of a `List`, drawn for its style. `shelf`: a photo card for a sideways rail. `expand`: a button
 * row showing its body. `ranked`: a place number, the score at the end, the person's own row in accent.
 * Otherwise a plain row: icon or photo, title, meta and the chosen trail.
 */
export function KitListItem({
  row,
  style,
  index,
}: {
  row: ListItemRow;
  style: "plain" | "inset" | "cards" | "shelf" | "expand" | "ranked";
  index: number;
}) {
  const title = (
    <KitText role="body" tone={row.me ? "accent" : "text"} part="title">
      {row.title}
    </KitText>
  );
  const meta = row.meta && (
    <KitText role="caption" tone="muted" part="meta">
      {row.meta}
    </KitText>
  );
  if (style === "shelf") {
    return (
      <KitRow item={row.id} label={row.title} goto={row.goto} inset="none">
        <KitContent lineRole="body">
          {row.photo && <KitPhoto photo={row.photo} shape="wide" part="icon" label={row.title} />}
          {title}
          {meta}
        </KitContent>
      </KitRow>
    );
  }
  const expand = style === "expand";
  const ranked = style === "ranked";
  const leading = ranked ? (
    <KitRank place={index + 1} />
  ) : row.photo ? (
    <KitPhoto photo={row.photo} part="icon" />
  ) : (
    <KitIcon name={row.icon} part="icon" />
  );
  const trailing = expand ? undefined : ranked ? (
    row.value ? (
      <KitTrail kind="value" value={row.value} part="trail" />
    ) : undefined
  ) : (
    <KitTrail kind={row.trail} value={row.value} part="trail" />
  );
  return (
    <KitRow
      leadingAlign={row.photo ? "row" : "line"}
      item={row.id}
      label={row.title}
      goto={expand ? undefined : row.goto}
      {...(expand ? { role: "button" as const, expanded: true } : {})}
      leading={leading}
      trailing={trailing}
    >
      {title}
      {meta}
      {expand && row.body && (
        <KitText role="body" tone="muted" part="body">
          {row.body}
        </KitText>
      )}
    </KitRow>
  );
}
