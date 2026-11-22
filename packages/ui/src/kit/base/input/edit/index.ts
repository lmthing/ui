import { useControlValue, useDateEdit, useNumericControl } from "../../../interact";
import { isWeb } from "tamagui";
import { snapNumber, type IconName } from "../../../../catalog";
import { useKit } from "../../../provider";
import { useComponentState, type usePart } from "../../../part";

export type InputProps = {
  hint: string;
  value?: string | undefined;
  kind?: "text" | "search" | "number" | "date" | "time";
  icon?: IconName | undefined;
  /** Null reserves the loading drawing without an address. */
  part?: string | null;
  label?: string;
  /** Fit paired columns without reducing the addressed control's touch target. */
  compact?: boolean;
  /** Reserve the same text rail as a row with an avatar lead. */
  inset?: "avatar";
  /** Optional visible caption, aligned with the editable text rather than the frame. */
  caption?: string;
  /** Muted, unraised hours that remain editable before their day is enabled. */
  inactive?: boolean;
  /** Display the supplied live value, not a per-address edit or draft. */
  projected?: boolean;
  action?: "type" | "set";
  disabled?: boolean;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
};

function useInputEdit(props: InputProps, address: string, declared: boolean) {
  const kit = useKit();
  return (text: string) => {
    if (props.disabled) return;
    const numeric = props.kind === "number" && text.trim() !== "" && Number.isFinite(Number(text));
    let value = numeric ? Number(text) : text;
    if (typeof value === "number") {
      const min = props.min ?? -Infinity,
        max = props.max ?? Infinity;
      const step = props.step;
      if (step && declared) value = snapNumber(value, min, max, step);
      else if (step && step > 0 && Number.isFinite(step)) {
        const origin = props.min ?? 0;
        const first = Math.ceil((min - origin) / step),
          last = Math.floor((max - origin) / step);
        value = Number(
          (origin + Math.min(last, Math.max(first, Math.round((value - origin) / step))) * step).toPrecision(
            15,
          ),
        );
      }
      value = Math.min(max, Math.max(min, value));
    }
    if (props.action === "set") kit.controller?.act({ address, action: "set", value });
    else
      kit.controller?.edit(
        address,
        numeric && (props.min !== undefined || props.max !== undefined || props.step !== undefined)
          ? String(value)
          : text,
      );
  };
}

function numericRange(value: string | undefined, { min, max }: Pick<InputProps, "min" | "max">) {
  const now = String(value ?? "").trim() ? Number(value) : NaN;
  return {
    "aria-valuenow": Number.isFinite(now) ? now : undefined,
    "aria-valuemin": Number.isFinite(min) ? min : undefined,
    "aria-valuemax": Number.isFinite(max) ? max : undefined,
  };
}

export function useInputBinding({
  address,
  hint,
  value,
  kind = "text",
  ...options
}: InputProps & { address: ReturnType<typeof usePart> }) {
  const kit = useKit();
  const stored = useControlValue(address.testID, value ?? "");
  const draft = useControlValue<string | undefined>(`${address.testID}/$draft`, undefined);
  const loading = useComponentState() === "loading";
  const numericSet = kind === "number" && options.action === "set";
  const numeric = useNumericControl(address.testID, numericSet && !loading);
  if (numeric) options = { ...options, min: numeric.min, max: numeric.max, step: numeric.step };
  if (numeric === null) options = { ...options, disabled: true };
  const edit = useInputEdit({ hint, kind, ...options }, address.testID, !!numeric);
  const editable = kit.interactive && !options.disabled && !loading;
  const dateSet = kind === "date" && options.action === "set";
  const shown = numeric
    ? String(numeric.value ?? "")
    : options.projected
      ? (value ?? "")
      : editable && kit.controller
        ? (draft ?? stored)
        : value;
  const dateEdit = useDateEdit(address.testID, shown, dateSet && editable);
  const role = loading ? undefined : numericSet ? "spinbutton" : kind === "search" ? "searchbox" : "textbox";
  return {
    role,
    loading,
    disabled: options.disabled,
    editable,
    props: {
      ...(numericSet && !loading ? numericRange(shown, options) : {}),
      onFocus: () => kit.nativeHost?.ensureVisible?.(address.ref.current),
      ...(dateSet ? dateEdit : { value: shown, onChangeText: editable && kit.controller ? edit : undefined }),
      type: kind === "search" ? "search" : kind === "date" || kind === "time" ? kind : "text",
      inputMode: kind === "number" ? "decimal" : undefined,
      keyboardType: kind === "number" ? "decimal-pad" : "default",
      ...(numericSet ? { type: "number" } : {}),
      ...(dateSet ? { type: "text", autoCorrect: false, autoCapitalize: "none" } : {}),
      min: options.min,
      max: options.max,
      step: options.step,
      ...(isWeb && dateSet && !loading ? { "data-set-kind": "date" } : {}),
    },
  };
}
