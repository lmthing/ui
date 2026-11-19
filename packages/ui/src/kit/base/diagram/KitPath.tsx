import type { ReactNode } from "react";
import { Svg, Path } from "react-native-svg";
import { isWeb, XStack, YStack, useTheme } from "tamagui";
import { Route } from "@tamagui/lucide-icons";
import { component, radius, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { KitIcon, shifted } from "../text";

type Node = {
  id: string;
  label: string;
  content: ReactNode;
  state: "done" | "current" | "locked";
  milestone?: boolean;
  target?: { item?: string; part: string | null };
};
type PathProps = { part?: string | null; loading?: boolean; nodes: readonly Node[] };

const anchors = ["flex-start", "flex-end"] as const;
const positions = [40, 60] as const;
const lane = (index: number) => index % anchors.length;

function Connector({ index, done }: { index: number; done: boolean }) {
  const theme = useTheme();
  const from = positions[lane(index - 1)];
  const to = positions[lane(index)];
  return (
    <YStack height={space.lg} aria-hidden accessibilityElementsHidden pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Path
          d={`M${from} 0 C${from} 55 ${to} 45 ${to} 100`}
          fill="none"
          stroke={theme[done ? "accent" : "line"]?.val}
          strokeWidth={component.base.strongBorder}
          vectorEffect="non-scaling-stroke"
        />
      </Svg>
    </YStack>
  );
}

function useNodeTarget(node: Node, loading: boolean) {
  const kit = useKit();
  const part = node.target ? node.target.part : "root";
  const address = usePart(part ?? "root", part !== null && !loading);
  const disabled = node.state === "locked";
  const press = () => kit.controller?.press(address.testID);
  if (loading || part === null) return {};
  if (!node.target) return address;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: node.label,
    ...(isWeb ? { "aria-disabled": disabled } : { accessibilityState: { disabled } }),
    "aria-current": node.state === "current" ? ("step" as const) : undefined,
    disabled,
    focusable: !disabled,
    ...(kit.interactive && kit.controller && !disabled
      ? {
          cursor: "pointer" as const,
          onPress: (event: { stopPropagation?(): void }) => {
            event.stopPropagation?.();
            return press();
          },
          onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            return press();
          },
        }
      : {}),
  };
}

function PathNode({ node, index, loading }: { node: Node; index: number; loading: boolean }) {
  const ks = useKitStyle();
  const target = useNodeTarget(node, loading);
  const current = !loading && node.state === "current";
  const reached = !loading && node.state !== "locked";
  const locked = node.state === "locked";
  const icon = locked ? "lock" : node.milestone ? "trophy" : current ? "chevron_right" : "check";
  return (
    <XStack
      {...target}
      alignSelf={anchors[lane(index)]}
      width="80%"
      minHeight={component.base.blockMinHeight + space.md}
      padding={space.md}
      alignItems="center"
      gap={space.sm}
      borderRadius={shifted("md", ks.radiusShift)}
      borderWidth={component.base.strongBorder}
      borderColor={current ? "$accent" : "$line"}
      backgroundColor={current ? "$accentSoft" : "$surface"}
    >
      <YStack
        width={size.icon.lg + space.sm}
        height={size.icon.lg + space.sm}
        flexShrink={component.base.none}
        borderRadius={radius.pill}
        alignItems="center"
        justifyContent="center"
        backgroundColor={loading ? "$line" : reached ? (current ? "$surface" : "$accentSoft") : "$raised"}
        aria-hidden
      >
        {!loading && <KitIcon name={icon} tone={reached ? "accent" : "muted"} decorative />}
      </YStack>
      <YStack flex={1} minWidth={component.base.none}>
        {loading ? (
          <YStack
            width="72%"
            height={space.sm}
            backgroundColor="$line"
            borderRadius={radius.sm}
            aria-hidden
          />
        ) : (
          node.content
        )}
      </YStack>
      {locked && node.milestone && <MilestoneMark loading={loading} />}
    </XStack>
  );
}

function MilestoneMark({ loading }: { loading: boolean }) {
  return (
    <YStack
      width={size.icon.sm}
      height={size.icon.sm}
      flexShrink={component.base.none}
      borderRadius={radius.sm}
      backgroundColor={loading ? "$line" : undefined}
      aria-hidden
    >
      {!loading && <KitIcon name="trophy" scale="sm" decorative />}
    </YStack>
  );
}

function EmptyPath({ loading }: { loading: boolean }) {
  return (
    <YStack
      alignSelf="center"
      width={size.avatar.md}
      height={size.avatar.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      backgroundColor={loading ? "$line" : "$raised"}
      aria-hidden
    >
      {!loading && <Route size={size.icon.lg} color="$muted" />}
    </YStack>
  );
}

/** Draws the caller's order and node state; nothing here advances or unlocks the path. */
export function KitPath({ part = "root", loading = false, nodes }: PathProps) {
  const context = usePartContext();
  const address = usePart(part ?? "root", part !== null);
  return (
    <YStack
      {...(part === null ? {} : address)}
      {...({ "data-look-twoedge": true } as object)}
      aria-busy={loading || undefined}
    >
      {!nodes.length ? (
        <EmptyPath loading={loading} />
      ) : (
        nodes.map((node, index) => (
          <PartContext.Provider key={node.id} value={{ ...context, item: node.target?.item ?? node.id }}>
            {index > 0 && <Connector index={index} done={!loading && nodes[index - 1]?.state === "done"} />}
            <PathNode {...{ node, index, loading }} />
          </PartContext.Provider>
        ))
      )}
    </YStack>
  );
}
