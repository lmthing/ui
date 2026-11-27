import { useSignatureProgress } from "../../motion";
import { variants } from "../../../catalog";
import { useKit } from "../../provider";
import { useControlValue } from "../../interact";
import { YStack, styled } from "tamagui";
import { component, radius, size } from "../../../catalog";
import { usePart } from "../../part";
import { DrawnCheck } from "../text";

const Hit = styled(YStack, {
  width: size.control.md,
  height: size.control.md,
  alignItems: "center",
  justifyContent: "center",
});

const Box = styled(YStack, {
  width: size.icon.lg,
  height: size.icon.lg,
  borderRadius: radius.sm,
  borderWidth: component.base.strongBorder,
  alignItems: "center",
  justifyContent: "center",
  variants: {
    done: {
      true: { backgroundColor: "$accent", borderColor: "$accent" },
      false: { backgroundColor: "transparent", borderColor: "$muted" },
    },
  } as const,
});

/**
 * A tick box: a 24px box inside a 44px touch area, filled with a check when done. The touch area
 * is the part (default `check`) and carries the checkbox role.
 */
export function KitCheck({
  done,
  part = "check",
  label,
  disabled = false,
  readonly = false,
}: {
  done: boolean;
  part?: string;
  label?: string;
  disabled?: boolean;
  readonly?: boolean;
}) {
  const kit = useKit();
  const address = usePart(part);
  const progress = useSignatureProgress("check_burst");
  const value = useControlValue(address.testID, done);
  const checked = readonly ? done : value;
  return (
    <Hit
      {...address}
      {...(kit.interactive && kit.controller && !disabled && !readonly
        ? {
            onPress: (event: { stopPropagation?(): void }) => {
              event.stopPropagation?.();
              kit.controller!.press(address.testID);
            },
          }
        : {})}
      accessibilityRole={readonly ? "image" : "checkbox"}
      aria-checked={readonly ? undefined : checked}
      aria-label={label}
      {...(disabled ? { disabled: true, "aria-disabled": true } : {})}
      {...(readonly ? {} : disabled ? { focusable: false } : {})}
    >
      <Box
        done={checked}
        {...(disabled ? { opacity: component.base.disabledOpacity } : {})}
        scale={
          checked && !readonly ? 1 + variants.motion[kit.motion].pulseScale * Math.sin(progress * Math.PI) : 1
        }
      >
        <DrawnCheck size={size.icon.sm} tone="onAccent" active={checked} />
      </Box>
    </Hit>
  );
}
