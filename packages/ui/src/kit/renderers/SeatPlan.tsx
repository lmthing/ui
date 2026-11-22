import type { ComponentProps } from "react";
import {
  KitAction,
  KitActionFooter,
  KitContent,
  KitHeader,
  KitLayoutText,
  KitSeatGrid,
  KitSeatMap,
  type LayoutLine,
} from "../base";
import { useComponentState } from "../part";

type SeatGrid = ComponentProps<typeof KitSeatGrid>;
export type SeatPlanProps =
  | ({
      kind: "grid";
      legend?: LayoutLine;
      preview?: LayoutLine;
      total?: LayoutLine;
      action?: ComponentProps<typeof KitAction> & { part: string };
    } & SeatGrid)
  | ({ kind: "tables"; tray?: LayoutLine } & Omit<ComponentProps<typeof KitSeatMap>, "tray">);

/** One seat-plan entry point; grid picks and table assignments keep their own behavior. */
export function SeatPlan(props: SeatPlanProps) {
  const state = useComponentState();
  if (props.kind === "tables") {
    const { kind: _kind, tray, ...tables } = props;
    return <KitSeatMap {...tables} tray={tray && <KitLayoutText line={tray} />} />;
  }
  const { kind: _kind, legend, preview, total, action, ...grid } = props;
  return (
    <KitContent>
      <KitSeatGrid {...grid} />
      {legend && <KitHeader title={legend} />}
      {preview && <KitHeader title={preview} {...(total ? { meta: total } : {})} />}
      {!preview && total && <KitHeader title={total} />}
      {action && (state === "filled" || state === "loading") && (
        <KitActionFooter>
          <KitAction contentParts={{}} {...action} part={state === "loading" ? null : action.part} />
        </KitActionFooter>
      )}
    </KitContent>
  );
}
