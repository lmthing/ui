import { useState, type ReactNode } from "react";
import { LayoutGrid } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import { SeatMoveChoices, SeatMoveScope, useSeatMoveTarget, type Seat } from "./seat-move";
import {
  PlanningTargetScope,
  usePlanningAddress,
  usePlanningPress,
  usePlanningTarget,
  type Target,
} from "./usePlanningTarget";

type Table = {
  id: string;
  label: string;
  shape: "round" | "long";
  seats: readonly Seat[];
  target?: Target;
};
type SeatMapProps = { part?: string; loading?: boolean; tables: readonly Table[]; tray?: ReactNode };
const mapWidth = component.base.emptyMinHeight + 2 * (space.md + component.base.borderWidth);

function SeatMark({ seat, loading }: { seat: Seat; loading: boolean }) {
  const address = usePlanningAddress(seat.target, loading);
  const press = usePlanningPress(seat.move ? undefined : address, seat.label, Boolean(seat.selected));
  const move = useSeatMoveTarget(seat.move ? address : undefined, seat);
  const selected = !loading && seat.selected;
  return (
    <YStack
      {...press}
      {...move}
      {...(!loading && !address ? { accessibilityRole: "image", accessibilityLabel: seat.label } : {})}
      width={size.control.md}
      height={size.control.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={radius.pill}
      borderWidth={selected ? component.base.strongBorder : component.base.borderWidth}
      borderColor={selected ? "$accent" : "$line"}
      backgroundColor={loading ? "$line" : selected ? "$accentSoft" : seat.initials ? "$raised" : "$surface"}
    >
      {!loading &&
        (seat.initials ? (
          <KitText role="label" part={null} align="center" lines={1}>
            {seat.initials}
          </KitText>
        ) : (
          <YStack width={space.sm} height={space.sm} borderRadius={radius.pill} backgroundColor="$muted" />
        ))}
    </YStack>
  );
}

function ScopedSeat({ seat, loading }: { seat: Seat; loading: boolean }) {
  return (
    <PlanningTargetScope id={seat.id} target={seat.target}>
      <SeatMark seat={seat} loading={loading} />
    </PlanningTargetScope>
  );
}

function SeatBank({ seats, loading }: { seats: readonly Seat[]; loading: boolean }) {
  return seats.length ? (
    <XStack justifyContent="center" flexWrap="wrap" gap={space.xs}>
      {seats.map((seat) => (
        <ScopedSeat key={seat.id} seat={seat} loading={loading} />
      ))}
    </XStack>
  ) : null;
}

function TableTop({ table, loading }: { table: Table; loading: boolean }) {
  const ks = useKitStyle();
  const target = usePlanningTarget(table.target, table.label, loading);
  const round = table.shape === "round";
  return (
    <YStack
      {...target}
      width={round ? size.control.md * 2 : "100%"}
      maxWidth={round ? undefined : component.base.emptyMinHeight}
      height={round ? size.control.md * 2 : size.control.lg}
      paddingHorizontal={round ? space.sm : space.md}
      alignItems="center"
      justifyContent="center"
      borderRadius={round ? radius.pill : shifted("md", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      backgroundColor="$raised"
    >
      {loading ? (
        <YStack width="60%" height={space.sm} borderRadius={radius.pill} backgroundColor="$line" />
      ) : (
        <KitText role="body" part={null} align="center" lines={round ? 2 : 1}>
          {table.label}
        </KitText>
      )}
    </YStack>
  );
}

function TableDrawing({ table, loading }: { table: Table; loading: boolean }) {
  const ks = useKitStyle();
  const { seats } = table;
  const flanks = table.shape === "round" && seats.length >= 4;
  const split = Math.ceil(seats.length / 2);
  const top = seats.slice(0, split - (flanks ? 1 : 0));
  const bottom = seats.slice(split + (flanks ? 1 : 0));
  return (
    <YStack
      gap={space.xs}
      padding={space.md}
      width="100%"
      maxWidth={mapWidth}
      alignSelf="center"
      borderRadius={shifted("lg", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      backgroundColor="$surface"
      aria-hidden={loading || undefined}
      accessibilityElementsHidden={loading || undefined}
    >
      <SeatBank seats={top} loading={loading} />
      <XStack gap={space.xs} alignItems="center" justifyContent="center">
        {flanks && <ScopedSeat seat={seats[split - 1]!} loading={loading} />}
        <TableTop table={table} loading={loading} />
        {flanks && <ScopedSeat seat={seats[split]!} loading={loading} />}
      </XStack>
      <SeatBank seats={bottom} loading={loading} />
      {!loading &&
        seats.map(
          (seat) =>
            seat.move && (
              <PlanningTargetScope key={seat.id} id={seat.id} target={seat.target}>
                <SeatMoveChoices seat={seat} />
              </PlanningTargetScope>
            ),
        )}
    </YStack>
  );
}

const loadingTables: readonly Table[] = [{ id: "placeholder", label: "", shape: "long", seats: [] }];

function SeatTray({ tray, loading }: { tray: ReactNode; loading: boolean }) {
  const [height, setHeight] = useState<number>(typography.label.lineHeight);
  return (
    <YStack
      minHeight={loading ? height : typography.label.lineHeight}
      width="100%"
      maxWidth={mapWidth}
      alignSelf="center"
      justifyContent="center"
      aria-hidden={loading || undefined}
      onLayout={loading ? undefined : (event) => setHeight(event.nativeEvent.layout.height)}
    >
      {loading ? (
        <YStack width="50%" height={space.md} backgroundColor="$line" borderRadius={radius.pill} />
      ) : (
        tray
      )}
    </YStack>
  );
}

/** Tables and their seats are separate targets, never nested controls. */
export function KitSeatMap({ part = "root", loading = false, tables, tray }: SeatMapProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const drawings = loading && !tables.length ? loadingTables : tables;
  return (
    <YStack {...address} gap={space[ks.density.gap]} aria-busy={loading || undefined}>
      {!drawings.length && (
        <YStack
          alignItems="center"
          paddingTop={space.lg}
          paddingBottom={space.xs}
          aria-hidden
          accessibilityElementsHidden
        >
          <LayoutGrid size={size.icon.lg} color="$muted" />
        </YStack>
      )}
      <SeatMoveScope>
        {drawings.map((table) => (
          <PlanningTargetScope key={table.id} id={table.id} target={table.target}>
            <TableDrawing table={table} loading={loading} />
          </PlanningTargetScope>
        ))}
      </SeatMoveScope>
      {tray != null && <SeatTray tray={tray} loading={loading} />}
    </YStack>
  );
}
