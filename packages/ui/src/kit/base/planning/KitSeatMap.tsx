import type { ReactNode } from "react";
import { LayoutGrid } from "@tamagui/lucide-icons";
import { XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted, surfaceOf } from "../text";
import { SeatMoveChoices, SeatMoveScope, SeatTray, type Seat } from "./seat-move";
import { SeatBank, ScopedSeat } from "./seat-marks";
import { PlanningTargetScope, usePlanningTarget, type Target } from "./usePlanningTarget";

type Table = {
  id: string;
  label: string;
  shape: "round" | "long";
  seats: readonly Seat[];
  target?: Target;
  labelPart?: string;
  count?: { part: string; text: string };
};
type SeatMapProps = {
  part?: string | null;
  loading?: boolean;
  tables: readonly Table[];
  tray?: ReactNode;
  trayGuests?: readonly (Pick<Seat, "id" | "label" | "target" | "namePart"> & {
    move: NonNullable<Seat["move"]>;
  })[];
};
const mapWidth = component.base.emptyMinHeight + 2 * (space.md + component.base.borderWidth);

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
        <KitText role="body" part={table.labelPart ?? null} align="center" lines={round ? 2 : 1}>
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
      {!loading && table.count && (
        <KitText role="caption" tone="muted" part={table.count.part} align="center" tabular>
          {table.count.text}
        </KitText>
      )}
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
/** Tables and their seats are separate targets, never nested controls. */
export function KitSeatMap({ part = "root", loading = false, tables, tray, trayGuests = [] }: SeatMapProps) {
  const ks = useKitStyle();
  const address = usePart(part ?? undefined, part !== null);
  const drawings = loading && !tables.length ? loadingTables : tables;
  const guests = trayGuests.map((guest) => <ScopedSeat key={guest.id} seat={guest} tray />);
  return (
    <YStack {...(part === null ? {} : address)} gap={space[ks.density.gap]} aria-busy={loading || undefined}>
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
        {(tray != null || trayGuests.length > 0) && (
          <SeatTray loading={loading} maxWidth={mapWidth} gap={trayGuests.length ? space.xs : 0}>
            {tray}
            {guests.length > 0 && (
              <YStack
                {...surfaceOf(ks.surface)}
                borderRadius={shifted("md", ks.radiusShift)}
                padding={space.xs}
                gap={space.xs}
              >
                {guests}
              </YStack>
            )}
          </SeatTray>
        )}
      </SeatMoveScope>
    </YStack>
  );
}
