import { useWords } from "../../provider";
import type { ReactNode } from "react";
import { ScrollView, YStack, useTheme } from "tamagui";
import { Svg, Circle } from "react-native-svg";
import { RotateCw, RotateCcw } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitIcon, KitText, shifted, surfaceOf } from "../text";
type Node = { id: string; label: string; content: ReactNode };
type NodeProps = { node: Node; current: boolean; loading: boolean; queue?: boolean };
type OrbitProps = {
  part?: string;
  loading?: boolean;
  nodes: readonly Node[];
  at: string;
  reverse?: boolean;
  style?: "ring" | "queue";
};
const nodeWidth = size.avatar.md + space.md * 2 + component.base.strongBorder * 2;
const nodeHeight = nodeWidth + typography.body.lineHeight + space.sm;
function NodeLabel({ node, current, loading, queue = false }: NodeProps) {
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
          part={null}
        >
          {node.label}
        </KitText>
      )}
    </YStack>
  );
}
function OrbitNode({ node, current, loading, queue = false }: NodeProps) {
  const ks = useKitStyle();
  const address = usePart("root", !loading);
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : address)}
      aria-current={!loading && current ? "true" : undefined}
      accessibilityLabel={loading ? undefined : node.label}
      width={queue ? "100%" : nodeWidth}
      height={
        queue ? size.avatar.md + space[ks.density.rowPad] * 2 + component.base.strongBorder * 2 : nodeHeight
      }
      padding={queue ? space[ks.density.rowPad] : space.md}
      gap={space.sm}
      flexDirection={queue ? "row" : "column"}
      alignItems="center"
      justifyContent={queue ? "flex-start" : "center"}
      borderRadius={shifted("lg", ks.radiusShift)}
      {...surfaceOf(ks.surface)}
      {...(!loading && current
        ? { borderWidth: component.base.strongBorder, borderColor: "$accent", backgroundColor: "$accentSoft" }
        : {})}
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
      <NodeLabel node={node} current={current} loading={loading} queue={queue} />
    </YStack>
  );
}
function Ring({ nodes, at, loading, reverse }: Pick<OrbitProps, "nodes" | "at" | "loading" | "reverse">) {
  const theme = useTheme();
  const context = usePartContext();
  const r = Math.max(nodeHeight / Math.sqrt(2), (nodes.length * nodeHeight) / (Math.PI * 2));
  const box = r * 2 + nodeHeight + space.md * 2;
  const Direction = reverse ? RotateCcw : RotateCw;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ minWidth: "100%" }}>
      <YStack width={box} height={box} marginHorizontal="auto">
        <YStack position="absolute" aria-hidden>
          <Svg width={box} height={box}>
            <Circle
              cx={box / 2}
              cy={box / 2}
              r={r}
              fill="none"
              stroke={theme.line?.val}
              strokeWidth={component.base.strongBorder}
            />
          </Svg>
        </YStack>
        <YStack
          position="absolute"
          left={box / 2 - size.icon.lg / 2}
          top={box / 2 - size.icon.lg / 2}
          aria-hidden
        >
          <Direction size={size.icon.lg} color="$muted" />
        </YStack>
        {nodes.map((node, i) => {
          const angle = (i / nodes.length) * Math.PI * 2;
          return (
            <YStack
              key={node.id}
              position="absolute"
              left={box / 2 + Math.sin(angle) * r - nodeWidth / 2}
              top={box / 2 - Math.cos(angle) * r - nodeHeight / 2}
            >
              <PartContext.Provider value={{ ...context, item: node.id }}>
                <OrbitNode node={node} current={node.id === at} loading={!!loading} />
              </PartContext.Provider>
            </YStack>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
function Queue({ nodes, at, loading }: Pick<OrbitProps, "nodes" | "at" | "loading">) {
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
          <OrbitNode node={node} current={node.id === at} loading={!!loading} queue />
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
        <Drawing nodes={ordered} at={at} loading={loading} reverse={reverse} />
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
