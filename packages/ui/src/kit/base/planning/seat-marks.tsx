import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { seatFill } from "../../seat-state";
import { KitText } from "../text";
import { SeatMoveChoices, useSeatMoveTarget, type Seat } from "./seat-move";
import { PlanningTargetScope, usePlanningAddress, usePlanningPress } from "./usePlanningTarget";

function SeatMark({ seat, loading, tray }: { seat: Seat; loading: boolean; tray: boolean }) {
  const address = usePlanningAddress(seat.target, loading);
  const press = usePlanningPress(seat.move ? undefined : address, seat.label, Boolean(seat.selected));
  const move = useSeatMoveTarget(seat.move ? address : undefined, seat);
  const selected = !loading && seat.selected;
  return (
    <YStack
      {...press}
      {...move}
      {...(!loading && !address ? { accessibilityRole: "image", accessibilityLabel: seat.label } : {})}
      width={tray ? "100%" : size.control.md}
      height={size.control.md}
      alignItems={tray ? "flex-start" : "center"}
      justifyContent="center"
      paddingHorizontal={tray ? space.sm : undefined}
      borderRadius={tray ? radius.md : radius.pill}
      borderWidth={tray ? 0 : selected ? component.base.strongBorder : component.base.borderWidth}
      borderColor={selected ? "$accent" : "$line"}
      backgroundColor={
        tray
          ? undefined
          : seatFill[loading ? "loading" : selected ? "selected" : seat.initials ? "taken" : "free"]
      }
    >
      {!loading &&
        (tray || seat.initials ? (
          <KitText
            role={tray ? "body" : "label"}
            part={seat.namePart ?? null}
            align={tray ? "start" : "center"}
            lines={1}
          >
            {tray ? seat.label : seat.initials}
          </KitText>
        ) : (
          <YStack width={space.sm} height={space.sm} borderRadius={radius.pill} backgroundColor="$muted" />
        ))}
    </YStack>
  );
}
type ScopedSeatProps = { seat: Seat; loading?: boolean; tray?: boolean };
export function ScopedSeat({ seat, loading = false, tray = false }: ScopedSeatProps) {
  return (
    <PlanningTargetScope id={seat.id} target={seat.target}>
      <SeatMark seat={seat} loading={loading} tray={tray} />
      {tray && <SeatMoveChoices seat={seat} tray />}
    </PlanningTargetScope>
  );
}

export function SeatBank({ seats, loading }: { seats: readonly Seat[]; loading: boolean }) {
  return seats.length ? (
    <XStack justifyContent="center" flexWrap="wrap" gap={space.xs}>
      {seats.map((seat) => (
        <ScopedSeat key={seat.id} seat={seat} loading={loading} />
      ))}
    </XStack>
  ) : null;
}
