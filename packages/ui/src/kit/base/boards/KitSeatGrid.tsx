import { XStack, YStack, isWeb } from "tamagui";
import { component, radius, size, space, type as typography } from "../../../catalog";
import { usePart } from "../../part";
import { useKitStyle } from "../../provider";
import { KitText, shifted } from "../text";
import { BoardCell, BoardGrid, type Target } from "./board-navigation";
import { BoardGlyph, type BoardMark } from "./board-mark";

type Seat = {
  id: string;
  label: string;
  kind: "free" | "taken" | "selected" | "aisle";
  seatClass?: BoardMark;
  target?: Target;
};
type Section = {
  id: string;
  label: string;
  rows: readonly { label: string; mark?: BoardMark; seats: readonly Seat[] }[];
};
type SeatGridProps = {
  part?: string;
  loading?: boolean;
  screenLabel?: string;
  sections: readonly Section[];
};

const skeletonSections: readonly Section[] = [
  {
    id: "loading",
    label: "",
    rows: Array.from({ length: 2 }, () => ({
      label: "",
      seats: Array.from({ length: 5 }, (_, col) => ({
        id: String(col),
        label: "",
        kind: col === 2 ? "aisle" : "free",
      })),
    })),
  },
];

function SeatHeading({
  label,
  loading,
  screen = false,
}: {
  label: string;
  loading: boolean;
  screen?: boolean;
}) {
  return (
    <YStack
      minHeight={screen ? size.control.sm : typography.label.lineHeight}
      paddingHorizontal={screen ? space.md : undefined}
      alignItems={screen ? "center" : "flex-start"}
      justifyContent="center"
      borderRadius={screen ? radius.pill : undefined}
      backgroundColor={screen ? "$raised" : undefined}
      aria-hidden={loading || undefined}
    >
      {loading ? (
        <YStack
          width={size.control.lg}
          height={space.sm}
          borderRadius={radius.pill}
          backgroundColor="$line"
        />
      ) : (
        <KitText part={null} role="label" lines={1} tone={screen ? "muted" : "text"}>
          {label}
        </KitText>
      )}
    </YStack>
  );
}

function SeatTile({ seat, row, col, loading }: { seat: Seat; row: number; col: number; loading: boolean }) {
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
        label: seat.seatClass ? `${seat.label}, ${seat.seatClass.label}` : seat.label,
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
      backgroundColor={loading ? "$line" : selected ? "$accentSoft" : taken ? "$raised" : "$surface"}
    >
      {!loading && (
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
      )}
      {!loading && seat.seatClass && <BoardGlyph mark={seat.seatClass} />}
    </BoardCell>
  );
}

function SeatRow({
  row,
  index,
  columns,
  loading,
}: {
  row: Section["rows"][number];
  index: number;
  columns: readonly number[];
  loading: boolean;
}) {
  return (
    <XStack gap={space.xs} alignItems="center" {...(isWeb && !loading ? { role: "row" } : {})}>
      <YStack
        width={size.control.md}
        height={size.control.md}
        justifyContent="center"
        aria-label={!loading && row.mark ? `${row.label}, ${row.mark.label}` : undefined}
        accessibilityLabel={!loading && row.mark ? `${row.label}, ${row.mark.label}` : undefined}
        accessible={!loading && row.mark ? true : undefined}
        {...(isWeb && !loading ? { role: "rowheader", "aria-colindex": 1 } : {})}
      >
        {loading ? (
          <YStack width={space.lg} height={space.sm} borderRadius={radius.pill} backgroundColor="$line" />
        ) : (
          <KitText part={null} role="label" tone="muted" lines={1}>
            {row.label}
          </KitText>
        )}
        {!loading && row.mark && <BoardGlyph mark={row.mark} />}
      </YStack>
      {columns.map((width, col) => {
        const seat = row.seats[col];
        return seat && seat.kind !== "aisle" ? (
          <SeatTile key={seat.id} seat={seat} row={index} col={col + 1} loading={loading} />
        ) : (
          <YStack key={col} width={width} aria-hidden />
        );
      })}
    </XStack>
  );
}

function SeatSection({ section, loading }: { section: Section; loading: boolean }) {
  const cols = Math.max(0, ...section.rows.map(({ seats }) => seats.length));
  const columns = Array.from({ length: cols }, (_, col) =>
    section.rows.some(({ seats }) => seats[col] && seats[col].kind !== "aisle") ? size.control.md : space.lg,
  );
  const positions = section.rows.flatMap(({ seats }, row) =>
    seats.flatMap(({ kind }, col) => (kind === "aisle" ? [] : [{ row, col: col + 1 }])),
  );
  return (
    <YStack gap={space.sm}>
      <SeatHeading label={section.label} loading={loading} />
      {!!section.rows.length && (
        <BoardGrid
          rows={section.rows.length}
          cols={cols + 1}
          positions={positions}
          label={section.label}
          loading={loading}
          gap={space.xs}
        >
          {section.rows.map((row, index) => (
            <SeatRow key={index} row={row} index={index} columns={columns} loading={loading} />
          ))}
        </BoardGrid>
      )}
    </YStack>
  );
}

/** Seat labels and availability are caller-owned; a section is one keyboard grid. */
export function KitSeatGrid({ part = "root", loading = false, screenLabel, sections }: SeatGridProps) {
  const ks = useKitStyle();
  const address = usePart(part);
  const drawings = loading && !sections.length ? skeletonSections : sections;
  return (
    <YStack
      {...address}
      width="100%"
      minWidth={component.base.none}
      gap={space[ks.density.gap]}
      aria-busy={loading || undefined}
    >
      {screenLabel && drawings.length > 0 && <SeatHeading label={screenLabel} loading={loading} screen />}
      {drawings.map((section) => (
        <SeatSection key={section.id} section={section} loading={loading} />
      ))}
    </YStack>
  );
}
