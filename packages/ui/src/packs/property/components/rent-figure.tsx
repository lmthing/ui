import * as c from "../../../catalog";
import * as kit from "../../../kit";

// prettier-ignore
export function Datum({ part, role, text, density, strike, tone }: {
  part: string | null; role: "title" | "body" | "caption" | "number"; text: string; density: c.ThemeDensity;
  strike?: boolean; tone?: kit.TextTone;
}) {
  return kit.useComponentState() === "loading" ?
    <kit.KitSkeleton shape="figure" inset="none" content={[[role, text, "start", "compact"]]} {...{ density }} /> :
    <kit.KitText {...{ part, role, density }} tone={tone ?? "text"} strike={Boolean(strike)} numberScale="compact" tabular={role === "number"}>{text}</kit.KitText>;
}
// prettier-ignore
export function Metric({ part, label, value, density, focal = false }: { part: string; label: string; value: string; density: c.ThemeDensity; focal?: boolean }) {
  return <kit.KitContent {...{ density }}>
    <Datum part={null} role="caption" tone="muted" text={label} {...{ density }} />
    <Datum {...{ part, density }} role="number" tone={focal ? "accent" : "text"} text={value} />
  </kit.KitContent>;
}
