import { XStack, YStack } from "tamagui";
import { component, size, space } from "../../../catalog";
import { PartContext, usePart, usePartContext } from "../../part";
import { useKit } from "../../provider";
import { KeyButton, type KeyFinish } from "./PadKey";
import { useKeypadTarget } from "./use-keypad-target";

type CalcKey = {
  id: string;
  label: string;
  value: string;
  role?: "digit" | "op" | "fn" | "eq";
  disabled?: boolean;
};
type CalcProps = {
  part?: string;
  loading?: boolean;
  keys: readonly CalcKey[];
  scientific?: boolean;
  target: { item?: string; part: string };
  disabled?: boolean;
};

const columns = 4;
const finishes = { digit: "plain", op: "accent", fn: "accent", eq: "primary" } as const satisfies Record<
  NonNullable<CalcKey["role"]>,
  KeyFinish
>;

export function calcKeys(keys: CalcProps["keys"], scientific: boolean) {
  return {
    standard: keys.filter((key) => key.role !== "fn"),
    drawer: scientific ? keys.filter((key) => key.role === "fn") : [],
  };
}

function KeyRows({
  keys,
  loading,
  disabled,
  dispatch,
}: {
  keys: readonly CalcKey[];
  loading: boolean;
  disabled: boolean;
  dispatch?: ((value: string) => void) | undefined;
}) {
  return (
    <XStack flexWrap="wrap" marginHorizontal={-space.xs}>
      {keys.map((key) => (
        <YStack
          key={key.id}
          width={`${100 / columns}%`}
          minWidth={size.control.md + space.xs * 2}
          padding={space.xs}
        >
          <KeyButton
            label={key.label}
            loading={loading}
            disabled={disabled || Boolean(key.disabled)}
            finish={finishes[key.role ?? "digit"]}
            press={dispatch && (() => dispatch(key.value))}
          />
        </YStack>
      ))}
    </XStack>
  );
}

function CalcGrid({ keys, scientific = false, loading = false, disabled = false, target }: CalcProps) {
  const kit = useKit();
  const address = useKeypadTarget(target.part, !loading, disabled);
  const { standard, drawer } = calcKeys(keys, scientific);
  const dispatch =
    kit.interactive && kit.controller && !loading && !disabled
      ? (value: string) => void kit.controller?.act({ address: address.testID, action: "type", value })
      : undefined;
  return (
    <YStack {...(!loading ? address : {})} accessibilityRole={loading ? undefined : "group"}>
      {drawer.length > 0 && (
        <YStack
          borderBottomWidth={component.base.borderWidth}
          borderColor="$line"
          paddingBottom={space.xs}
          marginBottom={space.xs}
        >
          <KeyRows keys={drawer} {...{ loading, disabled, dispatch }} />
        </YStack>
      )}
      <KeyRows keys={standard} {...{ loading, disabled, dispatch }} />
    </YStack>
  );
}

/** The caller owns the expression and whether its scientific drawer is open. */
export function KitCalcPad({ part = "root", ...props }: CalcProps) {
  const scope = usePartContext();
  const item = props.target.item ?? scope.item;
  const separate = part !== props.target.part || item !== scope.item;
  const address = usePart(part, separate);
  return (
    <YStack {...(separate ? address : {})} aria-busy={props.loading || undefined}>
      <PartContext.Provider value={item === scope.item ? scope : { ...scope, item }}>
        <CalcGrid {...props} />
      </PartContext.Provider>
    </YStack>
  );
}
