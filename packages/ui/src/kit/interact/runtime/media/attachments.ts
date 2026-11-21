import {
  attachmentKey,
  planAct,
  validMediaReference,
  withDisabledSelectionChecks,
  type AttachmentStatus,
  type MediaOffer,
} from "../../../../catalog";
import type { ControllerContext } from "../index";
import { attachmentCommand } from "./media-host";

type Offer = Extract<MediaOffer, { kind: "attachment" }>;
type Job = { abort: AbortController; token: symbol | undefined };

function slot(ctx: ControllerContext, address: string) {
  const [id, ...target] = ctx.relative(address).split("/");
  return ctx.key(id!, attachmentKey(target.join("/") || "root"));
}

function admitted(ctx: ControllerContext, offer: Offer, job: Job) {
  const { address, spec } = offer;
  if (ctx.options.requireMounted && ctx.mounted.get(address) !== job.token) return false;
  if (ctx.disabledParts.has(address)) return false;
  const at = ctx.now();
  const values = ctx.valuesOf(at);
  const sheet = ctx.status.openSheet;
  const screen = withDisabledSelectionChecks(
    ctx.liveScreen(values, sheet, Boolean(sheet), at),
    ctx.disabledParts,
  );
  const action = spec.intent === "scan" ? "scan" : "press";
  try {
    return planAct(
      screen,
      ctx.defs,
      values,
      [{ address, action }],
      null,
      "controller",
      ctx.options.deviceData,
      at,
    ).ok;
  } catch {
    return false;
  }
}

export function createAttachments(ctx: ControllerContext) {
  const refs = new Map<string, string>();
  const jobs = new Map<string, Job>();
  const slots = new Set<string>();
  const reference = (address: string) => refs.get(`${ctx.screen.id}/${ctx.relative(address)}`);
  function set(address: string, phase: AttachmentStatus["phase"]) {
    const key = slot(ctx, address);
    slots.add(key);
    ctx.store.set(key, { phase, present: refs.has(address) } satisfies AttachmentStatus);
    ctx.notifyChange();
  }
  async function run(offer: Offer) {
    const host = ctx.options.attachments;
    if (!host || ctx.status.disposed) return;
    const command = attachmentCommand(ctx.screen.id, offer);
    const { address, source, intent } = command;
    const job = { abort: new AbortController(), token: ctx.mounted.get(offer.address) };
    if (!admitted(ctx, offer, job)) return;
    const previous = jobs.get(address);
    jobs.set(address, job);
    previous?.abort.abort();
    const input = source ? refs.get(source) : undefined;
    set(address, "pending");
    const current = () => !ctx.status.disposed && jobs.get(address) === job;
    let output: Awaited<ReturnType<typeof host.run>> | undefined;
    try {
      if (current() && (!source || input !== undefined))
        output = await host.run({
          ...command,
          ...(input ? { reference: input } : {}),
          signal: job.abort.signal,
        });
    } catch {
      // Errors from the host may contain private provider details.
    }
    if (!current()) return;
    jobs.delete(address);
    if (!admitted(ctx, offer, job) || (source && refs.get(source) !== input)) {
      ctx.store.set(slot(ctx, address), refs.has(address) ? { phase: "ready", present: true } : undefined);
      return;
    }
    if (
      output?.status !== "accepted" ||
      (output.reference !== undefined && !validMediaReference(output.reference)) ||
      (output.reference === undefined && (intent === "pick" || intent === "scan"))
    )
      return set(address, "error");
    if (output.reference === undefined) refs.delete(address);
    else refs.set(address, output.reference);
    set(address, "ready");
  }
  return {
    run: (offer: Offer) => void run(offer),
    reference,
    clear: () => clearAttachments(ctx, refs, jobs, slots),
  };
}

function clearAttachments(
  ctx: ControllerContext,
  refs: Map<string, string>,
  jobs: Map<string, Job>,
  slots: Set<string>,
) {
  const pending = [...jobs.values()];
  jobs.clear();
  refs.clear();
  if (slots.size) ctx.store.setMany(Object.fromEntries([...slots].map((key) => [key, undefined])));
  slots.clear();
  for (const { abort } of pending) abort.abort();
}
