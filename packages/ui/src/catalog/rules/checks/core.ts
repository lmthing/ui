import type { ScreenLike } from "../../agent";
import type { Definition } from "../../probes";
import { at, resolveDefinition, type Issue } from "../shared";
function containsSheetLink(value: unknown): boolean {
  return Boolean(
    value &&
    typeof value === "object" &&
    Object.entries(value).some(
      ([key, child]) => (key === "goto" && child === "sheet") || containsSheetLink(child),
    ),
  );
}

function checkSheetLinks(screen: ScreenLike, flowOpensSheet: boolean): Issue[] {
  const issues: Issue[] = [];
  const sheets = screen.components.filter((entry) => entry.c === "Sheet");
  const linked = screen.components.some(containsSheetLink);
  if (sheets.length && !linked && !flowOpensSheet)
    issues.push({
      code: "S.sheet_without_trigger",
      address: at(screen, sheets[0]),
      message: "A Sheet needs a link or a flow step to open it",
    });
  if (linked && sheets.length !== 1)
    issues.push({
      code: "S.sheet_target",
      address: screen.id,
      message: "A sheet link needs exactly one Sheet",
    });
  return issues;
}

export function checkCore(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  flowOpensSheet = false,
): Issue[] {
  const issues: Issue[] = [];
  for (const c of ["Sheet", "Choice", "Player", "Composer"]) {
    const found = screen.components.filter((entry) => entry.c === c);
    if (found.length > 1)
      issues.push({
        code: `S.${c.toLowerCase()}_over`,
        address: at(screen, found[1]),
        message: `At most one ${c} is allowed`,
      });
  }
  issues.push(...checkSheetLinks(screen, flowOpensSheet));
  const body = screen.components.filter((entry) => resolveDefinition(defs, entry.c)?.meta.region === "body");
  for (const [index, entry] of body.entries())
    if (entry.c === "Composer" && entry.style === "reply") {
      if (
        index !== body.length - 1 ||
        !body.slice(0, index).some((before) => ["Bubbles", "Comments"].includes(before.c))
      )
        issues.push({
          code: "S.reply_order",
          address: at(screen, entry),
          message: "A reply Composer comes last, after a conversation",
        });
    }
  const large = screen.components.filter(
    (entry) => entry.c === "Amount" && (entry.style ?? "large") === "large",
  );
  if (large.length > 1)
    issues.push({
      code: "S.amount_over",
      address: at(screen, large[1]),
      message: "At most one large Amount is allowed",
    });
  if (large.length && screen.components.some((entry) => entry.c === "Hero" && entry.style === "number"))
    issues.push({
      code: "S.headline_values",
      address: at(screen, large[0]),
      message: "Large Amount and number Hero cannot share a screen",
    });
  for (const entry of screen.components)
    if (entry.c === "Button" && entry.kind === "danger" && !entry.confirm)
      issues.push({
        code: "S.danger_confirm",
        address: at(screen, entry),
        message: "A danger Button needs confirmation copy",
      });
  return issues;
}
