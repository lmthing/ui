import type { ReactNode } from "react";
import { ScrollView, YStack, useTheme } from "tamagui";
import { Svg, Circle } from "react-native-svg";
import { RotateCw, RotateCcw } from "@tamagui/lucide-icons";
import { component, emptyLine, radius, size, space, type as typography } from "../../../catalog";
import { PartContext, useEmptyThing, usePart, usePartContext } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";

type Node = { id: string; label: string; content: ReactNode };
type OrbitProps = {
  part?: string;
  loading?: boolean;
  nodes: readonly Node[];
  at: string;
  reverse?: boolean;
  style?: "ring" | "queue";
};
const nodeWidth = size.avatar.lg + space.sm * 2;
const nodeHeight = size.avatar.lg + typography.label.lineHeight + space.sm + space.sm * 2;

function OrbitNode({ node, current, loading }: { node: Node; current: boolean; loading: boolean }) {
  const ks = useKitStyle();
  const address = usePart("root", !loading);
  return (
    <YStack
      {...(loading ? { "aria-hidden": true } : address)}
      aria-current={!loading && current ? "true" : undefined}
      accessibilityLabel={loading ? undefined : node.label}
      width={nodeWidth}
      height={nodeHeight}
      padding={space.sm}
      gap={space.sm}
      alignItems="center"
      justifyContent="center"
      borderRadius={shifted("lg", ks.radiusShift)}
      borderWidth={component.base.strongBorder}
      borderColor={!loading && current ? "$accent" : "$line"}
      backgroundColor={!loading && current ? "$accentSoft" : "$surface"}
    >
      <YStack width={size.avatar.lg} height={size.avatar.lg} alignItems="center" justifyContent="center">
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
      {loading ? (
        <YStack
          width={size.avatar.sm}
          height={component.base.dot}
          backgroundColor="$line"
          borderRadius={radius.pill}
        />
      ) : (
        <KitText role="label" align="center" tone={current ? "accent" : "muted"} lines={1} part={null}>
          {node.label}
        </KitText>
      )}
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
  const start = Math.max(
    0,
    nodes.findIndex((node) => node.id === at),
  );
  const ordered = [...nodes.slice(start), ...nodes.slice(0, start)];
  return (
    <YStack gap={space.sm} alignItems="center">
      {ordered.map((node) => (
        <PartContext.Provider key={node.id} value={{ ...context, item: node.id }}>
          <OrbitNode node={node} current={node.id === at} loading={!!loading} />
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
        <KitText part={null} tone="muted" align="center">
          {emptyLine(thing)}
        </KitText>
      )}
    </YStack>
  );
}
