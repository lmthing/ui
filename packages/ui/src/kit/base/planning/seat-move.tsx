import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { XStack, YStack, isWeb, type TamaguiElement } from "tamagui";
import { radius, size, space, type as typography } from "../../../catalog";
import { useMoveFocus } from "../../interact";
import { useKit, useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import {
  planningButtonEvents,
  planningNativeChoices,
  usePlanningAddress,
  type Target,
} from "./usePlanningTarget";

export type Seat = {
  id: string;
  label: string;
  initials?: string;
  selected?: boolean;
  target?: Target;
  move?: { destinations: readonly string[]; label: (destination: string) => string };
};
type Address = ReturnType<typeof usePlanningAddress>;
const noRef = { current: null };

function useSeatMoveState() {
  const [open, setOpen] = useState<string | null>(null);
  const focus = useRef<string | null>(null);
  const focusOnOpen = useRef<string | null>(null);
  return { open, setOpen, focus, focusOnOpen };
}

const SeatMoveContext = createContext<ReturnType<typeof useSeatMoveState> | null>(null);

export function SeatMoveScope({ children }: { children: ReactNode }) {
  const state = useSeatMoveState();
  return <SeatMoveContext.Provider value={state}>{children}</SeatMoveContext.Provider>;
}

function useSeatMove(address: Address, seat: Seat, openOnly = false) {
  const { interactive, controller } = useKit();
  const { open, setOpen, focus, focusOnOpen } = useContext(SeatMoveContext)!;
  const testID = address?.testID;
  const destinations = seat.move?.destinations ?? [];
  const active = Boolean(
    testID &&
    (!openOnly || open === testID) &&
    destinations.length &&
    interactive &&
    controller?.actionsAt(testID).includes("move"),
  );
  return {
    active,
    expanded: active && open === testID,
    toggle: () => {
      const next = open === testID ? null : (testID ?? null);
      if (isWeb) focusOnOpen.current = next;
      setOpen(next);
    },
    close: () => setOpen((current) => (current === testID ? null : current)),
    focus,
    focusOnOpen,
    choose: (value: string) => controller!.act({ address: testID!, action: "move", value }),
  };
}

export function useSeatMoveTarget(address: Address, seat: Seat) {
  const { active, expanded, toggle, close, choose, focus } = useSeatMove(address, seat);
  useMoveFocus(focus, address?.testID ?? "", address?.ref ?? noRef);
  if (!address || !seat.move) return {};
  const { destinations, label } = seat.move;
  if (!destinations.length)
    return { ...address, accessibilityRole: "image" as const, accessibilityLabel: seat.label };
  const press = active ? toggle : undefined;
  return {
    ...address,
    accessibilityRole: "button" as const,
    accessibilityLabel: seat.label,
    focusable: active,
    ...(isWeb
      ? { "aria-expanded": expanded, "aria-disabled": !active }
      : {
          accessible: true,
          accessibilityState: { disabled: !active, expanded, selected: seat.selected },
          onAccessibilityTap: press,
          ...(active
            ? planningNativeChoices("move", destinations, label, (destination) => {
                if (choose(destination).ok) close();
              })
            : {}),
        }),
    ...planningButtonEvents(press),
  };
}

type SeatTrayProps = { children: ReactNode; loading: boolean; maxWidth: number; gap: number };
export function SeatTray({ children, loading, maxWidth, gap }: SeatTrayProps) {
  const [height, setHeight] = useState<number>(typography.label.lineHeight);
  return (
    <YStack
      minHeight={loading ? height : typography.label.lineHeight}
      width="100%"
      maxWidth={maxWidth}
      alignSelf="center"
      justifyContent="center"
      gap={gap}
      aria-hidden={loading || undefined}
      onLayout={loading ? undefined : (event) => setHeight(event.nativeEvent.layout.height)}
    >
      {loading ? (
        <YStack width="50%" height={space.md} backgroundColor="$line" borderRadius={radius.pill} />
      ) : (
        children
      )}
    </YStack>
  );
}

export function SeatMoveChoices({ seat }: { seat: Seat }) {
  const address = usePlanningAddress(seat.target, false, false);
  const { expanded, close, choose, focus, focusOnOpen } = useSeatMove(address, seat, true);
  const first = useRef<TamaguiElement>(null);
  const testID = address?.testID;
  useLayoutEffect(() => {
    // Consume focus only on a human open, not when an agent reparents an open chooser.
    if (!isWeb || !expanded || focusOnOpen.current !== testID) return;
    focusOnOpen.current = null;
    (first.current as HTMLElement | null)?.focus();
  }, [expanded, focusOnOpen, testID]);
  if (!expanded || !seat.move || !address) return null;
  const returnFocus = () => {
    if (isWeb) focus.current = address.testID;
    close();
  };
  const chooseDestination = (destination: string) => {
    if (choose(destination).ok) returnFocus();
  };
  return <SeatDestinations seat={seat} first={first} dismiss={returnFocus} choose={chooseDestination} />;
}

function SeatDestinations({
  seat,
  first,
  choose,
  dismiss,
}: {
  seat: Seat;
  first: RefObject<TamaguiElement | null>;
  choose: (destination: string) => void;
  dismiss: () => void;
}) {
  const ks = useKitStyle();
  const { destinations, label } = seat.move!;
  const escape = (event: { key?: string; stopPropagation(): void; preventDefault(): void }) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    event.preventDefault();
    dismiss();
  };
  return (
    <XStack gap={space.xs} flexWrap="wrap" role="group" aria-label={seat.label} onKeyDown={escape}>
      {destinations.map((destination, index) => {
        const press = () => choose(destination);
        return (
          <XStack
            key={destination}
            ref={index === 0 ? first : undefined}
            minHeight={size.control.md}
            minWidth={size.control.md}
            maxWidth="100%"
            paddingHorizontal={space.sm}
            alignItems="center"
            justifyContent="center"
            borderRadius={shifted("sm", ks.radiusShift)}
            backgroundColor="$raised"
            accessibilityRole="button"
            accessibilityLabel={label(destination)}
            focusable
            {...(!isWeb ? { accessible: true, onAccessibilityTap: press } : {})}
            {...planningButtonEvents(press)}
          >
            <KitText role="label" part={null}>
              {destination}
            </KitText>
          </XStack>
        );
      })}
    </XStack>
  );
}
