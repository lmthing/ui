import { useKit } from "../../provider";
import { usePartContext } from "../../part";
import { useControlValue } from "../../interact";
import type { AxisValue, IconName, ThemeDensity, SurfaceFinish } from "../../../catalog";
import { KitContent, KitIcon, KitText, type TextTone } from "../text";
import { KitPhoto } from "../media";
import { KitRank } from "../data";
import { KitRow } from "../surface";
import { KitCheck, KitTrail, type TrailKind } from "../helpers";
import { KitLayoutText } from "../layout";

export type ListItemRow = {
  id: string;
  title: string;
  meta?: string | undefined;
  fact?: string | undefined;
  badge?: string | undefined;
  icon?: IconName | undefined;
  photo?: string | undefined;
  trail?: TrailKind | undefined;
  value?: string | undefined;
  goto?: string | undefined;
  body?: string | undefined;
  me?: boolean | undefined;
  done?: boolean | undefined;
};
type ItemProps = {
  row: ListItemRow;
  style: "plain" | "inset" | "cards" | "shelf" | "expand" | "ranked";
  index: number;
  density?: ThemeDensity | undefined;
  detail?: AxisValue<"detail"> | undefined;
  lead?: AxisValue<"lead"> | undefined;
  trail?: TrailKind | undefined;
  tone?: AxisValue<"tone"> | undefined;
  mark?: AxisValue<"mark"> | undefined;
  surface?: SurfaceFinish | undefined;
  record?: boolean;
};
function titleTone({ row, tone, mark }: ItemProps): TextTone {
  if (row.me || mark === "new") return "accent";
  if (mark === "muted") return "muted";
  return !row.badge && tone && tone !== "neutral" ? tone : "text";
}

function ItemText(props: ItemProps) {
  const { row, density, detail, record, tone } = props;
  return (
    <>
      <KitLayoutText
        line={{
          text: row.title,
          tone: titleTone(props),
          part: "title",
          ...(record && { breakLongWords: true }),
        }}
        density={density}
      />
      {detail !== "brief" &&
        (["meta", "fact"] as const).map((part) => (
          <KitLayoutText
            key={part}
            line={{
              text: row[part],
              role: "caption",
              part,
              tone: "muted",
              ...(record && { breakLongWords: true }),
            }}
            density={density}
          />
        ))}
      {row.badge && (
        <KitTrail
          kind="badge"
          inline
          value={row.badge}
          part="badge"
          tone={tone === "neutral" ? "text" : tone}
          density={density}
        />
      )}
    </>
  );
}
function ShelfItem(props: ItemProps) {
  const { row, density, lead, mark, surface, tone } = props;
  const leading = lead === undefined ? undefined : itemLead(props);
  const cover = lead === undefined ? row.photo : undefined;
  const trailing = itemTrail(props);
  return (
    <KitRow
      item={row.id}
      label={row.title}
      goto={row.goto}
      tone={tone === "warn" && !row.badge ? tone : undefined}
      inset="none"
      leadingAlign={row.photo && (lead === "thumb" || lead === "avatar") ? "row" : "line"}
      trailing={cover ? undefined : trailing}
      {...{ density, mark, surface, leading }}
    >
      <KitContent lineRole="body" density={density}>
        {cover && <KitPhoto photo={cover} shape="wide" part="icon" label={row.title} />}
        {cover && trailing ? (
          <KitRow label={row.title} density={density} inline trailing={trailing}>
            <ItemText {...props} />
          </KitRow>
        ) : (
          <ItemText {...props} />
        )}
      </KitContent>
    </KitRow>
  );
}
function itemLead({ row, style, index, lead, density, record }: ItemProps) {
  if (lead === "none") return null;
  if (lead === "number") return <KitRank place={index + 1} part="rank" density={density} />;
  if (lead === "check")
    return row.done === undefined ? null : (
      <KitCheck done={row.done} readonly label={row.title} part="icon" />
    );
  if (lead === "icon") return row.icon ? <KitIcon name={row.icon} part="icon" /> : null;
  if (record && lead === "thumb" && row.icon && !row.photo) return <KitIcon name={row.icon} part="icon" />;
  if (lead === "thumb" || lead === "avatar") {
    return (
      row.photo && <KitPhoto photo={row.photo} shape={lead === "avatar" ? "round" : "thumb"} part="icon" />
    );
  }
  if (style === "ranked") return <KitRank place={index + 1} density={density} />;
  if (row.photo) return <KitPhoto photo={row.photo} part="icon" />;
  return <KitIcon name={row.icon} part="icon" />;
}

/** A compact record thumbnail or an identity monogram when the host has no image. */
export function KitRecordLead({ title, photo }: Pick<ListItemRow, "title" | "photo">) {
  const initial = title.match(/[\p{L}\p{N}]/u)?.[0] ?? Array.from(title)[0];
  return <KitPhoto photo={photo} initials={initial?.toUpperCase()} part="icon" decorative />;
}
function itemTrail({ row, style, trail, density, tone }: ItemProps) {
  if (trail === undefined && (style === "expand" || style === "shelf")) return null;
  const kind =
    style === "ranked" && trail === undefined
      ? row.value
        ? "value"
        : "none"
      : (row.trail ?? trail ?? "none");
  if (kind === "none" || (kind === "chevron" && (style === "expand" || !row.goto))) return null;
  return (
    <KitTrail
      kind={kind}
      value={row.value}
      part="trail"
      density={density}
      tone={kind === "badge" && tone !== "neutral" ? tone : undefined}
    />
  );
}

/** A shelf, expandable or ranked row, retaining the same addresses and live controls. */
export function KitListItem(props: ItemProps) {
  const { row, style, density, lead, mark, surface, record, tone } = props;
  const kit = useKit();
  const context = usePartContext();
  const open = useControlValue(`${context.screen}/${context.component}/${row.id}`, !kit.controller);
  if (style === "shelf") return <ShelfItem {...props} />;
  const expand = style === "expand";
  const recordRail = record && (lead === "icon" || lead === "thumb");
  const recordLead = recordRail && (row.photo || !row.icon);
  const photoLead = row.photo && (lead === undefined || lead === "thumb" || lead === "avatar");
  // Legacy `none` trails reserved an empty first-line slot. An explicitly adopted trail does not.
  const trailing =
    props.trail === undefined && style !== "ranked" && !expand && row.trail === "none" ? (
      <KitTrail kind="none" part="trail" />
    ) : (
      itemTrail(props)
    );
  return (
    <KitRow
      leadingAlign={recordLead || photoLead ? "row" : "line"}
      leadingWidth={recordRail ? "avatar" : undefined}
      item={row.id}
      label={row.title}
      goto={expand ? undefined : row.goto}
      tone={tone === "warn" && !row.badge ? tone : undefined}
      {...(expand ? { role: "button" as const, expanded: open } : {})}
      leading={recordLead ? <KitRecordLead title={row.title} photo={row.photo} /> : itemLead(props)}
      trailing={trailing}
      {...{ density, mark, surface }}
    >
      <ItemText {...props} />
      {expand && open && row.body && (
        <KitText role="body" density={density} tone="muted" part="body">
          {row.body}
        </KitText>
      )}
    </KitRow>
  );
}
