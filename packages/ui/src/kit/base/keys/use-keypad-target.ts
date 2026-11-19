import { useEffect } from "react";
import { usePart } from "../../part";
import { useKit } from "../../provider";

export function useKeypadTarget(part: string, addressed: boolean, disabled: boolean) {
  const { controller } = useKit();
  const address = usePart(part, addressed);
  useEffect(
    () => (addressed && disabled ? controller?.registerDisabledPart(address.testID) : undefined),
    [addressed, disabled, controller, address.testID],
  );
  return address;
}
