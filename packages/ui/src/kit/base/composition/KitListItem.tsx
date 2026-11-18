import { useKit } from "../../provider";
import { usePartContext } from "../../part";
import { useControlValue } from "../../interact";
import type { IconName } from "../../../catalog";
import { KitContent, KitIcon, KitText } from "../text";
import { KitPhoto } from "../media";
import { KitRank } from "../data";
import { KitRow } from "../surface";
import { KitTrail, type TrailKind } from "../helpers";

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
type ItemProps = {
  row: ListItemRow;
  style: "plain" | "inset" | "cards" | "shelf" | "expand" | "ranked";
  index: number;
};
function ItemText({ row }: { row: ListItemRow }) {
  return (
    <>
      <KitText role="body" tone={row.me ? "accent" : "text"} part="title">
        {row.title}
      </KitText>
      {row.meta && (
        <KitText role="caption" tone="muted" part="meta">
          {row.meta}
        </KitText>
      )}
    </>
  );
}
function ShelfItem({ row }: { row: ListItemRow }) {
  return (
    <KitRow item={row.id} label={row.title} goto={row.goto} inset="none">
      <KitContent lineRole="body">
        {row.photo && <KitPhoto photo={row.photo} shape="wide" part="icon" label={row.title} />}
        <ItemText row={row} />
      </KitContent>
    </KitRow>
  );
}
function ItemLead({ row, style, index }: ItemProps) {
  if (style === "ranked") return <KitRank place={index + 1} />;
  if (row.photo) return <KitPhoto photo={row.photo} part="icon" />;
  return <KitIcon name={row.icon} part="icon" />;
}
function ItemTrail({ row, style }: ItemProps) {
  if (style === "expand") return null;
  if (style === "ranked") return row.value ? <KitTrail kind="value" value={row.value} part="trail" /> : null;
  return <KitTrail kind={row.trail} value={row.value} part="trail" />;
}

/** A shelf, expandable or ranked row, retaining the same addresses and live controls. */
export function KitListItem(props: ItemProps) {
  const { row, style } = props;
  const kit = useKit();
  const context = usePartContext();
  const open = useControlValue(`${context.screen}/${context.component}/${row.id}`, !kit.controller);
  if (style === "shelf") return <ShelfItem row={row} />;
  const expand = style === "expand";
  return (
    <KitRow
      leadingAlign={row.photo ? "row" : "line"}
      item={row.id}
      label={row.title}
      goto={expand ? undefined : row.goto}
      {...(expand ? { role: "button" as const, expanded: open } : {})}
      leading={<ItemLead {...props} />}
      trailing={expand || (style === "ranked" && !row.value) ? undefined : <ItemTrail {...props} />}
    >
      <ItemText row={row} />
      {expand && open && row.body && (
        <KitText role="body" tone="muted" part="body">
          {row.body}
        </KitText>
      )}
    </KitRow>
  );
}
