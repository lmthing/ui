import { useSignatureProgress } from "../../motion";
import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import {
  component,
  radius,
  size,
  space,
  digitsLine,
  timeOfDayLine,
  type as typography,
  type ThemeDensity,
} from "../../../catalog";
import { useKit, useWords, useVariantDensity } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitIcon, KitText, useTextStep } from "../text";

type Tone = "neutral" | "good" | "warn" | "bad";
const fill = { neutral: "$accentSoft", good: "$goodSoft", warn: "$warnSoft", bad: "$badSoft" } as const;
const edge = { neutral: "$accent", good: "$good", warn: "$warn", bad: "$bad" } as const;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export type HourBlock = { id: string; start: string; end: string; title: string; tone?: Tone; goto?: string };

function blockLink(press: (() => void) | undefined) {
  if (!press) return {};
  return {
    onPress: press,
    focusable: true,
    onKeyDown: (event: { key?: string; preventDefault(): void; stopPropagation(): void }) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      event.stopPropagation();
      press();
    },
  };
}

function Block({
  block,
  top,
  height,
  density,
}: {
  block: HourBlock;
  top: number;
  height: number;
  density: ThemeDensity;
}) {
  const kit = useKit();
  const { lang, words } = useWords();
  const start = timeOfDayLine(block.start, lang);
  const end = timeOfDayLine(block.end, lang);
  const part = usePart();
  const tone = block.tone ?? "neutral";
  const progress = useSignatureProgress("day_unfold");
  const pad = density === "compact" ? space.xs : space.sm;
  const press = kit.interactive && block.goto ? () => kit.onLink?.(block.goto!, part.testID) : undefined;
  return (
    <YStack
      {...part}
      position="absolute"
      top={top}
      left={0}
      right={0}
      height={height}
      opacity={progress}
      scaleY={progress}
      paddingHorizontal={space.md}
      paddingVertical={pad}
      justifyContent="center"
      borderRadius={radius.sm}
      borderLeftWidth={component.base.strongBorder * 2}
      borderLeftColor={edge[tone]}
      backgroundColor={fill[tone]}
      overflow="hidden"
      accessibilityRole={block.goto ? "link" : "text"}
      accessibilityLabel={words.hoursLabel(start, end, block.title)}
      {...blockLink(press)}
    >
      <XStack alignItems="center" gap={space.xs}>
        <YStack flex={component.base.bodyFlex} minWidth={component.base.none}>
          <KitText role="body" part="title" lines={1} density={density}>
            {block.title}
          </KitText>
          <KitText role="caption" tone="muted" part="time" tabular lines={1} density={density}>
            {`${start}–${end}`}
          </KitText>
        </YStack>
        {block.goto && <KitIcon name="chevron_right" decorative />}
      </XStack>
    </YStack>
  );
}

function HourTicks({
  hours,
  hour,
  density,
}: {
  hours: readonly number[];
  hour: number;
  density: ThemeDensity;
}) {
  const { lang } = useWords();
  return (
    <YStack width={component.base.timeWidth} aria-hidden>
      {hours.map((h, i) => (
        <YStack key={h} height={i === hours.length - 1 ? undefined : hour}>
          <KitText role="caption" tone="muted" part={null} tabular density={density}>
            {`${digitsLine(h, 2, lang)}:${digitsLine(0, 2, lang)}`}
          </KitText>
        </YStack>
      ))}
    </YStack>
  );
}

function useHourScale(density: ThemeDensity) {
  const spacing = useVariantDensity(density);
  const step = useTextStep({ density });
  const compact = density === "compact";
  return {
    gap: space[spacing.contentGap],
    hour: component.base.hourHeight - (compact ? space.sm : component.base.none),
    minimum:
      typography[step("body")].lineHeight +
      typography[step("caption")].lineHeight +
      (compact ? space.xs : space.sm) * 2,
  };
}

function placedHours(blocks: readonly HourBlock[], first: number, hour: number, minimum: number) {
  const minutesAt = (time: string) => ((minutes(time) - first * 60) / 60) * hour;
  return blocks.map((block) => ({
    block,
    top: minutesAt(block.start) + space.sm,
    height: Math.max(
      minutesAt(block.end) - minutesAt(block.start),
      minimum,
      block.goto ? size.control.md : component.base.none,
    ),
  }));
}

/**
 * A day by the hour: an hour rail on the left (from the first block's hour to the last block's end) and
 * blocks placed and sized by their time, tinted by tone. Each block is one item with `title` and `time`
 * parts. Blocks shorter than the minimum height grow to it so their text fits.
 */
export function KitHours({
  blocks,
  density: requested,
}: {
  blocks: readonly HourBlock[];
  density?: ThemeDensity;
}): ReactNode {
  const context = usePartContext();
  const kit = useKit();
  const density = requested ?? kit.density;
  const { gap, hour, minimum } = useHourScale(density);
  if (!blocks.length) return null;
  const first = Math.floor(Math.min(...blocks.map((b) => minutes(b.start))) / 60);
  const last = Math.ceil(Math.max(...blocks.map((b) => minutes(b.end))) / 60);
  const hours = Array.from({ length: Math.max(last - first, 1) + 1 }, (_, i) => first + i);
  const placed = placedHours(blocks, first, hour, minimum);
  return (
    <XStack gap={gap}>
      <HourTicks {...{ hours, hour, density }} />
      <YStack
        flex={1}
        height={(hours.length - 1) * hour + space.lg}
        {...({ "data-look-timed": true } as object)}
      >
        {hours.map((h, i) => {
          const at = i * hour + space.sm;
          if (placed.some(({ top, height }) => at >= top && at < top + height)) return null;
          return (
            <YStack
              key={h}
              position="absolute"
              top={at}
              left={0}
              right={0}
              height={component.base.borderWidth}
              backgroundColor="$line"
              aria-hidden
            />
          );
        })}
        {placed.map(({ block, top, height }) => (
          <PartContext.Provider key={block.id} value={{ ...context, item: block.id }}>
            <Block {...{ block, density, top, height }} />
          </PartContext.Provider>
        ))}
      </YStack>
    </XStack>
  );
}
