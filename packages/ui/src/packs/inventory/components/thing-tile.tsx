import type { ReactNode } from "react";
import { numberLine, type Props, type ThemeDensity } from "../../../catalog";
import * as kit from "../../../kit";
import { inlineCountMax, isLowStock, thingCopy, thingMetadata } from "../copy";
import { inventoryWordsFor } from "../lang";
import type { meta, props } from "./Things";

type Item = Props<typeof props, typeof meta>["items"][number];
type TileProps = {
  item: Item;
  peer: Item | undefined;
  layout: "rows" | "grid" | "wide";
  density: ThemeDensity;
  audit: boolean;
  stackControls: boolean;
  maxQuantity: number;
};

function ThingDetails({ item, peer, density }: Pick<TileProps, "item" | "peer" | "density">) {
  const { lang } = kit.useWords(inventoryWordsFor);
  const [condition, serial] = thingMetadata(item, lang);
  return (
    <kit.KitMetaLine
      title={{
        text: condition.text ?? (peer?.condition ? "\u00a0" : undefined),
        part: condition.text ? condition.part : null,
        role: "caption",
        tone: item.condition === "damaged" ? "warn" : "muted",
      }}
      meta={{
        text: serial.text ?? (peer?.serial ? "\u00a0" : undefined),
        part: serial.text ? serial.part : null,
        role: "caption",
      }}
      density={density}
    />
  );
}

// prettier-ignore
function AuditCounts({ item, density, stepper, stackControls }: Pick<TileProps, "item" | "density" | "stackControls"> & { stepper: ReactNode }) {
  const { lang, words: { things: words } } = kit.useWords(inventoryWordsFor);
  const label = { text: words.expected, role: "caption", tone: "muted" } as const;
  const value = {
    text: item.expected === undefined ? undefined : numberLine(item.expected, lang),
    part: "expected", role: "figure", compact: true, tabular: true,
  } as const;
  const expected = value.text && <kit.KitContent density={density}>
    <kit.KitLayoutText line={label} density={density} />
    <kit.KitLayoutText line={value} density={density} />
  </kit.KitContent>;
  const counted = <kit.KitContent density={density}>
    <kit.KitLayoutText line={{ text: words.counted, part: "counted", role: "caption", tone: "muted" }} density={density} />
    {stepper}
  </kit.KitContent>;
  return stackControls
    ? <kit.KitRowGroup separators={false} spacing="groups" density={density}>{expected}{counted}</kit.KitRowGroup>
    : <kit.KitGrid density={density}>
        <kit.KitContent density={density}>
          <kit.KitLayoutText line={label} align="end" density={density} />
          <kit.KitRow part={null} inline surface="plain" label="" trailing={
            <kit.KitLayoutText line={value} align="end" density={density} />
          } leadingAlign="row">{null}</kit.KitRow>
        </kit.KitContent>
        {counted}
      </kit.KitGrid>;
}

// prettier-ignore
export function ThingTile({ item, peer, layout, density, audit, maxQuantity, stackControls }: TileProps) {
  const rows = layout === "rows";
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const { value, low, initials } = thingCopy(item, lang);
  const photo = <kit.KitPhoto part="photo" label={item.name} initials={initials}
    {...(item.photo ? { photo: item.photo } : {})} {...(rows ? { shape: "thumb" } : { aspect: "wide" })} />;
  const labels = { less: words.things.less(item.name), more: words.things.more(item.name) };
  const stepper = <kit.KitStepper part="qty" value={item.qty} min={0} max={maxQuantity} labels={labels} />;
  const stockLine = value || low || peer?.value !== undefined || (peer && isLowStock(peer));
  const singleAuditLine = audit && !item.where && !stockLine && !item.serial && !item.condition;
  const detail = <kit.KitRow part="root" goto={item.goto} label={item.name} density={density} inline>
      <kit.KitContent density={rows ? "comfortable" : density} lead={rows ? photo : undefined}
        leadingAlign={singleAuditLine ? "line" : "row"} lineRole="body">
        {!rows && photo}
        <kit.KitText part="name" role="body" density={density}>{item.name}</kit.KitText>
        {(item.where || peer?.where) && <kit.KitText part={item.where ? "where" : null} role="caption" tone="muted" density={density}>{item.where ?? "\u00a0"}</kit.KitText>}
        {stockLine && <kit.KitText part={null} role="body" density={density}>
          {value && <kit.KitText part="value" role="number" numberScale="compact" tone="muted" emphasis="quiet" tabular density={density}>{value}</kit.KitText>}
          {value && low && words.things.priceStockSeparator}{low && <kit.KitText part="low" role="caption" tone="warn" density={density}>{low}</kit.KitText>}
          {!value && !low && "\u00a0"}
        </kit.KitText>}
        <ThingDetails {...{ item, peer, density }} />
      </kit.KitContent>
  </kit.KitRow>;
  if (audit) return <>{detail}<AuditCounts {...{ item, density, stepper, stackControls }} /></>;
  if (rows && item.qty <= inlineCountMax && !stackControls)
    return <kit.KitGrid fitLast density="compact">{detail}{stepper}</kit.KitGrid>;
  return <>{detail}
    <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>{stepper}</kit.KitContent>
  </>;
}

// prettier-ignore
export function ThingLoading({ item, peer, layout, density, audit, stackControls }: TileProps) {
  const rows = layout === "rows";
  const { lang, words } = kit.useWords(inventoryWordsFor);
  const { value, low, quantity } = thingCopy(item, lang);
  const stock = [value, low].filter(Boolean).join(words.things.priceStockSeparator);
  const reserveStock = peer?.value !== undefined || (peer && isLowStock(peer));
  const detail = <kit.KitSkeleton shape="figure" lead={rows ? "box" : "none"} inset="none" density={density}
      content={[["body", item.name], ["caption", item.where], ["body", stock || undefined],
        ...(layout === "grid" ? [] : thingMetadata(item, lang).map<["caption", string | undefined]>(({ text }) => ["caption", text]))]} />;
  const button = <kit.KitSkeleton shape="control" kind="secondary" inset="none" />;
  const count = <kit.KitSkeleton shape="figure" inset="none" content={[["number", quantity, "center", "compact"]]} />;
  const controls = <kit.KitRow part={null} inline surface="plain" label="" leading={button} leadingAlign="row" density="compact">
    <kit.KitRow part={null} inline surface="plain" label="" leading={count} leadingAlign="row" density="compact">{button}</kit.KitRow>
  </kit.KitRow>;
  if (audit) return <>{detail}<AuditCounts {...{ item, density, stackControls }} stepper={controls} /></>;
  if (rows && item.qty <= inlineCountMax && !stackControls)
    return <kit.KitGrid fitLast density={density}>{detail}{controls}</kit.KitGrid>;
  return <>
    {!rows && <kit.KitSkeleton shape="media" aspect="wide" content={[]} inset="none" density={density} />}
    <kit.KitContent density={density}>{detail}
      {!stock && reserveStock && <kit.KitText role="body" part={null} density={density}>{"\u00a0"}</kit.KitText>}
      {layout === "grid" && <ThingDetails {...{ item, peer, density }} />}
    </kit.KitContent>
    <kit.KitContent group={density === "compact" ? "content" : "response"} density={density}>{controls}</kit.KitContent>
  </>;
}
