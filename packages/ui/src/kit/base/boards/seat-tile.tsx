import { component, size, type IconName } from "../../../catalog";
import { useKitStyle } from "../../provider";
import { seatFill, type SeatState } from "../../seat-state";
import { KitIcon, KitText, shifted } from "../text";
import { BoardCell, type Target } from "./board-navigation";

export type Seat = {
  id: string;
  label: string;
  kind: SeatState | "aisle";
  target?: Target;
  badge?: IconName;
  accessibleLabel?: string;
};

export function SeatTile({
  seat,
  row,
  col,
  loading,
}: {
  seat: Seat;
  row: number;
  col: number;
  loading: boolean;
}) {
  const ks = useKitStyle();
  const selected = !loading && seat.kind === "selected";
  const taken = seat.kind === "taken";
  return (
    <BoardCell
      cell={{
        row,
        col,
        id: seat.id,
        target: seat.target,
        label: seat.accessibleLabel ?? seat.label,
        loading,
        selected,
        disabled: taken || undefined,
      }}
      width={size.control.md}
      height={size.control.md}
      justifyContent="center"
      alignItems="center"
      borderRadius={shifted("sm", ks.radiusShift)}
      borderWidth={selected ? component.base.strongBorder : component.base.borderWidth}
      borderColor={selected ? "$accent" : taken || loading ? "$line" : "$muted"}
      backgroundColor={seatFill[loading ? "loading" : selected ? "selected" : taken ? "taken" : "free"]}
    >
      {!loading && (
        <>
          {seat.badge && <KitIcon name={seat.badge} scale="sm" decorative />}
          <KitText
            part={null}
            role="label"
            tone={taken ? "muted" : "text"}
            lines={1}
            align="center"
            strike={taken}
          >
            {seat.label}
          </KitText>
        </>
      )}
    </BoardCell>
  );
}
