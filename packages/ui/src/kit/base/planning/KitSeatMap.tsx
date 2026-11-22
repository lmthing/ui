import { useState, type ReactNode } from "react";
import { LayoutGrid } from "@tamagui/lucide-icons";
import { isWeb, ScrollView, XStack, YStack } from "tamagui";
import { component, radius, size, space } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { seatFill } from "../../seat-state";
import { KitText, shifted } from "../text";
import { SeatMoveChoices, SeatMoveScope, SeatTray, useSeatMoveTarget, type Seat } from "./seat-move";
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
const seatEdge = size.control.md;

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
function ScopedSeat({ seat, loading = false, tray = false }: ScopedSeatProps) {
  return (
    <PlanningTargetScope id={seat.id} target={seat.target}>
      <SeatMark seat={seat} loading={loading} tray={tray} />
      {tray && <SeatMoveChoices seat={seat} tray />}
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
        <KitText role="body" part={table.labelPart ?? null} align="center" lines={round ? 2 : 1}>
          {table.label}
        </KitText>
      )}
    </YStack>
  );
}

function RoundDrawing({ table, loading, diameter }: { table: Table; loading: boolean; diameter: number }) {
  const { seats } = table;
  return (
    <YStack width={diameter} height={diameter} alignSelf="center" alignItems="center" justifyContent="center">
      <TableTop table={table} loading={loading} />
      {seats.length > 0 && (
        <YStack fullscreen margin={seatEdge / 2} pointerEvents="box-none">
          {seats.map((seat, index) => {
            const angle = (index / seats.length) * (Math.PI * 2);
            return (
              <YStack
                key={seat.id}
                position="absolute"
                left={`${(1 + Math.sin(angle)) * 50}%`}
                top={`${(1 - Math.cos(angle)) * 50}%`}
                marginLeft={-seatEdge / 2}
                marginTop={-seatEdge / 2}
              >
                <ScopedSeat seat={seat} loading={loading} />
              </YStack>
            );
          })}
        </YStack>
      )}
    </YStack>
  );
}

function RoundTable({ table, loading }: { table: Table; loading: boolean }) {
  const [width, setWidth] = useState(0);
  const diameter = table.seats.length ? roundDiameter(table.seats.length) : seatEdge * 2;
  const overflowing = width > 0 && width < diameter;
  return (
    <ScrollView
      horizontal
      onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
      contentContainerStyle={{ minWidth: "100%", justifyContent: "center" }}
      showsHorizontalScrollIndicator={overflowing && !loading}
      scrollEnabled={!loading}
      {...(isWeb && overflowing && !loading
        ? { role: "region", tabIndex: 0, "aria-label": table.label }
        : {})}
    >
      <RoundDrawing {...{ table, loading, diameter }} />
    </ScrollView>
  );
}

function roundDiameter(count: number) {
  const clearOfTable = seatEdge * 4 + space.xs * 2;
  const clearOfSeats = count > 1 ? (seatEdge + space.xs) / Math.sin(Math.PI / count) + seatEdge : 0;
  return Math.ceil(Math.max(clearOfTable, clearOfSeats));
}

function LongTable({ table, loading }: { table: Table; loading: boolean }) {
  const { seats } = table;
  const split = Math.ceil(seats.length / 2);
  return (
    <>
      <SeatBank seats={seats.slice(0, split)} loading={loading} />
      <YStack alignItems="center">
        <TableTop table={table} loading={loading} />
      </YStack>
      <SeatBank seats={seats.slice(split)} loading={loading} />
    </>
  );
}

function TableDrawing({ table, loading }: { table: Table; loading: boolean }) {
  const ks = useKitStyle();
  const round = table.shape === "round";
  return (
    <YStack
      gap={space.xs}
      padding={space.md}
      width="100%"
      maxWidth={
        round
          ? Math.max(
              mapWidth,
              roundDiameter(table.seats.length) + 2 * (space.md + component.base.borderWidth),
            )
          : mapWidth
      }
      alignSelf="center"
      borderRadius={shifted("lg", ks.radiusShift)}
      borderWidth={component.base.borderWidth}
      borderColor="$line"
      backgroundColor="$surface"
      aria-hidden={loading || undefined}
      accessibilityElementsHidden={loading || undefined}
    >
      {round ? <RoundTable {...{ table, loading }} /> : <LongTable {...{ table, loading }} />}
      {!loading && table.count && (
        <KitText role="caption" tone="muted" part={table.count.part} align="center" tabular>
          {table.count.text}
        </KitText>
      )}
      {!loading &&
        table.seats.map(
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
          <SeatTray loading={loading} hasHeading={tray != null} guests={trayGuests.length}>
            {tray}
            {guests}
          </SeatTray>
        )}
      </SeatMoveScope>
    </YStack>
  );
}
