import { createContext, useContext, useId, useLayoutEffect, useState, type ReactNode } from "react";
import { YStack } from "tamagui";
import { space } from "../../catalog";
import { PartContext, usePartContext } from "../part";
import { useKit } from "../provider";

type Slots = Map<string, ReactNode>;
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

export function ScreenBottomOutlet() {
  return <>{Array.from(useContext(SlotContents)?.values() ?? [])}</>;
}

/** Move a body renderer's action bar to its screen's fixed bottom region. Inline outside a screen body. */
export function KitPinnedBottom({ children }: { children: ReactNode }) {
  const setSlots = useContext(SlotSource);
  return setSlots && children != null && children !== false ? (
    <PinnedSlot setSlots={setSlots}>{children}</PinnedSlot>
  ) : (
    <>{children}</>
  );
}

function PinnedSlot({ setSlots, children }: { setSlots: SetSlots; children: ReactNode }) {
  const id = useId();
  const scope = usePartContext();
  const { insets } = useKit().environment;
  const left = Math.max(0, insets.left - space.gutter);
  const right = Math.max(0, insets.right - space.gutter);
  // The outlet shares the screen provider; restore the source's component/item scope there.
  useLayoutEffect(() => {
    const node = (
      <PartContext.Provider key={id} value={scope}>
        <YStack marginLeft={left} marginRight={right}>
          {children}
        </YStack>
      </PartContext.Provider>
    );
    setSlots((slots) => new Map(slots).set(id, node));
  }, [id, setSlots, scope, children, left, right]);
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
