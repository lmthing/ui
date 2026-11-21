import { z } from "zod";
import { peekLimit } from "../../lang";
import type { Meta } from "../../meta";
import type { ActionName, Tier } from "../../types";
import { type Affordance, type Values } from "../index";
import { visibleItems } from "../visibility";

const key = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z][\w.-]*$/);
const identity = z.string().min(1).max(160);
export const hostFields = z
  .record(key, z.union([z.string().max(4096), z.number(), z.boolean(), z.null()]))
  .refine((fields) => Object.keys(fields).length <= 16);
export const hostRecords = z.array(hostFields).max(24);
export type HostFields = Readonly<z.infer<typeof hostFields>>;
export type HostRecords = readonly HostFields[];
export type HostOperation = Readonly<{
  name: string;
  row?: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  records?: HostRecords;
}>;
type Input = { props: Readonly<Values>; row: Readonly<Values> | undefined };
type Binding =
  | { kind: "command"; name: string; input?: (input: Input) => HostFields | undefined }
  | { kind: "external"; uri: (input: Input) => string | undefined }
  | { kind: "cancel" };
type Bindings = Readonly<Partial<Record<`${string}.${ActionName}`, Binding>>>;
export type HostCommands = {
  parts?: Bindings;
  items?: Bindings;
  /** Required for rows; supply a stable domain identity, not a stamped position. */
  identity?: (input: Input) => string | undefined;
  /** Public record fields to include in read; request data is never read. */
  readFields?: readonly string[];
};
type Subject = { component: string; row?: string; identity: string };
type Source = { address: string; action: string; tier: Tier };
export type CommandRequest = Readonly<Source & { kind: "command"; name: string; input: HostFields }>;
export type ExternalRequest = Readonly<Source & { kind: "external"; uri: string }>;
export type HostRequest = CommandRequest | ExternalRequest;
export type HostIntent = {
  subject: Subject;
  request: HostRequest | { kind: "cancel" };
};
export type HostActionPolicy = {
  allowsLink?: (destination: string) => boolean;
  allowsCommand?: (intent: HostIntent) => boolean;
  operation?: (subject: Subject) => HostOperation | undefined;
};
export const hostActionPolicy = Symbol("hostActionPolicy");

/** External handoff is not screen navigation. No credentials, relative URLs or executable schemes. */
export function externalUri(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !/^https:\/\/[^/?#@]+(?:[/?#]|$)/i.test(value) ||
    /[\s\p{Cc}\\]/u.test(value)
  )
    return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password && url.hostname && url.href.length <= 2048) return url.href;
  } catch {
    return;
  }
}

function subjectAt(
  meta: Meta,
  instance: string,
  props: Values,
  row: Values | undefined,
): Subject | undefined {
  const spec = meta.hostCommands;
  if (!spec || (row && !spec.identity)) return;
  const id = identity.safeParse(spec.identity ? spec.identity({ props, row }) : instance);
  if (id.success) return { component: instance, identity: id.data, ...(row ? { row: String(row.id) } : {}) };
}

export function hostSubjects(meta: Meta, instance: string, props: Values) {
  if (!meta.hostCommands) return [];
  return [undefined, ...visibleItems(meta, props)].flatMap((row) => {
    const subject = subjectAt(meta, instance, props, row);
    return subject ? [subject] : [];
  });
}

function makeRequest(binding: Binding, source: Source, input: Input): HostIntent["request"] | undefined {
  if (binding.kind === "cancel") return { kind: "cancel" };
  if (binding.kind === "external") {
    const uri = externalUri(binding.uri(input));
    if (uri && source.tier !== "phone") return { ...source, kind: "external", uri };
    return;
  }
  const fields = hostFields.safeParse(binding.input ? binding.input(input) : {});
  if (key.safeParse(binding.name).success && fields.success)
    return { ...source, kind: "command", name: binding.name, input: Object.freeze(fields.data) };
}

export function hostOffer(
  meta: Meta,
  props: Values,
  instance: string,
  offer: Affordance,
  tier: Tier,
  policy?: HostActionPolicy,
  rows?: ReadonlyMap<string, Values>,
): Affordance | undefined {
  const { address, action, part, detail } = offer;
  const isRow = address !== (part === "root" ? instance : `${instance}/${part}`);
  const row = isRow ? rows?.get(address.split("/")[1]!) : undefined;
  const pair = `${part}.${action}` as `${string}.${ActionName}`;
  const bindings = isRow ? meta.hostCommands?.items : meta.hostCommands?.parts;
  const binding = Object.hasOwn(bindings ?? {}, pair) ? bindings![pair] : undefined;
  const subject = meta.hostCommands && (!isRow || row) ? subjectAt(meta, instance, props, row) : undefined;
  const pending = subject && policy?.operation?.(subject)?.status === "pending";
  if (pending && (binding ? binding.kind !== "cancel" : !meta.loadingActions?.includes(pair))) return;
  if (!binding)
    return detail.startsWith("→") && policy?.allowsLink?.(detail.slice(1)) === false ? undefined : offer;
  if (!subject || !policy?.allowsCommand) return;
  const request = makeRequest(binding, { address, action, tier }, { props, row });
  if (!request || !policy.allowsCommand({ subject, request })) return;
  return {
    ...offer,
    detail: request.kind === "external" ? " external" : "",
    hostIntent: { subject, request },
  };
}

export function readHostOperations(
  meta: Meta,
  props: Values,
  instance: string,
  policy: HostActionPolicy | undefined,
  peekOpen: boolean,
): string[] {
  if (!policy?.operation || !meta.hostCommands) return [];
  const fields = meta.hostCommands.readFields ?? [];
  const limit =
    meta.items?.visible === "first"
      ? 1
      : props.overflow === "peek" && meta.variants?.overflow?.includes("peek") && !peekOpen
        ? peekLimit
        : undefined;
  const visible =
    limit === undefined
      ? undefined
      : new Set(
          visibleItems(meta, props)
            .slice(0, limit)
            .map(({ id }) => id),
        );
  return hostSubjects(meta, instance, props).flatMap((subject) => {
    if (subject.row && visible && !visible.has(subject.row)) return [];
    const operation = policy.operation!(subject);
    if (!operation) return [];
    const records = fields.length
      ? operation.records?.map((row) =>
          Object.fromEntries(fields.filter((k) => Object.hasOwn(row, k)).map((k) => [k, row[k]])),
        )
      : undefined;
    const at = subject.row ? `${instance}/${subject.row}` : instance;
    return [
      `${at} operation ${operation.name} ${operation.status}${records?.length ? ` ${JSON.stringify(records)}` : ""}`,
    ];
  });
}
