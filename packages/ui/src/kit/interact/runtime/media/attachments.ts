import {
  attachmentKey,
  attachmentRowIdentity,
  attachmentSource,
  atDeviceTime,
  isDeviceDataVisible,
  liveProps,
  parseControlProps,
  planAct,
  projectDeviceData,
  validMediaReference,
  withDisabledSelectionChecks,
  withRecordScreen,
} from "../../../../catalog";
import type { ControllerContext } from "../index";
import {
  attachmentCommand,
  registeredAttachment,
  sameAttachment,
  type AttachmentEntry,
  type AttachmentOffer,
} from "./media-host";

type Job = { abort: AbortController; token: symbol | undefined; before?: AttachmentEntry | undefined };

function mirror(ctx: ControllerContext, address: string, entry?: AttachmentEntry) {
  const [id, ...target] = address.split("/");
  ctx.store.set(
    ctx.key(id!, attachmentKey(target.join("/") || "root")),
    entry && { phase: entry.phase, present: entry.reference !== undefined },
  );
}

function admitted(ctx: ControllerContext, offer: AttachmentOffer, job?: Job) {
  const { address, spec } = offer;
  if (job && ctx.options.requireMounted && ctx.mounted.get(address) !== job.token) return false;
  if (ctx.disabledParts.has(address)) return false;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  const sheet = ctx.status.openSheet;
  const action = spec.intent === "scan" ? "scan" : "press";
  try {
    const screen = withDisabledSelectionChecks(
      ctx.liveScreen(values, sheet, Boolean(sheet), now),
      ctx.disabledParts,
    );
    const plan = planAct(
      screen,
      ctx.defs,
      values,
      [{ address, action }],
      null,
      "controller",
      ctx.options.deviceData,
      now,
    );
    return plan.ok && sameAttachment(offer, plan.media?.[0]);
  } catch {
    return false;
  }
}

function storeEntry(ctx: ControllerContext, address: string, entry?: AttachmentEntry) {
  if (entry) ctx.attachmentEntries.set(address, entry);
  else ctx.attachmentEntries.delete(address);
  mirror(ctx, address, entry);
}

function currentOwner(ctx: ControllerContext, offer: AttachmentOffer) {
  if (offer.identity === undefined) return true;
  const id = offer.address.split("/")[0]!;
  const entry = ctx.sourceOf(id);
  const def = entry && ctx.defs[entry.c];
  if (!entry || !def) return false;
  const now = ctx.now();
  const values = ctx.valuesOf(now);
  if (values[ctx.key(id, "$dismissed")]) return false;
  const data = withRecordScreen(
    atDeviceTime(projectDeviceData(ctx.options.deviceData, values), now),
    ctx.screen,
  );
  if (!isDeviceDataVisible(def.meta, data)) return false;
  const { id: _id, c: _c, state: _state, ...wire } = entry;
  const prefix = `${ctx.screen.id}/`;
  const local = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.replace(prefix, ""), value]),
  );
  try {
    const parsed = parseControlProps(def, wire, (part) => local[`${id}/${part}`]);
    const props = liveProps(def.meta, parsed, id, local, true, data, now);
    return offer.identity === attachmentRowIdentity(def.meta, props, id, offer);
  } catch {
    return false;
  }
}

function restoreEntry(ctx: ControllerContext, address: string, before?: AttachmentEntry) {
  storeEntry(ctx, address, before && currentOwner(ctx, before.offer) ? before : undefined);
}

function reconcile(ctx: ControllerContext, jobs: Map<string, Job>) {
  for (const [address, job] of jobs) {
    const entry = ctx.attachmentEntries.get(address);
    if (!entry || !admitted(ctx, entry.offer, job)) {
      jobs.delete(address);
      restoreEntry(ctx, address, job.before);
      job.abort.abort();
    }
  }
  for (const [address, { offer }] of ctx.attachmentEntries)
    if (!currentOwner(ctx, offer) || !registeredAttachment(ctx.attachmentEntries, address, offer.identity))
      storeEntry(ctx, address);
}

async function run(ctx: ControllerContext, jobs: Map<string, Job>, offer: AttachmentOffer) {
  const host = ctx.options.attachments;
  if (!host || ctx.status.disposed) return;
  const { address, spec } = offer;
  const token = ctx.mounted.get(address);
  const prior = ctx.attachmentEntries.get(address);
  const previous = jobs.get(address);
  const base = previous ? previous.before : prior;
  const before = base && sameAttachment(base.offer, offer) ? base : undefined;
  const job: Job = { abort: new AbortController(), token, before };
  if (!admitted(ctx, offer, job)) return;
  jobs.set(address, job);
  previous?.abort.abort();
  const source = attachmentSource(offer);
  const input = source ? ctx.attachmentEntries.get(source)?.reference : undefined;
  const pending: AttachmentEntry = { ...before, offer, phase: "pending" };
  storeEntry(ctx, address, pending);
  const current = () => !ctx.status.disposed && jobs.get(address) === job;
  let output: Awaited<ReturnType<typeof host.run>> | undefined;
  try {
    if (current() && admitted(ctx, offer, job))
      output = await host.run({
        ...attachmentCommand(ctx.screen.id, offer),
        ...(input ? { reference: input } : {}),
        signal: job.abort.signal,
      });
  } catch {
    // Provider errors are not readable data.
  }
  if (!current()) return;
  jobs.delete(address);
  if (!admitted(ctx, offer, job)) restoreEntry(ctx, address, before);
  else if (
    output?.status !== "accepted" ||
    (output.reference !== undefined && !validMediaReference(output.reference)) ||
    (output.reference === undefined && (spec.intent === "pick" || spec.intent === "scan"))
  )
    storeEntry(ctx, address, { ...pending, phase: "error" });
  else storeEntry(ctx, address, { offer, phase: "ready", reference: output.reference, revision: Symbol() });
  reconcile(ctx, jobs);
  ctx.notifyChange();
}

export function createAttachments(ctx: ControllerContext) {
  const jobs = new Map<string, Job>();
  return {
    run: (offer: AttachmentOffer) => void run(ctx, jobs, offer),
    reference(address: string) {
      const local = ctx.relative(address);
      const stored = ctx.attachmentEntries.get(local);
      if (stored && !ctx.status.disposed && currentOwner(ctx, stored.offer))
        return registeredAttachment(ctx.attachmentEntries, local, stored.offer.identity)?.reference;
    },
    reconcile: () => reconcile(ctx, jobs),
    clear() {
      const pending = [...jobs.values()];
      jobs.clear();
      const addresses = [...ctx.attachmentEntries.keys()];
      ctx.attachmentEntries.clear();
      for (const address of addresses) mirror(ctx, address);
      for (const { abort } of pending) abort.abort();
    },
  };
}
