import { Children, useState, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted, useTextStep } from "../text";
import {
  DiagramBar,
  DiagramEmpty,
  FieldLines,
  useDiagramTarget,
  type Drawing,
  type Target,
} from "./diagram-drawing";

type Player = {
  id: string;
  label: string;
  number: string;
  namePart?: string | null;
  numberPart?: string | null;
  target?: Target;
};
type Line = { id: string; players: readonly Player[] };
type PitchProps = Drawing & {
  lines: readonly Line[];
  substitutes?: ReactNode;
  substitutesHeight?: number;
  style?: "pitch" | "list";
};

function PlayerLabel({ player, list, loading }: { player: Player; list: boolean; loading: boolean }) {
  const { label, namePart = null } = player;
  if (loading) return <DiagramBar width={list ? "50%" : size.avatar.sm} />;
  if (list)
    return (
      <KitText part={namePart} lines={1}>
        {label}
      </KitText>
    );
  return (
    <YStack position="relative" width="100%" maxWidth={size.control.md * 2} paddingHorizontal={space.xs}>
      <YStack
        fullscreen
        left={space.xs / 2}
        right={space.xs / 2}
        backgroundColor="$raised"
        borderRadius={radius.pill}
        aria-hidden
      />
      <YStack position="relative">
        <KitText role="caption" align="center" lines={1} part={namePart}>
          {label}
        </KitText>
      </YStack>
    </YStack>
  );
}

function PitchPlayer({ player, list, loading }: { player: Player; list: boolean; loading: boolean }) {
  const step = useTextStep({});
  const target = useDiagramTarget(player.target, loading, `${player.number}, ${player.label}`);
  const role = list ? "body" : "caption";
  const lineHeight = typography[step(role)].lineHeight;
  return (
    <YStack
      {...target}
      flexDirection={list ? "row" : "column"}
      {...(list
        ? { paddingVertical: space.xs, paddingHorizontal: space.md }
        : { flex: component.base.bodyFlex })}
      minWidth={size.control.md}
      minHeight={size.control.md}
      gap={list ? space.md : space.xs}
      alignItems="center"
      justifyContent={list ? "flex-start" : "center"}
    >
      <YStack
        width={size.control.sm}
        height={size.control.sm}
        flexShrink={component.base.none}
        borderRadius={radius.pill}
        backgroundColor={loading ? "$line" : "$surface"}
        borderColor={loading ? "$line" : "$muted"}
        borderWidth={component.base.borderWidth}
        alignItems="center"
        justifyContent="center"
      >
        {!loading && (
          <KitText role="number" numberScale="compact" tabular part={player.numberPart ?? null}>
            {player.number}
          </KitText>
        )}
      </YStack>
      <YStack
        minWidth={component.base.none}
        height={lineHeight}
        justifyContent="center"
        {...(list ? { flex: component.base.bodyFlex } : { width: "100%", alignItems: "center" })}
      >
        <PlayerLabel {...{ player, list, loading }} />
      </YStack>
    </YStack>
  );
}

function PitchLine({ line, loading, list }: { line: Line; loading: boolean; list: boolean }) {
  const context = usePartContext();
  const ks = useKitStyle();
  return (
    <XStack
      flexDirection={list ? "column" : "row"}
      alignItems={list ? "stretch" : "flex-start"}
      justifyContent="center"
      flexWrap={list ? "nowrap" : "wrap"}
      rowGap={list ? component.base.none : space.xs}
      {...(list
        ? {
            backgroundColor: "$raised",
            borderRadius: shifted("md", ks.radiusShift),
            paddingVertical: space.xs,
          }
        : {})}
    >
      {line.players.map((player) => (
        <PartContext.Provider key={player.id} value={{ ...context, item: player.target?.item ?? player.id }}>
          <PitchPlayer {...{ player, list, loading }} />
        </PartContext.Provider>
      ))}
    </XStack>
  );
}

function PitchSubstitutes({
  children,
  loading,
  hint,
}: {
  children: ReactNode;
  loading: boolean;
  hint?: number | undefined;
}) {
  const [height, setHeight] = useState<number>(size.control.md);
  if (!Children.toArray(children).length) return null;
  return (
    <YStack
      minHeight={Math.max(size.control.md, loading ? Math.max(hint ?? 0, height) : (hint ?? 0))}
      justifyContent="center"
      onLayout={loading ? undefined : (event) => setHeight(event.nativeEvent.layout.height)}
    >
      {loading ? <DiagramBar width="58%" height={space.md} /> : children}
    </YStack>
  );
}

/** Draw the supplied player lines in order; substitutes belong to the caller. */
export function KitPitch({
  lines,
  substitutes,
  substitutesHeight,
  part = "root",
  loading = false,
  style = "pitch",
}: PitchProps) {
  const address = usePart(part);
  const ks = useKitStyle();
  const list = style === "list";
  const occupied = lines.filter((line) => line.players.length);
  const gap = space[ks.density.gap];
  return (
    <YStack {...address} gap={space.md} aria-busy={loading || undefined}>
      <YStack
        {...({
          "data-look-twoedge": !list || undefined,
        } as object)}
        borderRadius={shifted("lg", ks.radiusShift)}
        overflow="hidden"
        backgroundColor={list ? undefined : "$raised"}
        paddingHorizontal={list ? undefined : space.md}
        paddingVertical={list ? undefined : space.lg}
        gap={list ? gap : gap + space.sm}
      >
        {!list && occupied.length > 0 && <FieldLines />}
        {occupied.length ? (
          occupied.map((line) => <PitchLine key={line.id} {...{ line, list, loading }} />)
        ) : (
          <DiagramEmpty icon="users" loading={loading} />
        )}
      </YStack>
      <PitchSubstitutes loading={loading} hint={substitutesHeight}>
        {substitutes}
      </PitchSubstitutes>
    </YStack>
  );
}
