import { useSignatureProgress } from "../../motion";
import { XStack, YStack } from "tamagui";
import { component, numberLine, radius, space, type as typography } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useWords } from "../../provider";
import { KitText } from "../text";

function Bar({
  label,
  value,
  max,
  high,
  part = "root",
  labelPart = "label",
}: {
  label: string;
  value: number;
  max: number;
  high: boolean;
  part?: string;
  labelPart?: string | null;
}) {
  const { lang } = useWords();
  const progress = useSignatureProgress("bars_grow");
  const share = max > 0 ? Math.max(0, value) / max : 0;
  return (
    <YStack
      {...usePart(part)}
      flex={1}
      flexBasis={component.base.none}
      minWidth={component.base.none}
      alignItems="center"
      gap={space.xs}
    >
      <YStack
        height={component.base.barsHeight + typography.caption.lineHeight + space.xs}
        width="100%"
        justifyContent="flex-end"
        alignItems="center"
        gap={space.xs}
      >
        <KitText role="caption" tone={high ? "text" : "muted"} part={null} tabular>
          {numberLine(value, lang)}
        </KitText>
        <YStack
          width="70%"
          height={Math.max(share * component.base.barsHeight * progress, space.xs)}
          borderTopLeftRadius={radius.sm}
          borderTopRightRadius={radius.sm}
          backgroundColor={high ? "$accent" : "$line"}
          aria-hidden
        />
      </YStack>
      <KitText role="caption" tone="muted" part={labelPart} lines={1}>
        {label}
      </KitText>
    </YStack>
  );
}

type BarValue = { label: string; value: number };
type PairedBar = BarValue & { part: string };
type BarsProps = (
  | { points: (BarValue & { id: string })[]; pair?: never }
  | { points?: never; pair: readonly [PairedBar, PairedBar] }
) & { highlight?: number };

/**
 * Amounts across days or categories: one column per point, scaled to the largest, the largest (or the
 * `highlight` index) in `$accent`, the rest in `$line`, labels under each. Each point is an item
 * (`<item>/root`, `<item>/label`). In pair mode both bars stay in the caller's scope, with one part
 * per labeled bar. The bar drawing is hidden from assistive tech; put values in the read line.
 */
export function KitBars({ points, pair, highlight }: BarsProps) {
  const context = usePartContext();
  const bars = pair ?? points;
  const max = Math.max(...bars.map((p) => p.value), 0);
  const top = highlight ?? bars.findIndex((p) => p.value === max);
  return (
    <XStack gap={space.xs} alignItems="flex-end">
      {pair
        ? pair.map((bar, index) => (
            <Bar key={bar.part} {...bar} max={max} high={index === top} labelPart={null} />
          ))
        : points.map((point, index) => (
            <PartContext.Provider key={point.id} value={{ ...context, item: point.id }}>
              <Bar label={point.label} value={point.value} max={max} high={index === top} />
            </PartContext.Provider>
          ))}
    </XStack>
  );
}
