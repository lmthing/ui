import { variantAxes, type Meta } from "@lmthing/ui/catalog";
import type { variantChoices } from "../../scripts/variants";

type Choice = ReturnType<typeof variantChoices>[number];
const prefix = "home/c1/";

export function renderedAddresses(html: string) {
  return [...html.matchAll(/\bdata-testid="(home\/[^"]+)"/g)].map((match) => match[1]!);
}

export function derivedItemIds(addresses: string[]) {
  return [
    ...new Set(
      addresses.flatMap((address) => {
        const item = /^home\/c1\/([^/]+)\/[^/]+$/.exec(address)?.[1];
        return item ? [item] : [];
      }),
    ),
  ];
}

/** Runtime-derived rows have no Writer IDs to stamp; verify their declared parts and scopes. */
export function derivedItemIssues(meta: Meta, props: Record<string, unknown>, addresses: string[]) {
  if (!meta.items) return [];
  const expectsRoot =
    meta.items.parts.includes("root") &&
    !Object.entries(props).some(
      ([axis, value]) =>
        typeof value === "string" &&
        meta.variantParts?.[`${axis}.${value}` as keyof NonNullable<Meta["variantParts"]>]?.hides?.includes(
          "root",
        ),
    );
  const issues: string[] = [];
  if (new Set(addresses).size !== addresses.length) issues.push("Duplicate part address");
  for (const id of derivedItemIds(addresses)) {
    const path = `${prefix}${id}/`;
    for (const address of addresses.filter((address) => address.startsWith(path))) {
      if (!meta.items.parts.includes(address.slice(path.length)))
        issues.push(`Undeclared item part: ${address}`);
    }
    if (expectsRoot && !addresses.includes(`${path}root`)) issues.push(`Missing item root: ${path}root`);
  }
  return issues;
}

function allowedPart(address: string, parts: readonly string[], item?: string) {
  const [head, tail] = address.slice(prefix.length).split("/");
  return (!item || (head === item && tail !== undefined)) && parts.includes(tail ?? head!);
}

function partChanges(meta: Meta, choice: Choice, inheritedTrail?: string) {
  const kind = variantAxes[choice.axis].kind;
  if (kind === "finish" || kind === "item" || inheritedTrail === choice.value) return {};
  type Key = keyof NonNullable<Meta["variantParts"]>;
  const to = meta.variantParts?.[`${choice.axis}.${choice.value}` as Key];
  const from =
    inheritedTrail === undefined ? undefined : meta.variantParts?.[`trail.${inheritedTrail}` as Key];
  const diff = (next?: readonly string[], previous?: readonly string[]) =>
    (next ?? []).filter((part) => !previous?.includes(part));
  return {
    adds: [...diff(to?.adds, from?.adds), ...diff(from?.hides, to?.hides)],
    hides: [...diff(to?.hides, from?.hides), ...diff(from?.adds, to?.adds)],
  };
}

/** Compare full addresses, not just part names: adding a part never grants a new item ID. */
export function variantPartIssues(
  meta: Meta,
  choice: Choice,
  before: string[],
  after: string[],
  options: { item?: string; items?: string[]; hidden?: string[]; inheritedTrail?: string } = {},
) {
  const { item, items = [], hidden = [] } = options;
  const left = new Set(before);
  const right = new Set(after);
  const { adds = [], hides = [] } = partChanges(meta, choice, item ? options.inheritedTrail : undefined);
  const hiddenAddresses = hidden.map((id) => `${prefix}${id}/`);
  const issues: string[] = [];
  if (left.size !== before.length || right.size !== after.length) issues.push("Duplicate part address");
  for (const address of right) {
    const segments = address.split("/");
    if (!address.startsWith(prefix) || segments.length < 3 || segments.length > 4)
      issues.push(`Invalid address: ${address}`);
    else if (segments.length === 4 && !items.includes(segments[2]!))
      issues.push(`Unknown item address: ${address}`);
    if (!left.has(address) && !allowedPart(address, adds, item))
      issues.push(`Unexpected added address: ${address}`);
  }
  for (const address of left) {
    if (right.has(address) || hiddenAddresses.some((base) => address.startsWith(base))) continue;
    if (address === `${prefix}root` || !allowedPart(address, hides, item))
      issues.push(`Unexpected missing address: ${address}`);
  }
  return issues;
}
