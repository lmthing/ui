import { useSignatureProgress } from "../../motion";
import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, space } from "../../../catalog";
import { useKit } from "../../provider";
import { PartContext, usePart, usePartContext } from "../../part";
import { KitText } from "../text";

type Tone = "neutral" | "good" | "warn" | "bad";
const fill = { neutral: "$accentSoft", good: "$goodSoft", warn: "$warnSoft", bad: "$badSoft" } as const;
const edge = { neutral: "$accent", good: "$good", warn: "$warn", bad: "$bad" } as const;
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export type HourBlock = { id: string; start: string; end: string; title: string; tone?: Tone; goto?: string };

function Block({ block, top, height }: { block: HourBlock; top: number; height: number }) {
  const kit = useKit();
  const part = usePart();
  const tone = block.tone ?? "neutral";
  const progress = useSignatureProgress("day_unfold");
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
      paddingVertical={space.sm}
      borderRadius={radius.sm}
      borderLeftWidth={component.base.strongBorder * 2}
      borderLeftColor={edge[tone]}
      backgroundColor={fill[tone]}
      overflow="hidden"
      accessibilityRole={block.goto ? "link" : "text"}
      accessibilityLabel={`${block.start} to ${block.end}, ${block.title}`}
      {...(kit.interactive && block.goto ? { onPress: () => kit.onLink?.(block.goto!, part.testID) } : {})}
    >
      <KitText role="body" part="title" lines={1}>
        {block.title}
      </KitText>
      <KitText role="caption" tone="muted" part="time" tabular lines={1}>
        {`${block.start}–${block.end}`}
      </KitText>
    </YStack>
  );
}

/**
 * A day by the hour: an hour rail on the left (from the first block's hour to the last block's end) and
 * blocks placed and sized by their time, tinted by tone. Each block is one item with `title` and `time`
 * parts. Blocks shorter than the minimum height grow to it so their text fits.
 */
export function KitHours({ blocks }: { blocks: readonly HourBlock[] }): ReactNode {
  const context = usePartContext();
  const hour = component.base.hourHeight;
  const first = Math.floor(Math.min(...blocks.map((b) => minutes(b.start))) / 60);
  const last = Math.ceil(Math.max(...blocks.map((b) => minutes(b.end))) / 60);
  const hours = Array.from({ length: Math.max(last - first, 1) + 1 }, (_, i) => first + i);
  const y = (hhmm: string) => ((minutes(hhmm) - first * 60) / 60) * hour;
  return (
    <XStack gap={space.sm}>
      <YStack width={component.base.timeWidth} aria-hidden>
        {hours.map((h, i) => (
          <YStack key={h} height={i === hours.length - 1 ? undefined : hour}>
            <KitText role="caption" tone="muted" part={null} tabular>
              {`${String(h).padStart(2, "0")}:00`}
            </KitText>
          </YStack>
        ))}
      </YStack>
      <YStack
        flex={1}
        height={(hours.length - 1) * hour + space.lg}
        {...({ "data-look-timed": true } as object)}
      >
        {hours.map((h, i) => (
          <YStack
            key={h}
            position="absolute"
            top={i * hour + space.sm}
            left={0}
            right={0}
            height={component.base.borderWidth}
            backgroundColor="$line"
            aria-hidden
          />
        ))}
        {blocks.map((block) => (
          <PartContext.Provider key={block.id} value={{ ...context, item: block.id }}>
            <Block
              block={block}
              top={y(block.start) + space.sm}
              height={Math.max(y(block.end) - y(block.start), component.base.blockMinHeight)}
            />
          </PartContext.Provider>
        ))}
      </YStack>
    </XStack>
  );
}
