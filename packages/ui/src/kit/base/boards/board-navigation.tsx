import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScrollView, YStack, isWeb, type GetProps, type TamaguiElement } from "tamagui";
import { component, parseAddress } from "../../../catalog";
import { useMoveFocus } from "../../interact";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

export type Target = { item?: string; part: string; action?: "select" | "toggle" };
type Position = { row: number; col: number };
type KeyEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "repeat" | "preventDefault" | "stopPropagation">;
const positionKey = ({ row, col }: Position) => `${row}:${col}`;
const axes = { ArrowLeft: "col", ArrowRight: "col", ArrowUp: "row", ArrowDown: "row" } as const;

export function nextPosition(positions: readonly Position[], from: Position, key: string, ctrl = false) {
  const backwards = key === "ArrowUp" || key === "ArrowLeft";
  const axis = axes[key as keyof typeof axes];
  const cross = axis === "col" ? "row" : "col";
  const matches = positions.filter((position) =>
    key === "Home" || key === "End"
      ? ctrl || position.row === from.row
      : axis &&
        position[cross] === from[cross] &&
        (backwards ? position[axis] < from[axis] : position[axis] > from[axis]),
  );
  return backwards || key === "End" ? matches.at(-1) : matches[0];
}

const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
const Navigation = createContext<ReturnType<typeof useNavigation> | null>(null);

function useNavigation(positions: readonly Position[]) {
  const [focused, setFocused] = useState<string>();
  const pending = useRef<string | null>(null);
  const detachedFocus = useRef(false);
  const active = positions.find((position) => positionKey(position) === focused) ?? positions[0];
  return {
    active: active && positionKey(active),
    pending,
    detachedFocus,
    focus: setFocused,
    move(from: Position, event: KeyEvent) {
      const next = nextPosition(positions, from, event.key, event.ctrlKey);
      if (!next || positionKey(next) === positionKey(from)) return;
      pending.current = positionKey(next);
      setFocused(pending.current);
    },
  };
}

type GridProps = {
  rows: number;
  cols: number;
  positions: readonly Position[];
  label?: string | undefined;
  loading: boolean;
  gap?: number;
  children: ReactNode;
};
export function BoardGrid({ rows, cols, positions, label, loading, gap, children }: GridProps) {
  const navigation = useNavigation(positions);
  const grid = useRef<TamaguiElement>(null);
  useLayoutEffect(() => {
    if (!isWeb || !navigation.detachedFocus.current) return;
    navigation.detachedFocus.current = false;
    if (!loading && document.activeElement === document.body)
      (grid.current as HTMLElement | null)?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  });
  return (
    <ScrollView
      horizontal
      minWidth={component.base.none}
      showsHorizontalScrollIndicator
      scrollEnabled={!loading}
      {...(isWeb ? { tabIndex: -1 } : {})}
    >
      <Navigation.Provider value={navigation}>
        <YStack
          ref={grid}
          flexShrink={component.base.none}
          gap={gap ?? component.base.none}
          {...(loading
            ? {
                "aria-hidden": true,
                accessibilityElementsHidden: true,
                importantForAccessibility: "no-hide-descendants" as const,
              }
            : isWeb
              ? { role: "grid", "aria-label": label, "aria-rowcount": rows, "aria-colcount": cols }
              : { accessibilityRole: "grid", accessibilityLabel: label })}
        >
          {children}
        </YStack>
      </Navigation.Provider>
    </ScrollView>
  );
}

type BoardCellProps = Position & {
  id?: string | undefined;
  target?: Target | undefined;
  label: string;
  loading: boolean;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
};
type BoardTileProps = GetProps<typeof YStack> & { cell: BoardCellProps };

export function BoardCell(props: BoardTileProps) {
  const { id, target, loading, disabled } = props.cell;
  const context = usePartContext();
  const item = target?.item ?? id;
  const path = `${context.screen}/${context.component}/${item}/${target?.part}`;
  const valid = Boolean(!loading && !disabled && target && item && parseAddress(path)?.item === item);
  return (
    <PartContext.Provider value={valid ? { ...context, item: item! } : context}>
      <BoardCellContent {...props} valid={valid} />
    </PartContext.Provider>
  );
}

function BoardCellContent({ cell, valid, ...frame }: BoardTileProps & { valid: boolean }) {
  const target = useBoardCell(cell, valid);
  return <YStack {...frame} {...target} />;
}

function useCellRef(ref: ReturnType<typeof usePart>["ref"], detached: { current: boolean }) {
  return useCallback(
    (node: TamaguiElement | null) => {
      if (isWeb && !node && ref.current && ref.current === document.activeElement) detached.current = true;
      ref.current = node;
    },
    [ref, detached],
  );
}

function useBoardCell(props: BoardCellProps, valid: boolean) {
  const { row, col, label, selected, disabled, invalid, loading, target } = props;
  const nav = useContext(Navigation)!;
  const address = usePart(target?.part, valid);
  const { interactive, controller } = useKit();
  const action = target?.action;
  const press =
    valid && interactive && controller
      ? () =>
          action ? controller.act({ address: address.testID, action }) : controller.press(address.testID)
      : undefined;
  const key = positionKey(props);
  useMoveFocus(nav.pending, key, address.ref);
  const ref = useCellRef(address.ref, nav.detachedFocus);
  if (loading) return {};
  const onPress = (event: { stopPropagation?(): void }) => {
    event.stopPropagation?.();
    press?.();
  };
  const part = { ...(valid ? address : {}), ref, ...(press ? { onPress } : {}) };
  if (!isWeb)
    return {
      ...part,
      accessible: true,
      accessibilityLabel: label,
      accessibilityRole: press ? ("button" as const) : ("text" as const),
      accessibilityState: { selected, disabled },
      onAccessibilityTap: press,
    };
  return {
    ...part,
    role: "gridcell" as const,
    "aria-label": label,
    "aria-rowindex": row + 1,
    "aria-colindex": col + 1,
    "aria-selected": selected,
    "aria-disabled": disabled,
    "aria-invalid": invalid,
    tabIndex: nav.active === key ? 0 : -1,
    cursor: press ? ("pointer" as const) : undefined,
    focusVisibleStyle: {
      outlineColor: "$accent",
      outlineStyle: "solid" as const,
      outlineWidth: component.base.strongBorder,
      outlineOffset: -component.base.strongBorder,
    },
    onFocus: () => nav.focus(key),
    onKeyDown(event: KeyEvent) {
      const move = navigationKeys.includes(event.key);
      if (!move && !(press && (event.key === "Enter" || event.key === " "))) return;
      event.preventDefault();
      event.stopPropagation();
      if (move) nav.move(props, event);
      else if (!event.repeat) press?.();
    },
  };
}
