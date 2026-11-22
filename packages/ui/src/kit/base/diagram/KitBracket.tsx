import { useEffect, useState } from "react";
import { Path, Svg } from "react-native-svg";
import { XStack, YStack, isWeb, useTheme } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";
import {
  bracketGap,
  bracketHeadingHeight,
  bracketLayout,
  bracketRoundWidth,
  bracketTieHeight,
} from "./bracket-layout";
import { BracketScroll } from "./bracket-scroll";
import { DiagramBar, DiagramEmpty, useDiagramTarget, type Drawing, type Target } from "./diagram-drawing";

type Side = { label: string; score?: string; labelPart?: string | null; scorePart?: string | null };
type Tie = {
  id: string;
  sides: readonly [Side, Side];
  roundPart?: string | null;
  selected?: boolean;
  target?: Target;
} & ({ winner?: undefined; winnerLabel?: undefined } | { winner: 0 | 1; winnerLabel: string });
type Round = { id: string; label: string; ties: readonly Tie[] };
type BracketProps = Drawing & {
  rounds: readonly Round[];
  links: readonly { from: string; to: string }[];
};

function BracketLinks({ layout, loading }: { layout: ReturnType<typeof bracketLayout>; loading: boolean }) {
  const theme = useTheme();
  if (!layout.paths.length) return null;
  return (
    <YStack
      fullscreen
      top={bracketHeadingHeight}
      aria-hidden
      accessibilityElementsHidden
      pointerEvents="none"
    >
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

function HeadingPart({ part, top }: { part: string; top: number }) {
  const address = usePart(part);
  const { onLayout } = address;
  // Moving the heading does not resize its fullscreen alias.
  useEffect(onLayout, [onLayout, top]);
  return <YStack {...address} fullscreen pointerEvents="none" aria-hidden accessibilityElementsHidden />;
}

type Heading = {
  label: string;
  ties: readonly { id: string; target?: Target; roundPart?: string | null }[];
};

/** Draw the heading once; all of its tie addresses measure the same heading. */
function BracketHeading({ round, top, loading }: { round: Heading; top: number; loading: boolean }) {
  const context = usePartContext();
  return (
    <YStack
      position="absolute"
      top={top}
      width="100%"
      height={bracketHeadingHeight}
      paddingHorizontal={space.md + component.base.strongBorder}
      backgroundColor="$raised"
      justifyContent="center"
    >
      {loading ? (
        <DiagramBar width="54%" height={space.md} />
      ) : (
        <>
          <KitText role="heading" lines={1} part={null}>
            {round.label}
          </KitText>
          {round.ties.map(({ id, target, roundPart }) =>
            roundPart == null ? null : (
              <PartContext.Provider key={id} value={{ ...context, item: target?.item ?? id }}>
                <HeadingPart part={roundPart} top={top} />
              </PartContext.Provider>
            ),
          )}
        </>
      )}
    </YStack>
  );
}

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
          <KitText
            role="label"
            tone={winner ? "accent" : side.score === undefined ? "muted" : "text"}
            lines={1}
            part={side.labelPart ?? null}
          >
            {side.label}
          </KitText>
        )}
      </YStack>
      {winner && <KitIcon name="check" scale="sm" tone="accent" decorative />}
      <YStack minWidth={size.icon.sm} alignItems="flex-end" flexShrink={component.base.none}>
        {loading ? (
          <DiagramBar width={size.icon.sm} />
        ) : (
          <KitText
            role="number"
            numberScale="compact"
            tone={winner ? "accent" : "text"}
            tabular
            part={side.score ? (side.scorePart ?? null) : null}
          >
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
  if (tie.winnerLabel) label.push(tie.winnerLabel);
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

function RoundColumn({
  round,
  tops,
  roundWidth,
  loading,
}: {
  round: Round;
  tops: number[];
  roundWidth: number;
  loading: boolean;
}) {
  const context = usePartContext();
  return (
    <YStack
      width={roundWidth}
      position="relative"
      {...(isWeb ? { style: { scrollSnapAlign: "start" } as never } : {})}
    >
      <BracketHeading {...{ round, loading }} top={tops[0] ?? component.base.none} />
      {round.ties.map((tie, index) => (
        <PartContext.Provider key={tie.id} value={{ ...context, item: tie.target?.item ?? tie.id }}>
          <TieCard {...{ tie, loading }} top={tops[index]! + bracketHeadingHeight} />
        </PartContext.Provider>
      ))}
    </YStack>
  );
}

function BracketGrid({
  rounds,
  layout,
  roundWidth,
  loading,
}: {
  rounds: BracketProps["rounds"];
  layout: ReturnType<typeof bracketLayout>;
  roundWidth: number;
  loading: boolean;
}) {
  return (
    <YStack padding={space.md} width={layout.width + space.md * 2}>
      <XStack
        gap={bracketGap}
        width={layout.width}
        height={layout.height + bracketHeadingHeight}
        position="relative"
      >
        <BracketLinks layout={layout} loading={loading} />
        {rounds.map((round, column) => (
          <RoundColumn key={round.id} {...{ round, roundWidth, loading }} tops={layout.columns[column]!} />
        ))}
      </XStack>
    </YStack>
  );
}

/** Scrollable rounds with caller-supplied outcomes and links, keyed by tie id. */
export function KitBracket({ part = "root", loading = false, rounds, links }: BracketProps) {
  const address = usePart(part);
  const ks = useKitStyle();
  const [viewport, setViewport] = useState(0);
  const empty = !rounds.some(({ ties }) => ties.length);
  const roundWidth = bracketRoundWidth(viewport);
  const layout = bracketLayout(rounds, links, roundWidth);
  const width = layout.width + space.md * 2;
  const travel = Math.max(0, width - viewport);
  const offsets = rounds.map((_, index) => Math.min(travel, index * (roundWidth + bracketGap)));
  const label = rounds.map((round) => round.label).join(", ");
  return (
    <YStack
      {...address}
      onLayout={(event) => {
        address.onLayout();
        setViewport(event.nativeEvent.layout.width);
      }}
      {...({ "data-look-twoedge": true } as object)}
      borderRadius={shifted("lg", ks.radiusShift)}
      backgroundColor={empty ? undefined : "$raised"}
      overflow="hidden"
      aria-busy={loading || undefined}
    >
      {empty ? (
        <DiagramEmpty icon="trophy" loading={loading} />
      ) : (
        <BracketScroll {...{ width, offsets, label, loading }} view={viewport} windows={layout.windows}>
          <BracketGrid {...{ rounds, layout, roundWidth, loading }} />
        </BracketScroll>
      )}
    </YStack>
  );
}
