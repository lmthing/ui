import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { PartContext, usePartContext } from "../../part";
import { KitInput } from "../input";
import { KitText, shifted, type TextRole } from "../text";
import { KitRow } from "../surface";
import { loadingGeometry, loadingRadius } from "./matrix-layout";

type ContentProps = Parameters<typeof loadingGeometry>[0] & {
  children?: ReactNode;
  value?: ReactNode;
  role?: TextRole;
  numberScale?: "display" | "compact";
  align?: "start" | "center" | "end";
  lines?: number;
  tabular?: boolean;
  gap?: number;
  flex?: number;
  justifyContent?: "center" | "space-between";
  alignItems?: "center";
  flexDirection?: "row" | "column";
  inline?: boolean;
  inset?: "md" | "none";
  leading?: ReactNode;
  trailing?: ReactNode;
  lineRole?: TextRole;
  leadingAlign?: "line" | "row";
};

function LoadingRow(props: ContentProps) {
  const ks = useKitStyle();
  const pad = props.inline ? component.base.none : space[ks.density.rowPad];
  const line = typography[props.lineRole ?? "body"].lineHeight;
  return (
    <YStack
      minHeight={size.control.md}
      paddingHorizontal={props.inline || props.inset === "none" ? component.base.none : space.md}
      paddingVertical={pad}
      justifyContent="center"
    >
      <XStack
        gap={props.inline ? space.xs : space[ks.density.gap]}
        alignItems="flex-start"
        minHeight={props.inline ? line : Math.max(line, size.control.md - pad * 2)}
      >
        {props.leading && (
          <YStack
            {...(props.leadingAlign === "row"
              ? { alignSelf: "center" as const }
              : { height: typography[props.lineRole ?? "body"].lineHeight })}
            justifyContent="center"
          >
            <MatrixContent loading>{props.leading}</MatrixContent>
          </YStack>
        )}
        <YStack flex={component.base.bodyFlex}>
          <MatrixContent loading>{props.children}</MatrixContent>
        </YStack>
        {props.trailing && (
          <YStack height={typography[props.lineRole ?? "body"].lineHeight} justifyContent="center">
            <MatrixContent loading>{props.trailing}</MatrixContent>
          </YStack>
        )}
      </XStack>
    </YStack>
  );
}

function LoadingText({ children, role = "body", ...props }: ContentProps) {
  const ks = useKitStyle();
  const line = typography[role === "number" && props.numberScale === "compact" ? "body" : role];
  return (
    <YStack position="relative" overflow="hidden" alignSelf="flex-start" maxWidth="100%" aria-hidden>
      <YStack opacity={component.base.none}>
        <KitText {...props} role={role} part={null}>
          {children}
        </KitText>
      </YStack>
      {Array.from({ length: 8 }, (_, index) => (
        <YStack
          key={index}
          position="absolute"
          top={index * line.lineHeight + (line.lineHeight - space.md) / 2}
          width="100%"
          height={space.md}
          backgroundColor="$line"
          borderRadius={shifted("sm", ks.radiusShift)}
        />
      ))}
    </YStack>
  );
}

function LoadingInput({ children }: { children: ReactNode }) {
  const scope = usePartContext();
  return <PartContext.Provider value={{ ...scope, state: "loading" }}>{children}</PartContext.Provider>;
}

function loadingNode(node: ReactNode, shift: ReturnType<typeof useKitStyle>["radiusShift"]): ReactNode {
  if (typeof node === "string" || typeof node === "number") return <LoadingText>{node}</LoadingText>;
  if (!isValidElement<ContentProps>(node)) return null;
  const props = node.props;
  if (node.type === KitText) return <LoadingText {...props} />;
  if (node.type === KitRow) return <LoadingRow {...props} />;
  if (isValidElement<Parameters<typeof KitInput>[0]>(node) && node.type === KitInput)
    return <LoadingInput>{cloneElement(node, { part: null })}</LoadingInput>;
  const geometry = loadingGeometry(props);
  if (geometry)
    return (
      <YStack
        {...geometry}
        borderRadius={loadingRadius(props, shift)}
        justifyContent="center"
        backgroundColor={props.done === undefined ? "$line" : "transparent"}
      >
        {props.done !== undefined && (
          <YStack
            width={size.icon.lg}
            height={size.icon.lg}
            borderRadius={radius.sm}
            alignSelf="center"
            backgroundColor="$line"
          />
        )}
        {(props.hint || (props.label && props.done === undefined && !props.photo && !props.initials)) && (
          <XStack opacity={component.base.none} alignItems="center" gap={space.sm}>
            {props.icon && <YStack width={size.icon.sm} height={size.icon.sm} />}
            <KitText role={props.hint ? "body" : "label"} lines={1} part={null}>
              {props.hint ? (props.value ?? props.hint) : props.label}
            </KitText>
          </XStack>
        )}
      </YStack>
    );
  return (
    <YStack
      gap={props.gap}
      flex={props.flex}
      justifyContent={props.justifyContent}
      alignItems={props.alignItems}
      flexDirection={props.flexDirection ?? (node.type === XStack ? "row" : "column")}
    >
      {Children.toArray(props.children).map((child, index) => (
        <MatrixContent key={index} loading>
          {child}
        </MatrixContent>
      ))}
    </YStack>
  );
}

export function MatrixContent({ children, loading }: { children: ReactNode; loading?: boolean }) {
  const ks = useKitStyle();
  return loading ? (
    <YStack aria-hidden>
      {Children.toArray(children).map((child, index) => (
        <YStack key={index}>{loadingNode(child, ks.radiusShift)}</YStack>
      ))}
    </YStack>
  ) : (
    <>{children}</>
  );
}
