import { useEffect } from "react";
import { Path, Svg } from "react-native-svg";
import { isWeb, YStack, useTheme } from "tamagui";
import { component, emptyLine, radius, size, space, type IconName } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted } from "../text";
import { bracketHeadingHeight } from "./bracket-layout";

export type Drawing = { part?: string; loading?: boolean };
export type Target = { item?: string; part: string };

export function FieldLines() {
  const theme = useTheme();
  // Drawing units, independent of viewport size.
  const outline = "M2 2H98V98H2ZM2 50H98M26 2V15H74V2M26 98V85H74V98";
  const arcs = "M39 15Q50 27 61 15M39 85Q50 73 61 85";
  return (
    <YStack fullscreen aria-hidden accessibilityElementsHidden pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path
          d={`${outline} ${arcs}`}
          fill="none"
          stroke={theme.muted?.val}
          opacity={component.base.gridOpacity}
          strokeWidth={component.base.borderWidth}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
      <YStack
        position="absolute"
        top="50%"
        left="50%"
        marginTop={-size.control.lg / 2}
        marginLeft={-size.control.lg / 2}
        width={size.control.lg}
        height={size.control.lg}
        borderWidth={component.base.borderWidth}
        borderColor="$muted"
        opacity={component.base.gridOpacity}
        borderRadius={radius.pill}
      />
    </YStack>
  );
}

export function useDiagramTarget(
  target: Target | undefined,
  loading: boolean,
  label: string,
  selected?: boolean,
) {
  const { controller, interactive } = useKit();
  const address = usePart(target?.part ?? "root", !loading);
  if (loading) return {};
  if (!target) return { ...address, "aria-current": selected || undefined };
  const activate = (event: { stopPropagation?(): void }) => {
    event.stopPropagation?.();
    return controller?.press(address.testID);
  };
  const enabled = interactive && !!controller;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    ...(!isWeb && selected !== undefined ? { accessibilityState: { selected } } : {}),
    "aria-current": selected || undefined,
    focusable: enabled,
    ...(enabled
      ? {
          cursor: "pointer" as const,
          onPress: activate,
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            return activate(event);
          },
        }
      : {}),
  };
}

export function DiagramEmpty({ icon, loading }: { icon: IconName; loading: boolean }) {
  const thing = useEmptyThing();
  const { lang } = useWords();
  return (
    <YStack alignItems="center" padding={space.xl} gap={space.md}>
      <YStack
        width={size.avatar.md}
        height={size.avatar.md}
        borderRadius={size.avatar.md}
        backgroundColor={loading ? "$line" : "$raised"}
        alignItems="center"
        justifyContent="center"
        aria-hidden
        accessibilityElementsHidden
      >
        {!loading && <KitIcon name={icon} tone="muted" scale="lg" decorative />}
      </YStack>
      {loading ? (
        <YStack width="40%" alignItems="center">
          <DiagramBar width="100%" />
        </YStack>
      ) : (
        <KitText tone="muted" align="center" part={null}>
          {emptyLine(thing, lang)}
        </KitText>
      )}
    </YStack>
  );
}

export function DiagramBar({ width, height = space.sm }: { width: number | `${number}%`; height?: number }) {
  const ks = useKitStyle();
  return (
    <YStack
      width={width}
      height={height}
      maxWidth="100%"
      flexShrink={component.base.none}
      borderRadius={shifted("sm", ks.radiusShift)}
      backgroundColor="$line"
      aria-hidden
      accessibilityElementsHidden
    />
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
export function BracketHeading({ round, top, loading }: { round: Heading; top: number; loading: boolean }) {
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
