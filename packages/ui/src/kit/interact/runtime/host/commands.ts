import {
  hostRecords,
  type CommandRequest,
  type ExternalRequest,
  type HostActionPolicy,
  type HostIntent,
  type HostOperation,
  type HostRecords,
  type HostRequest,
  type Values,
} from "../../../../catalog";

export type HostCommandResult =
  { status: "accepted"; records?: HostRecords } | { status: "rejected"; records?: HostRecords };
type Handler<Request> = {
  /** A synchronous, side-effect-free check of availability and permission. */
  allows(request: Request): boolean;
  run(
    request: Request,
    context: { signal: AbortSignal; source: "human" | "agent" },
  ): HostCommandResult | Promise<HostCommandResult>;
};
export type HostCommandAdapter = {
  commands?: Readonly<Record<string, Handler<CommandRequest>>>;
  external?: Handler<ExternalRequest>;
};

type Subject = HostIntent["subject"];
type Slot = { subject: Subject; operation: HostOperation; abort?: AbortController };
const stagedSlots = Symbol("stagedHostSlots");
type WorkingValues = Values & { [stagedSlots]?: Map<string, Slot> };
const slotKey = ({ component, row }: Subject) => `${component}/${row ?? ""}`;
const sameSubject = (a: Subject, b: Subject) => slotKey(a) === slotKey(b) && a.identity === b.identity;

function admitted(adapter: HostCommandAdapter | undefined, request: HostRequest) {
  if (!adapter) return;
  try {
    if (request.kind === "external") {
      const handler = adapter.external;
      if (handler?.allows(request) === true) return handler.run.bind(handler, request);
    } else if (Object.hasOwn(adapter.commands ?? {}, request.name)) {
      const handler = adapter.commands![request.name];
      if (handler?.allows(request) === true) return handler.run.bind(handler, request);
    }
  } catch {
    // An adapter permission error is a denial, not a read or dispatch error.
  }
}

function acknowledgement(result: HostCommandResult): Pick<HostOperation, "status" | "records"> {
  if (result?.status !== "accepted" && result?.status !== "rejected") return { status: "rejected" };
  if (result.records === undefined) return { status: result.status };
  const parsed = hostRecords.safeParse(result.records);
  return parsed.success
    ? { status: result.status, records: Object.freeze(parsed.data.map((row) => Object.freeze(row))) }
    : { status: "rejected" };
}

export function createHostCommands(
  screen: string,
  adapter: () => HostCommandAdapter | undefined,
  currentSubjects: (component: string) => Subject[],
  changed: () => void,
) {
  let slots = new Map<string, Slot>();
  let version = 0;
  const current = (subject: Subject) =>
    currentSubjects(subject.component).some((key) => sameSubject(key, subject));
  const working = (values: WorkingValues) => values[stagedSlots] ?? slots;
  const full = (request: HostRequest): HostRequest => ({
    ...request,
    address: `${screen}/${request.address}`,
  });
  const lookup = (subject: Subject, values: WorkingValues) => {
    const slot = working(values).get(slotKey(subject));
    return slot && sameSubject(slot.subject, subject) ? slot : undefined;
  };
  function policy(values: Values): HostActionPolicy {
    return {
      operation: (subject) => lookup(subject, values)?.operation,
      allowsCommand: ({ subject, request }) =>
        request.kind === "cancel"
          ? lookup(subject, values)?.operation.status === "pending"
          : Boolean(admitted(adapter(), full(request))),
    };
  }
  function complete(slot: Slot, outcome: Pick<HostOperation, "status" | "records">) {
    const key = slotKey(slot.subject);
    if (slots.get(key) !== slot) return;
    if (!current(slot.subject)) slots.delete(key);
    else
      slots.set(key, { subject: slot.subject, operation: Object.freeze({ ...slot.operation, ...outcome }) });
    version++;
    changed();
  }
  async function execute(slot: Slot, request: HostRequest, source: "human" | "agent") {
    if (slots.get(slotKey(slot.subject)) !== slot) return;
    if (!current(slot.subject)) {
      complete(slot, { status: "cancelled" });
      return;
    }
    try {
      const run = admitted(adapter(), full(request));
      const result = run
        ? await run({ source, signal: slot.abort!.signal })
        : { status: "rejected" as const };
      complete(slot, acknowledgement(result));
    } catch {
      complete(slot, { status: "rejected" });
    }
  }
  function stage(values: WorkingValues, { subject, request }: HostIntent, source: "human" | "agent") {
    const key = slotKey(subject);
    const next = new Map(working(values));
    values[stagedSlots] = next;
    const previous = next.get(key);
    if (request.kind === "cancel" && previous) {
      next.set(key, {
        subject,
        operation: Object.freeze({ ...previous.operation, status: "cancelled" }),
      });
      return () => previous.abort?.abort();
    }
    if (request.kind === "cancel") return () => {};
    const slot: Slot = {
      subject,
      operation: Object.freeze({
        ...(subject.row ? { row: subject.row } : {}),
        name: request.kind === "external" ? "external" : request.name,
        status: "pending",
      }),
      abort: new AbortController(),
    };
    next.set(key, slot);
    return () => {
      previous?.abort?.abort();
      void execute(slot, request, source);
    };
  }
  function commit(values: WorkingValues) {
    if (values[stagedSlots]) {
      slots = values[stagedSlots];
      version++;
    }
    delete values[stagedSlots];
  }
  function prune() {
    const stale = [...slots].filter(([, slot]) => !current(slot.subject));
    for (const [key] of stale) slots.delete(key);
    for (const [, slot] of stale) slot.abort?.abort();
    if (stale.length) {
      version++;
      changed();
    }
  }
  function reset() {
    const previous = slots;
    slots = new Map();
    if (previous.size) version++;
    for (const slot of previous.values()) slot.abort?.abort();
  }
  return { policy, stage, commit, prune, reset, version: () => version };
}
