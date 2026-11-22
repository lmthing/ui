import { XStack, YStack, isWeb } from "tamagui";
import { size } from "../../../catalog";
import { KitText } from "../text";

type Clues = readonly (string | null)[];
export type AxisClues = { rows?: Clues; columns?: Clues };

/** A partial or extra axis is ambiguous. Reject it independently of the other axis. */
export function axisClues(values: Clues | undefined, count: number) {
  return values?.length === count && values.some((value) => value?.trim()) ? values : undefined;
}

export function AxisClue({
  label,
  height,
  loading,
  column,
}: {
  label: string | null;
  height: number;
  loading: boolean;
  column?: number;
}) {
  const role = column === undefined ? "rowheader" : "columnheader";
  return (
    <YStack
      width={size.control.md}
      height={height}
      justifyContent="center"
      {...(isWeb && !loading ? { role, "aria-colindex": column ?? 1 } : {})}
    >
      {!loading && (
        <KitText part={null} role="caption" align="center" tone="muted">
          {label}
        </KitText>
      )}
    </YStack>
  );
}

export function ColumnClues({ clues, corner, loading }: { clues: Clues; corner: boolean; loading: boolean }) {
  return (
    <XStack {...(isWeb && !loading ? { role: "row" } : {})}>
      {corner && <YStack width={size.control.md} aria-hidden />}
      {clues.map((label, index) => (
        <AxisClue
          key={index}
          column={index + (corner ? 2 : 1)}
          label={label}
          height={size.control.md}
          loading={loading}
        />
      ))}
    </XStack>
  );
}
