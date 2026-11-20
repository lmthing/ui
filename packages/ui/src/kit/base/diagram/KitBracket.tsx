import { Path, Svg } from "react-native-svg";
import { XStack, YStack, useTheme } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";
import { bracketGap, bracketLayout, bracketTieHeight, bracketWidth } from "./bracket-layout";
import {
  DiagramBar,
  DiagramEmpty,
  HorizontalDiagramScroll,
  useDiagramTarget,
  type Drawing,
  type Target,
} from "./diagram-drawing";

type Side = { label: string; score?: string };
type Tie = {
  id: string;
  sides: readonly [Side, Side];
  winner?: 0 | 1;
  selected?: boolean;
  target?: Target;
};
type Round = { id: string; label: string; ties: readonly Tie[] };
type BracketProps = Drawing & {
  rounds: readonly Round[];
  links: readonly { from: string; to: string }[];
};

function TieSide({ side, winner, loading }: { side: Side; winner: boolean; loading: boolean }) {
  return (
    <XStack
      flex={component.base.bodyFlex}
      alignItems="center"
      gap={space.xs}
      aria-current={winner || undefined}
    >
      <YStack flex={component.base.bodyFlex} minWidth={component.base.none}>
        {loading ? (
          <DiagramBar width="76%" />
        ) : (
          <KitText role="label" tone={winner ? "accent" : "text"} lines={1} part={null}>
            {side.label}
          </KitText>
        )}
      </YStack>
      {winner && <KitIcon name="check" scale="sm" tone="accent" decorative />}
      <YStack minWidth={size.icon.sm} alignItems="flex-end" flexShrink={component.base.none}>
        {loading ? (
          <DiagramBar width={size.icon.sm} />
        ) : (
          <KitText role="number" numberScale="compact" tone={winner ? "accent" : "text"} tabular part={null}>
            {side.score}
          </KitText>
        )}
      </YStack>
    </XStack>
  );
}

function TieCard({ tie, top, loading }: { tie: Tie; top: number; loading: boolean }) {
  const ks = useKitStyle();
  const label = tie.sides.map(({ label, score }) => (score === undefined ? label : `${label}, ${score}`));
  const target = useDiagramTarget(tie.target, loading, label.join(", "), tie.selected);
  const selected = !loading && tie.selected;
  return (
    <YStack
      {...target}
      position="absolute"
      top={top}
      width="100%"
      height={bracketTieHeight}
      paddingHorizontal={space.md}
      paddingVertical={space.xs}
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.strongBorder}
      borderColor={selected ? "$accent" : "$line"}
      backgroundColor={selected ? "$accentSoft" : "$surface"}
    >
      <TieSide side={tie.sides[0]} winner={!loading && tie.winner === 0} loading={loading} />
      <YStack height={component.base.borderWidth} backgroundColor="$line" aria-hidden />
      <TieSide side={tie.sides[1]} winner={!loading && tie.winner === 1} loading={loading} />
    </YStack>
  );
}

function BracketLinks({ layout, loading }: { layout: ReturnType<typeof bracketLayout>; loading: boolean }) {
  const theme = useTheme();
  if (!layout.paths.length) return null;
  return (
    <YStack fullscreen aria-hidden accessibilityElementsHidden pointerEvents="none">
      <Svg width={layout.width} height={layout.height}>
        {layout.paths.map(({ d, decided }, index) => (
          <Path
            key={index}
            d={d}
            fill="none"
            stroke={theme[!loading && decided ? "accent" : loading ? "line" : "muted"]?.val}
            strokeWidth={component.base.strongBorder}
          />
        ))}
      </Svg>
    </YStack>
  );
}

function BracketGrid({
  rounds,
  layout,
  loading,
}: {
  rounds: BracketProps["rounds"];
  layout: ReturnType<typeof bracketLayout>;
  loading: boolean;
}) {
  const context = usePartContext();
  return (
    <YStack paddingHorizontal={space.md} paddingVertical={space.md} gap={space.xs}>
      <XStack gap={bracketGap} alignItems="center">
        {rounds.map(({ id, label }) => (
          <YStack
            key={id}
            width={bracketWidth}
            height={size.control.md}
            paddingHorizontal={space.md + component.base.strongBorder}
            backgroundColor="$raised"
            justifyContent="center"
          >
            {loading ? (
              <DiagramBar width="54%" height={space.md} />
            ) : (
              <KitText role="heading" lines={1} part={null}>
                {label}
              </KitText>
            )}
          </YStack>
        ))}
      </XStack>
      <XStack gap={bracketGap} width={layout.width} height={layout.height} position="relative">
        <BracketLinks layout={layout} loading={loading} />
        {rounds.map((round, column) => (
          <YStack key={round.id} width={bracketWidth} position="relative">
            {round.ties.map((tie, index) => (
              <PartContext.Provider key={tie.id} value={{ ...context, item: tie.target?.item ?? tie.id }}>
                <TieCard {...{ tie, loading }} top={layout.columns[column]![index]!} />
              </PartContext.Provider>
            ))}
          </YStack>
        ))}
      </XStack>
    </YStack>
  );
}

/** Scrollable rounds with caller-supplied outcomes and links, keyed by tie id. */
export function KitBracket({ part = "root", loading = false, rounds, links }: BracketProps) {
  const address = usePart(part);
  const ks = useKitStyle();
  const empty = !rounds.some(({ ties }) => ties.length);
  const layout = bracketLayout(rounds, links);
  return (
    <YStack
      {...address}
      {...({ "data-look-twoedge": true } as object)}
      borderRadius={shifted("lg", ks.radiusShift)}
      backgroundColor="$raised"
      overflow="hidden"
      aria-busy={loading || undefined}
    >
      {empty ? (
        <DiagramEmpty icon="trophy" loading={loading} />
      ) : (
        <HorizontalDiagramScroll
          width={layout.width + space.md * 2}
          label={rounds.map(({ label }) => label).join(", ")}
          loading={loading}
        >
          <BracketGrid {...{ rounds, layout, loading }} />
        </HorizontalDiagramScroll>
      )}
    </YStack>
  );
}
