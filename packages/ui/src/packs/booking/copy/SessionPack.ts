import {
  appointmentDate,
  goalLine,
  numberLine,
  type DeviceData,
  type RecordContext,
  type RecordRuntime,
  type StateName,
  type Values,
} from "../../../catalog";
import { bookingWordsFor } from "../lang";

const soonDays = 7;
const redemption = "redeem";
const retry = "retry";
const packKind = "booking_session_pack";
const packRef = "packId";
const previewKind = `${packKind}_preview`;
export const sessionPackPreviewKinds = [previewKind] as const;
type PackBalance = {
  service?: string | undefined;
  packId: string;
  total: number;
  used: number;
  expires?: string | undefined;
  renewGoto?: string | undefined;
  detail?: "full" | "brief" | undefined;
};

function midnight(date: string, offset: number) {
  const local = new Date(`${date}T00:00:00`);
  return local.setDate(local.getDate() + offset);
}

function expiryOf(expires: string | undefined, now: number) {
  if (expires === undefined) return;
  if (now >= midnight(expires, 1)) return "expired";
  return now >= midnight(expires, -soonDays) ? "soon" : "active";
}

export function sessionPackWake(_data: unknown, { expires }: Readonly<Values>, now: number) {
  if (typeof expires !== "string") return;
  return [midnight(expires, -soonDays), midnight(expires, 1)].find((at) => at > now);
}

function balanceFacts(input: PackBalance, now: number, journal: readonly unknown[] = []) {
  const redeemed = journal.filter((entry) => entry === redemption || entry === retry).length;
  const used = Math.min(input.total, input.used + redeemed);
  const remaining = input.total - used;
  const expiry = expiryOf(input.expires, now);
  const brief = input.detail === "brief";
  const renew = !brief && input.renewGoto ? { goto: input.renewGoto } : undefined;
  return {
    used,
    remaining,
    expiry,
    brief,
    service: brief ? undefined : input.service,
    redeemable: !brief && expiry !== "expired" && remaining > 0,
    redeemed: redeemed > 0,
    recovered: journal.at(-1) === retry,
    renewable: renew !== undefined,
    renew,
    renew_error: renew,
  };
}

export function sessionPackPreview({
  input,
  state,
}: {
  input: Readonly<Values>;
  state: StateName;
}): DeviceData {
  return state === "success" ? { [previewKind]: [input[packRef]] } : {};
}

export function projectSessionPack({ props, journal, now, data }: RecordContext) {
  // Only the gallery fixture supplies a preceding redemption; the live seed already reflects its balance.
  const preview = data[previewKind]?.includes(props[packRef]);
  return balanceFacts(props as PackBalance, now, preview ? [redemption, ...journal] : journal);
}

const redeemAction = (operation: string) => ({
  target: (props: Readonly<Values>) =>
    props.redeemable ? JSON.stringify([props.total, props.used, props.expires]) : undefined,
  plan: ({ props }: RecordContext) =>
    props.redeemable === true ? { operation } : { error: "Pack cannot be redeemed" },
});
export const sessionPackRecord = {
  kind: packKind,
  scope: packRef,
  project: projectSessionPack,
  actions: { "redeem.press": redeemAction(redemption), "retry.press": redeemAction(retry) },
} satisfies RecordRuntime;

type SessionPackFacts = ReturnType<typeof balanceFacts>;
export function sessionPackFacts(input: Values, now = Date.now()): SessionPackFacts {
  return typeof input.remaining === "number"
    ? (input as SessionPackFacts)
    : balanceFacts(input as PackBalance, now);
}

export function sessionPackCopy(
  input: Pick<PackBalance, "expires" | "total">,
  facts: SessionPackFacts,
  state: StateName,
  lang?: string,
) {
  const { sessionPack: words } = bookingWordsFor(lang);
  const date = input.expires && appointmentDate(input.expires, lang);
  const expiry =
    date &&
    words[facts.expiry === "expired" ? "expired" : facts.expiry === "soon" ? "expiring" : "expiry"](date);
  const remaining = numberLine(facts.remaining, lang);
  const feedback =
    state === "error" && !facts.recovered
      ? facts.expiry === "expired"
        ? words.expiredError
        : facts.remaining === 0
          ? words.exhausted
          : words.error
      : state === "success" || facts.redeemed
        ? words.success
        : undefined;
  return {
    amount: `${remaining} ${goalLine(input.total, lang)}`,
    badge: words.remaining(remaining),
    expiry,
    feedback,
  };
}

export function sessionPackReading(input: unknown, state: StateName, lang?: string): string[] {
  if (state === "empty" || state === "loading") return [];
  const facts = sessionPackFacts(input as Values);
  const copy = sessionPackCopy(input as PackBalance, facts, state, lang);
  const { sessionPack: words } = bookingWordsFor(lang);
  return [
    ...(facts.brief ? [copy.badge] : [words.balance, copy.amount]),
    ...(copy.expiry ? [copy.expiry] : []),
    ...(copy.feedback ? [copy.feedback] : []),
    ...(facts.redeemable ? [words.redeem] : []),
    ...(facts.renew ? [words.renew] : []),
  ];
}
