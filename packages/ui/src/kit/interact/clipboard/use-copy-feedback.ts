import { useEffect } from "react";
import { useKit } from "../../provider";
import { useControlValue } from "../index";
import { copyStatusKey } from "./index";

export function useCopyFeedback(address: string | undefined, disabled: boolean) {
  const { controller } = useKit();
  useEffect(
    () => (address && disabled ? controller?.registerDisabledPart(address) : undefined),
    [address, disabled, controller],
  );
  return useControlValue<unknown>(address ? copyStatusKey(address) : undefined, undefined) === true;
}
