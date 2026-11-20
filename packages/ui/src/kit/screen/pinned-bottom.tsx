import { createContext, useContext, useId, useLayoutEffect, useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { space } from "../../catalog";
import { RowLabelContext } from "../a11y";
import { PartContext, usePartContext } from "../part";
import { useKit } from "../provider";

type Slots = Map<string, { screen: string; owner: string; node: ReactNode }>;
type SetSlots = React.Dispatch<React.SetStateAction<Slots>>;
const SlotUpdates = createContext<SetSlots | null>(null);
const SlotSource = createContext<SetSlots | null>(null);
const SlotContents = createContext<Slots | null>(null);

export function ScreenBottomSlots({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<Slots>(() => new Map());
  return (
    <SlotUpdates.Provider value={setSlots}>
      <SlotContents.Provider value={slots}>{children}</SlotContents.Provider>
    </SlotUpdates.Provider>
  );
}

export function ScreenBottomSource({ children }: { children: ReactNode }) {
  return <SlotSource.Provider value={useContext(SlotUpdates)}>{children}</SlotSource.Provider>;
}

export function ScreenBottomOutlet({ screen, order }: { screen: string; order: readonly string[] }) {
  const slots = useContext(SlotContents);
  if (!slots?.size) return null;
  const current = [...slots.values()].filter((slot) => slot.screen === screen);
  // Follow the live body order and omit entries that KitPresence is still fading out.
  return (
    <>{order.flatMap((owner) => current.filter((slot) => slot.owner === owner).map((slot) => slot.node))}</>
  );
}

/** Move a body renderer's action bar to its screen's fixed bottom region. Inline outside a screen body. */
export function KitPinnedBottom({ children }: { children: ReactNode }) {
  const setSlots = useContext(SlotSource);
  return setSlots && children != null && typeof children !== "boolean" ? (
    <PinnedSlot setSlots={setSlots}>{children}</PinnedSlot>
  ) : (
    <>{children}</>
  );
}

function PinnedSlot({ setSlots, children }: { setSlots: SetSlots; children: ReactNode }) {
  const id = useId();
  const scope = usePartContext();
  const rowLabel = useContext(RowLabelContext);
  const { insets } = useKit().environment;
  const left = Math.max(0, insets.left - space.gutter);
  const right = Math.max(0, insets.right - space.gutter);
  // The outlet shares the screen provider; restore the source's component/item scope there.
  useLayoutEffect(() => {
    const node = (
      <PartContext.Provider key={id} value={scope}>
        <RowLabelContext.Provider value={rowLabel}>
          <YStack marginLeft={left} marginRight={right}>
            {children}
          </YStack>
        </RowLabelContext.Provider>
      </PartContext.Provider>
    );
    setSlots((slots) => new Map(slots).set(id, { screen: scope.screen, owner: scope.component, node }));
  }, [id, setSlots, scope, rowLabel, children, left, right]);
  useLayoutEffect(
    () => () =>
      setSlots((slots) => {
        const next = new Map(slots);
        next.delete(id);
        return next;
      }),
    [id, setSlots],
  );
  return null;
}
