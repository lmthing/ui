import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, useTextStep } from "../text";

type Side = { label: string; value: string; valuePart?: string | null; controls?: ReactNode };
type ScoreProps = {
  part?: string;
  loading?: boolean;
  sides: readonly [Side, Side];
  center: ReactNode;
  style?: "display" | "keeper";
};

const centerWidth = size.avatar.lg;
const sideLayout = { flex: component.base.bodyFlex, minWidth: component.base.none } as const;

function ScoreValue({ side, loading, end = false }: { side: Side; loading: boolean; end?: boolean }) {
  const { value, valuePart = null } = side;
  return (
    <YStack {...sideLayout} alignItems="center" x={centerWidth / (end ? -4 : 4)}>
      {loading || !value ? (
        <ScoreBar width={loading ? size.control.md : size.icon.md} tall={loading} />
      ) : (
        <KitText role="number" tabular align="center" lines={1} part={valuePart}>
          {value}
        </KitText>
      )}
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

function ScoreLabel({ label, loading }: { label: string; loading: boolean }) {
  const step = useTextStep({});
  return (
    <YStack {...sideLayout} minHeight={typography[step("caption")].lineHeight} alignItems="center">
      <YStack opacity={loading ? component.base.none : 1} aria-hidden={loading || undefined}>
        <KitText role="caption" tone="muted" align="center" lines={2} part={null}>
          {label}
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
  );
}

function controlCount(controls: ReactNode): number {
  return Children.toArray(controls).reduce<number>(
    (count, child) =>
      count +
      (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment
        ? controlCount(child.props.children)
        : 1),
    0,
  );
}

function ScoreControls({ controls, loading }: { controls?: ReactNode; loading: boolean }) {
  const count = controlCount(controls);
  return (
    <XStack
      {...sideLayout}
      justifyContent="center"
      alignItems="center"
      minHeight={size.control.md}
      gap={space.xs}
    >
      {loading
        ? Array.from({ length: count }, (_, index) => (
            <YStack
              key={index}
              width={size.control.md}
              height={size.control.md}
              borderRadius={radius.pill}
              backgroundColor="$line"
              aria-hidden
            />
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
      <YStack gap={space.xs}>
        <XStack alignItems="center" minHeight={typography[step("number")].lineHeight}>
          <ScoreValue side={sides[0]} loading={loading} />
          <YStack width={centerWidth} justifyContent="center" alignItems="center" gap={space.xs}>
            {loading ? (
              <>
                <ScoreBar width={size.control.lg} />
                <ScoreBar width={size.control.sm} />
              </>
            ) : typeof center === "string" || typeof center === "number" ? (
              <KitText role="caption" align="center" part={null}>
                {center}
              </KitText>
            ) : (
              center
            )}
          </YStack>
          <ScoreValue side={sides[1]} loading={loading} end />
        </XStack>
        <XStack>
          <ScoreLabel label={sides[0].label} loading={loading} />
          <ScoreLabel label={sides[1].label} loading={loading} />
        </XStack>
      </YStack>
      {keep && (
        <XStack>
          <ScoreControls controls={sides[0].controls} loading={loading} />
          <ScoreControls controls={sides[1].controls} loading={loading} />
        </XStack>
      )}
    </>
  );
}

/** Draws the caller's scores and status. Keeper controls retain their caller-owned addresses. */
export function KitScore({ part = "root", loading = false, style = "display", sides, center }: ScoreProps) {
  const keep = style === "keeper" && sides.some(({ controls }) => controlCount(controls) > 0);
  const empty =
    !keep && !Children.toArray(center).length && sides.every(({ label, value }) => !label && !value);
  return (
    <YStack {...usePart(part)} width="100%" gap={space.sm} aria-busy={loading}>
      {empty && !loading ? (
        <YStack alignItems="center" paddingTop={space.xl} paddingBottom={space.xs}>
          <YStack
            width={size.avatar.md}
            height={size.avatar.md}
            borderRadius={radius.pill}
            backgroundColor="$raised"
            alignItems="center"
            justifyContent="center"
          >
            <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          </YStack>
        </YStack>
      ) : (
        <ScoreDrawing sides={sides} center={center} loading={loading} keep={keep} />
      )}
    </YStack>
  );
}
