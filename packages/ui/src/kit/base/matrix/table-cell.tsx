import type { ReactNode, RefObject } from "react";
import { YStack, type TamaguiElement } from "tamagui";
import { component, parseAddress, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit, useKitStyle } from "../../provider";
import { MatrixContent } from "./matrix-drawing";
import { disabledContent, type useMatrixHeights, type Target } from "./matrix-layout";

type CellProps = {
  children: ReactNode;
  label: string;
  target?: Target | undefined;
  disabled?: boolean | undefined;
  selected?: boolean | undefined;
  loading: boolean;
  cut?: boolean | undefined;
  height: number;
  fit?: boolean | undefined;
  divider?: boolean;
  rail?: boolean;
  anchor?: RefObject<TamaguiElement | null> | undefined;
  measure: ReturnType<ReturnType<typeof useMatrixHeights>["measure"]>;
};

function useCellTarget({ target, disabled, selected, loading, label, anchor }: CellProps) {
  const kit = useKit();
  const address = usePart(target?.part ?? "root", Boolean(target) && !loading);
  const press = () => kit.controller?.press(address.testID);
  const anchorProps = anchor
    ? {
        accessible: true,
        ref: (node: TamaguiElement | null) => {
          anchor.current = node;
          address.ref.current = node;
        },
        ...(!target ? { tabIndex: -1 as const, accessibilityLabel: label } : {}),
      }
    : {};
  return !target || loading
    ? anchorProps
    : {
        ...address,
        ...anchorProps,
        accessibilityRole: "button",
        accessibilityLabel: label,
        "aria-pressed": Boolean(selected),
        "aria-disabled": Boolean(disabled),
        disabled,
        focusable: !disabled,
        ...(kit.interactive && kit.controller && !disabled
          ? {
              cursor: "pointer",
              onPress: (event: { stopPropagation?(): void }) => {
                event.stopPropagation?.();
                press();
              },
              onKeyDown: (event: { key: string; preventDefault(): void; stopPropagation(): void }) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  press();
                }
              },
            }
          : {}),
      };
}
function TableCell(props: CellProps) {
  const ks = useKitStyle();
  const target = useCellTarget(props);
  const highlight = props.selected && !props.loading;
  const fill = highlight ? { backgroundColor: "$accentSoft" } : {};
  const rule = props.divider ? { borderLeftWidth: component.base.borderWidth, borderColor: "$line" } : {};
  return (
    <YStack
      {...(target as object)}
      minHeight={props.height + (props.cut ? component.base.borderWidth : component.base.none)}
      minWidth={props.rail && !props.target ? component.base.none : size.control.md}
      paddingHorizontal={props.fit ? space.xs : space.md}
      paddingVertical={space[ks.density.rowPad]}
      justifyContent="center"
      borderBottomWidth={props.cut ? component.base.strongBorder : component.base.borderWidth}
      borderColor={props.cut ? "$muted" : "$line"}
      {...(props.fit && !props.loading ? {} : { backgroundColor: highlight ? "$accentSoft" : "$surface" })}
      {...(props.disabled ? { "aria-disabled": true } : {})}
    >
      {props.fit && (highlight || props.divider) && (
        <YStack fullscreen pointerEvents="none" aria-hidden {...fill} {...rule} />
      )}
      <YStack
        onLayout={props.measure}
        pointerEvents={props.disabled ? "none" : "auto"}
        {...(props.disabled ? { inert: true } : {})}
      >
        <MatrixContent loading={props.loading}>
          {props.disabled ? disabledContent(props.children) : props.children}
        </MatrixContent>
      </YStack>
    </YStack>
  );
}
export function ScopedCell({ item, ...props }: CellProps & { item?: string }) {
  const { item: inherited, ...context } = usePartContext();
  const id = props.target ? props.target.item : (item ?? inherited);
  const valid =
    id && (props.target || parseAddress(`${context.screen}/${context.component}/${id}/root`)?.item === id);
  return (
    <PartContext.Provider value={{ ...context, ...(valid ? { item: id } : {}) }}>
      <TableCell {...props} />
    </PartContext.Provider>
  );
}
