import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { ScrollView, YStack, isWeb, type GetProps } from "tamagui";
import { component, parseAddress } from "../../../catalog";
import { useMoveFocus } from "../../interact";
import { usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";

export type Target = { item?: string; part: string };
type Position = { row: number; col: number };
type KeyEvent = { key: string; ctrlKey?: boolean; preventDefault(): void; stopPropagation(): void };
const positionKey = ({ row, col }: Position) => `${row}:${col}`;

export function nextPosition(positions: readonly Position[], from: Position, key: string, ctrl = false) {
  const choose = (matches: Position[], reverse: boolean) => (reverse ? matches.at(-1) : matches[0]);
  if (key === "Home" || key === "End")
    return choose(
      positions.filter(({ row }) => ctrl || row === from.row),
      key === "End",
    );
  if (key === "ArrowLeft" || key === "ArrowRight")
    return choose(
      positions.filter(
        ({ row, col }) => row === from.row && (key === "ArrowLeft" ? col < from.col : col > from.col),
      ),
      key === "ArrowLeft",
    );
  if (key === "ArrowUp" || key === "ArrowDown")
    return choose(
      positions.filter(
        ({ row, col }) => col === from.col && (key === "ArrowUp" ? row < from.row : row > from.row),
      ),
      key === "ArrowUp",
    );
  return undefined;
}

const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
const Navigation = createContext<ReturnType<typeof useNavigation> | null>(null);

function useNavigation(positions: readonly Position[]) {
  const [focused, setFocused] = useState<string>();
  const pending = useRef<string | null>(null);
  const active = positions.some((position) => positionKey(position) === focused)
    ? focused
    : positions[0] && positionKey(positions[0]);
  return {
    active,
    pending,
    focus: setFocused,
    move(from: Position, event: KeyEvent) {
      const next = nextPosition(positions, from, event.key, event.ctrlKey);
      if (!next || positionKey(next) === positionKey(from)) return;
      pending.current = positionKey(next);
      setFocused(pending.current);
    },
  };
}

export function BoardGrid({
  rows,
  cols,
  positions,
  label,
  loading,
  gap,
  children,
}: {
  rows: number;
  cols: number;
  positions: readonly Position[];
  label?: string | undefined;
  loading: boolean;
  gap?: number;
  children: ReactNode;
}) {
  const navigation = useNavigation(positions);
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

function useBoardCell(props: BoardCellProps, valid: boolean) {
  const { row, col, label, selected, disabled, invalid, loading, target } = props;
  const nav = useContext(Navigation)!;
  const address = usePart(target?.part, valid);
  const { interactive, controller } = useKit();
  const press = valid && interactive && controller ? () => void controller.press(address.testID) : undefined;
  const key = positionKey(props);
  useMoveFocus(nav.pending, key, address.ref);
  if (loading) return {};
  const handlers = press
    ? {
        onPress: (event: { stopPropagation?(): void }) => {
          event.stopPropagation?.();
          press();
        },
      }
    : {};
  const part = valid ? address : { ref: address.ref };
  if (!isWeb)
    return {
      ...part,
      ...handlers,
      accessible: true,
      accessibilityLabel: label,
      accessibilityRole: valid ? ("button" as const) : ("text" as const),
      accessibilityState: { selected, disabled },
      onAccessibilityTap: press,
    };
  return {
    ...part,
    ...handlers,
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
      else press?.();
    },
  };
}
