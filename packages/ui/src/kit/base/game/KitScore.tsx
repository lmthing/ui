import { Children, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, emptyLine, radius, size, space, type as typography } from "../../../catalog";
import { useEmptyThing, usePart } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted, useTextStep } from "../text";

type Side = { label: string; value: string; controls?: ReactNode };
type ScoreProps = {
  part?: string;
  loading?: boolean;
  sides: readonly [Side, Side];
  center: ReactNode;
  style?: "display" | "keeper";
};

const sideWidth = size.control.md * 2 + space.xs;

function ScoreColumn({ children, middle = false }: { children?: ReactNode; middle?: boolean }) {
  return (
    <YStack
      flex={component.base.bodyFlex}
      flexBasis={middle ? size.avatar.lg : sideWidth}
      minWidth={component.base.none}
    >
      {children}
    </YStack>
  );
}

function ScoreBar({ width, tall = false }: { width: number; tall?: boolean }) {
  const { radiusShift } = useKitStyle();
  return (
    <YStack
      width={width}
      maxWidth="100%"
      height={tall ? size.icon.lg : space.sm}
      borderRadius={shifted("sm", radiusShift)}
      backgroundColor="$line"
      aria-hidden
    />
  );
}

function ScoreSide({ side, loading }: { side: Side; loading: boolean }) {
  const step = useTextStep({});
  return (
    <YStack alignItems="center" gap={space.xs}>
      <YStack
        width="100%"
        height={typography[step("number")].lineHeight}
        justifyContent="center"
        alignItems="center"
      >
        {loading || !side.value ? (
          <ScoreBar width={loading ? size.control.md : size.icon.md} tall={loading} />
        ) : (
          <KitText role="number" tabular align="center" lines={1} part={null}>
            {side.value}
          </KitText>
        )}
      </YStack>
      <YStack width="100%" minHeight={typography[step("caption")].lineHeight} alignItems="center">
        <YStack opacity={loading ? component.base.none : 1} aria-hidden={loading || undefined}>
          <KitText role="caption" tone="muted" align="center" lines={2} part={null}>
            {side.label}
          </KitText>
        </YStack>
        {loading && (
          <YStack
            position="absolute"
            top={component.base.none}
            height={typography[step("caption")].lineHeight}
            justifyContent="center"
          >
            <ScoreBar width={size.control.lg} />
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}

function ScoreControls({ controls, loading }: { controls?: ReactNode; loading: boolean }) {
  const { radiusShift } = useKitStyle();
  if (!Children.toArray(controls).length) return null;
  return (
    <XStack justifyContent="center" alignItems="center" minHeight={size.control.md} gap={space.xs}>
      {loading
        ? [0, 1].map((index) => (
            <YStack
              key={index}
              width={size.control.md}
              height={size.control.md}
              borderRadius={radius.pill}
              backgroundColor="$line"
              alignItems="center"
              justifyContent="center"
              aria-hidden
            >
              <YStack
                width={size.icon.md}
                height={space.xs}
                borderRadius={shifted("sm", radiusShift)}
                backgroundColor="$muted"
                opacity={component.base.skeletonOpacity}
              />
            </YStack>
          ))
        : controls}
    </XStack>
  );
}

function ScoreDrawing({
  sides,
  center,
  loading,
  keep,
}: Pick<ScoreProps, "sides" | "center"> & {
  loading: boolean;
  keep: boolean;
}) {
  const step = useTextStep({});
  return (
    <>
      <XStack gap={space.xs} alignItems="flex-start">
        <ScoreColumn>
          <ScoreSide side={sides[0]} loading={loading} />
        </ScoreColumn>
        <ScoreColumn middle>
          <YStack
            minHeight={typography[step("number")].lineHeight}
            justifyContent="center"
            alignItems="center"
            gap={space.xs}
          >
            {loading ? (
              <>
                <ScoreBar width={size.control.lg} />
                <ScoreBar width={size.control.sm} />
              </>
            ) : typeof center === "string" || typeof center === "number" ? (
              <KitText role="label" align="center" part={null}>
                {center}
              </KitText>
            ) : (
              center
            )}
          </YStack>
        </ScoreColumn>
        <ScoreColumn>
          <ScoreSide side={sides[1]} loading={loading} />
        </ScoreColumn>
      </XStack>
      {keep && (
        <XStack gap={space.xs}>
          <ScoreColumn>
            <ScoreControls controls={sides[0].controls} loading={loading} />
          </ScoreColumn>
          <ScoreColumn middle />
          <ScoreColumn>
            <ScoreControls controls={sides[1].controls} loading={loading} />
          </ScoreColumn>
        </XStack>
      )}
    </>
  );
}

/** Draws the caller's scores and status. Keeper controls retain their caller-owned addresses. */
export function KitScore({ part = "root", loading = false, style = "display", sides, center }: ScoreProps) {
  const { lang } = useWords();
  const thing = useEmptyThing();
  const keep = style === "keeper" && sides.some(({ controls }) => Children.toArray(controls).length > 0);
  const empty =
    !keep && !Children.toArray(center).length && sides.every(({ label, value }) => !label && !value);
  return (
    <YStack {...usePart(part)} width="100%" gap={space.sm} aria-busy={loading}>
      {empty && !loading ? (
        <YStack alignItems="center" gap={space.md} paddingVertical={space.xl}>
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText part={null} tone="muted" align="center">
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      ) : (
        <ScoreDrawing sides={sides} center={center} loading={loading} keep={keep} />
      )}
    </YStack>
  );
}
