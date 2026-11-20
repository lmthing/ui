import type { ReactNode } from "react";
import { ScrollView, YStack, useTheme } from "tamagui";
import { Svg, Circle } from "react-native-svg";
import { RotateCw, RotateCcw } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKitStyle, useWords } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
type Node = { id: string; label: string; content: ReactNode };
type NodeProps = { node: Node; current: boolean; loading: boolean; queue?: boolean; namePart?: boolean };
type OrbitProps = {
  part?: string;
  loading?: boolean;
  nodes: readonly Node[];
  at: string;
  reverse?: boolean;
  style?: "ring" | "queue";
  namePart?: boolean;
};
type LayoutProps = Pick<OrbitProps, "nodes" | "at" | "loading" | "reverse" | "namePart">;
const nodeWidth = size.avatar.md + space.md * 2 + component.base.strongBorder * 2;
const nodeHeight = nodeWidth + typography.body.lineHeight + space.sm;
function NodeLabel({ node, current, loading, queue = false, namePart }: NodeProps) {
  return (
    <YStack
      height={typography.body.lineHeight}
      minWidth={component.base.none}
      {...(queue ? { flex: component.base.bodyFlex } : { width: "100%" as const })}
      justifyContent="center"
      alignItems={queue ? "flex-start" : "center"}
    >
      {loading ? (
        <YStack
          width={size.avatar.sm}
          height={component.base.dot}
          backgroundColor="$line"
          borderRadius={radius.pill}
        />
      ) : (
        <KitText
          role="body"
          align={queue ? "start" : "center"}
          tone={current ? "accent" : "text"}
          lines={1}
          part={namePart ? "name" : null}
        >
          {node.label}
        </KitText>
      )}
    </YStack>
  );
}
function OrbitNode({ node, current, loading, queue = false, namePart = false }: NodeProps) {
  const ks = useKitStyle();
  const address = usePart("root", !loading);
  const surface = surfaceOf(ks.surface);
  const active = !loading && current;
  const borderWidth = active ? component.base.strongBorder : surface.borderWidth;
  // Keep the queue contents aligned when the current border replaces the preset border.
  const queuePad = space[ks.density.rowPad] + component.base.strongBorder - borderWidth;
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : address)}
      aria-current={!loading && current ? "true" : undefined}
      accessibilityLabel={loading ? undefined : node.label}
      width={queue ? "100%" : nodeWidth}
      height={
        queue ? size.avatar.md + space[ks.density.rowPad] * 2 + component.base.strongBorder * 2 : nodeHeight
      }
      padding={queue ? queuePad : space.md}
      gap={space.sm}
      flexDirection={queue ? "row" : "column"}
      alignItems="center"
      justifyContent={queue ? "flex-start" : "center"}
      borderRadius={shifted("lg", ks.radiusShift)}
      {...surface}
      borderWidth={borderWidth}
      {...(active ? { borderColor: "$accent", backgroundColor: "$accentSoft" } : {})}
    >
      <YStack width={size.avatar.md} height={size.avatar.md} alignItems="center" justifyContent="center">
        {loading ? (
          <YStack
            width={size.avatar.md}
            height={size.avatar.md}
            borderRadius={radius.pill}
            backgroundColor="$line"
          />
        ) : (
          node.content
        )}
      </YStack>
      <NodeLabel node={node} current={current} loading={loading} queue={queue} namePart={namePart} />
    </YStack>
  );
}
function Ring({ nodes, at, loading, reverse, namePart = false }: LayoutProps) {
  const theme = useTheme();
  const context = usePartContext();
  const r = Math.max(nodeHeight / Math.sqrt(2), (nodes.length * nodeHeight) / (Math.PI * 2));
  const box = r * 2 + nodeHeight + space.md * 2;
  const centre = box / 2;
  const positions = nodes.map((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return {
      node,
      left: centre + Math.sin(angle) * r - nodeWidth / 2,
      top: centre - Math.cos(angle) * r - nodeHeight / 2,
    };
  });
  const height =
    Math.max(centre + r + component.base.strongBorder, ...positions.map(({ top }) => top + nodeHeight)) +
    space.lg;
  const Direction = reverse ? RotateCcw : RotateCw;
  const iconStart = centre - size.icon.lg / 2;
  const ringLayout = { "data-look-twoedge": true };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: "100%" }}>
      <YStack width={box} height={height} marginHorizontal="auto" {...ringLayout}>
        <YStack position="absolute" aria-hidden>
          <Svg width={box} height={height}>
            <Circle
              cx={centre}
              cy={centre}
              r={r}
              fill="none"
              stroke={theme.line?.val}
              strokeWidth={component.base.strongBorder}
            />
          </Svg>
        </YStack>
        {!loading && (
          <YStack position="absolute" left={iconStart} top={iconStart} aria-hidden>
            <Direction size={size.icon.lg} color="$muted" />
          </YStack>
        )}
        {positions.map(({ node, left, top }) => (
          <YStack key={node.id} position="absolute" left={left} top={top}>
            <PartContext.Provider value={{ ...context, item: node.id }}>
              <OrbitNode node={node} current={node.id === at} loading={!!loading} namePart={namePart} />
            </PartContext.Provider>
          </YStack>
        ))}
      </YStack>
    </ScrollView>
  );
}
function Queue({ nodes, at, loading, namePart = false }: LayoutProps) {
  const context = usePartContext();
  const ks = useKitStyle();
  const start = Math.max(
    0,
    nodes.findIndex((node) => node.id === at),
  );
  const ordered = [...nodes.slice(start), ...nodes.slice(0, start)];
  return (
    <YStack gap={space[ks.density.gap]} alignItems="center">
      {ordered.map((node) => (
        <PartContext.Provider key={node.id} value={{ ...context, item: node.id }}>
          <OrbitNode node={node} current={node.id === at} loading={!!loading} namePart={namePart} queue />
        </PartContext.Provider>
      ))}
    </YStack>
  );
}
/** Supplied order and current node, never turn advancement or lap calculations. */
export function KitOrbit({
  part = "root",
  loading = false,
  nodes,
  at,
  reverse = false,
  style = "ring",
  namePart = false,
}: OrbitProps) {
  const { lang } = useWords();

  const thing = useEmptyThing();
  const rows =
    loading && !nodes.length
      ? Array.from({ length: 4 }, (_, i) => ({ id: `r${i + 1}`, label: "", content: null }))
      : nodes;
  const ordered = reverse ? [...rows].reverse() : rows;
  const Drawing = style === "ring" ? Ring : Queue;
  return (
    <YStack {...usePart(part)} width="100%" minWidth={component.base.none} aria-busy={loading} gap={space.md}>
      {ordered.length ? (
        <Drawing nodes={ordered} at={at} loading={loading} reverse={reverse} namePart={namePart} />
      ) : (
        <YStack paddingVertical={space.xl} alignItems="center" gap={space.md}>
          <KitIcon name="sparkles" tone="muted" scale="lg" decorative />
          <KitText part={null} tone="muted" align="center">
            {emptyLine(thing, lang)}
          </KitText>
        </YStack>
      )}
    </YStack>
  );
}
