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

type Source = "human" | "agent";
type Acknowledgement = Pick<HostOperation, "status" | "records">;

function createSlots(currentSubjects: (component: string) => Subject[], changed: () => void) {
  let slots = new Map<string, Slot>();
  let version = 0;
  const current = (subject: Subject) => {
    try {
      return currentSubjects(subject.component).some((key) => sameSubject(key, subject));
    } catch {
      return false;
    }
  };
  const working = (values: WorkingValues) => values[stagedSlots] ?? slots;
  return {
    current,
    working,
    latest: (slot: Slot) => slots.get(slotKey(slot.subject)) === slot,
    complete(slot: Slot, outcome: Acknowledgement) {
      const key = slotKey(slot.subject);
      if (slots.get(key) !== slot) return;
      if (!current(slot.subject)) slots.delete(key);
      else
        slots.set(key, {
          subject: slot.subject,
          operation: Object.freeze({ ...slot.operation, ...outcome }),
        });
      version++;
      changed();
    },
    commit(values: WorkingValues) {
      if (values[stagedSlots]) {
        slots = values[stagedSlots];
        version++;
      }
      delete values[stagedSlots];
    },
    prune() {
      const stale = [...slots].filter(([, slot]) => !current(slot.subject));
      for (const [key] of stale) slots.delete(key);
      for (const [, slot] of stale) slot.abort?.abort();
      if (stale.length) {
        version++;
        changed();
      }
    },
    reset() {
      const previous = slots;
      slots = new Map();
      if (previous.size) version++;
      for (const slot of previous.values()) slot.abort?.abort();
    },
    version: () => version,
  };
}

type Slots = ReturnType<typeof createSlots>;
type ResolveHandler = (request: HostRequest) => ReturnType<typeof admitted>;

async function execute(
  slots: Slots,
  resolve: ResolveHandler,
  slot: Slot,
  request: HostRequest,
  source: Source,
) {
  if (!slots.latest(slot)) return;
  if (!slots.current(slot.subject)) {
    slots.complete(slot, { status: "cancelled" });
    return;
  }
  try {
    const run = resolve(request);
    const result = run ? await run({ source, signal: slot.abort!.signal }) : { status: "rejected" as const };
    slots.complete(slot, acknowledgement(result));
  } catch {
    slots.complete(slot, { status: "rejected" });
  }
}

function stage(
  slots: Slots,
  resolve: ResolveHandler,
  values: WorkingValues,
  { subject, request }: HostIntent,
  source: Source,
) {
  const key = slotKey(subject);
  const next = new Map(slots.working(values));
  values[stagedSlots] = next;
  const previous = next.get(key);
  if (request.kind === "cancel") {
    if (!previous) return () => {};
    next.set(key, { subject, operation: Object.freeze({ ...previous.operation, status: "cancelled" }) });
    return () => previous.abort?.abort();
  }
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
    void execute(slots, resolve, slot, request, source);
  };
}

export function createHostCommands(
  screen: string,
  adapter: () => HostCommandAdapter | undefined,
  currentSubjects: (component: string) => Subject[],
  changed: () => void,
) {
  const slots = createSlots(currentSubjects, changed);
  const resolve: ResolveHandler = (request) =>
    admitted(adapter(), { ...request, address: `${screen}/${request.address}` });
  return {
    policy(values: Values): HostActionPolicy {
      const lookup = (subject: Subject) => {
        const slot = slots.working(values).get(slotKey(subject));
        return slot && sameSubject(slot.subject, subject) ? slot.operation : undefined;
      };
      return {
        operation: lookup,
        allowsCommand: ({ subject, request }) =>
          request.kind === "cancel" ? lookup(subject)?.status === "pending" : Boolean(resolve(request)),
      };
    },
    stage: (values: Values, intent: HostIntent, source: Source) =>
      stage(slots, resolve, values, intent, source),
    commit: slots.commit,
    prune: slots.prune,
    reset: slots.reset,
    version: slots.version,
  };
}
