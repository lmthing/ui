import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { amountPadKeys, amountPadText, projectTransfer, transferCopy, transferModes, transferReading,
  transferSources, transferSpeeds, transferTabs, transferChoices, type TransferInput } from "../copy";
import { moneyWordsFor } from "../lang";

// Core first: Field/number edits one value, not a routed payment with funding, fees and confirmation.
const maxMoney = 999_999.99;
const memoLimit = 60;
// prettier-ignore
export const meta = {
  id: "MoneyTransfer",
  status: "ready",
  group: "action",
  purpose: "Send money to or request money from someone, with the cost shown before confirmation.",
  pick: "Send or request money with a named recipient, funding account and speed, or show a personal payment QR. Not entering a local expense (AmountPad, Field), settling group costs (Split), or paying a business invoice (PaymentStatus).",
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A payment service executes transfers; scanning needs camera permission and requests reach another person.",
  writeHints: [
    'Use style "qr" only for the personal code tab; copy only an explicitly supplied demo QR payload.',
    'To hide the memo, set detail "brief" and leave density and surface null. Never write surface "card" or a density unless explicitly requested.',
    "Write amounts as positive numbers to two decimal places, without a currency. Total and confirmation wording are computed.",
  ],
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["memo"] } },
  parts: ["root", "mode", "tab", "recipient", "photo", "handle", "source", "balance", "label", "value", "pad",
    "memo", "speed", "fee", "total", "submit", "submit_label", "code", "scan", "scan_label", "status", "sub"],
  items: { key: "keys", parts: ["root"] },
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { scan: "ok" },
  partTiersBy: { submit: { prop: "mode", tiers: { request: "people" } } },
  confirmParts: ["submit"],
  selections: { mode: { prop: "mode", choices: transferChoices(moneyWordsFor().transfer.modes) },
    tab: { prop: "style", choices: transferChoices(moneyWordsFor().transfer.tabs) },
    source: { prop: "sourceAt", choices: { prop: "sourceChoices" } },
    speed: { prop: "speed", choices: transferChoices(moneyWordsFor().transfer.speeds) } },
  deviceData: ["transferScanner"], previewDeviceData: () => ({ transferScanner: ["c1", "m1"] }),
  live: { text: { pad: { prop: "draft", max: 20 }, memo: { prop: "memo", max: memoLimit } }, derive: projectTransfer },
  emptyActions: ["tab.select", "mode.select", "source.select", "pad.type", "memo.type", "speed.select", "submit.press", "scan.scan"],
  readSuccess: true,
  read: (input, state, lang, _data, currency) => transferReading(input as TransferInput, state, lang, currency),
  actions: {
    parts: { mode: ["select"], tab: ["select"], source: ["select"], pad: ["type"], memo: ["type"],
      speed: ["select"], submit: ["press"], scan: ["scan"] },
    when: {
      mode: { style: "transfer" }, source: { style: "transfer" }, pad: { style: "transfer" },
      memo: { style: "transfer", detail: "full" }, speed: { style: "transfer", mode: "send" },
      submit: { style: "transfer", ready: true }, scan: { style: "qr", scannerReady: true },
    },
  },
} as const satisfies c.Meta;

// prettier-ignore
const money = z.number().nonnegative().max(maxMoney)
  .refine((amount) => amount === Math.round(amount * 100) / 100, "Use up to two decimal places");
// prettier-ignore
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    mode: z.enum(transferModes).default("send"),
    recipient: z.strictObject({ name: c.text(24).meta({ kind: "recipient", max: 24 }),
      handle: c.text(32).meta({ kind: "recipient", max: 32 }).optional(), photo: c.photo.optional() }),
    sources: z.array(z.strictObject({ label: c.text(24), last4: c.text(4).regex(/^\d{4}$/).optional(),
      balance: z.number().optional() })).min(1).max(4),
    sourceAt: z.number().int().min(0).max(3).default(0),
    amount: money.refine((amount) => amount > 0, "Use a positive amount").optional(),
    memo: c.text(memoLimit).optional(),
    speed: z.enum(transferSpeeds).default("standard"),
    instantFee: money.optional(),
    qrPayload: c.text(120).meta({ kind: "code", max: 120 }).optional(),
    style: z.enum(transferTabs).default("transfer"),
  })
  .refine(({ sourceAt, sources }) => sourceAt < sources.length, { path: ["sourceAt"], message: "Select a supplied source" })
  .overwrite((input) => {
    const words = moneyWordsFor();
    const draft = amountPadText(input.amount);
    return { ...input, value: input.amount, draft, max: maxMoney, decimals: 2, confirm: words.transfer.confirm[input.mode],
      kind: "primary", sourceChoices: transferSources(input.sources),
      keys: input.style === "transfer" ? amountPadKeys(words.amountPad, Boolean(draft)) : [],
      ...projectTransfer({ ...input, draft }),
    };
  })
  .meta({ keypadParts: ["pad"] });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [person, account] = c.itemsOf(cast, 2);
  const thing = c.thingOf(cast);
  return {
    recipient: { name: (person && c.titleOf(person, 24, thing)) || c.placeholderTitle(0, lang) },
    sources: [{ label: (account && c.titleOf(account, 24, thing)) || c.placeholderTitle(1, lang) }],
  };
}

// prettier-ignore
const ledge = {
  recipient: { name: "Mina Park", handle: "@mina", photo: "lib:people" },
  sources: [{ label: "Everyday", last4: "4821", balance: 420 }, { label: "Garden fund", balance: 70 }],
  amount: 24.5, memo: "Ledge seed trays", speed: "instant", instantFee: 0.5,
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  ledge,
  { mode: "request", recipient: { name: "Alex Reed", handle: "@alex" }, sources: [{ label: "Trot walking fund" }],
    style: "qr", qrPayload: "demo:trot:alex" },
  { ...ledge, mode: "request", amount: undefined },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("MoneyTransfer");
// prettier-ignore
export const probes = [
  choose("Pay a friend from one of my bank accounts, showing the instant fee and confirming the transfer before sending."),
  choose("Add one small number input for an estimated cost among several form fields. No payment or keypad.", "Field"),
  write("Send Mina Park 24.50 for seed trays from Everyday ending 4821; use instant delivery with a fee of 0.50."),
  { ...write("Send Mina Park 24.50 from Everyday, standard speed. Show the transfer form without the memo field."),
    variant: { axis: "detail", value: "brief" } },
  read("Start confirming payment to Mina Park.", { address: "m1/submit", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;

// prettier-ignore
function Choices({ part, label, choices, value, segments = false }: {
  part: string; label: string; choices: { value: string | number; label: string }[]; value: string | number; segments?: boolean;
}) {
  const loading = kit.useComponentState() === "loading";
  return <kit.KitTrack part={part} label={label} look={segments ? "segments" : "pills"} role="radiogroup">
    {choices.map((option) => <kit.KitChip key={option.value} item={null} role="radio" disabled={loading || undefined}
      look={segments ? "segment" : "pill"} label={option.label} value={typeof option.value === "number" ? option.label : option.value}
      on={value === option.value} />)}
  </kit.KitTrack>;
}

// prettier-ignore
function TransferForm({ input, copy, density }: { input: View; copy: ReturnType<typeof transferCopy>; density: c.ThemeDensity }) {
  const { words } = copy, sending = input.mode === "send", loading = kit.useComponentState() === "loading";
  const { photo, handle } = input.recipient;
  const line = (value: string, part: string | null = null) => loading
    ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", value]]} />
    : <kit.KitText role="label" tone={part === "total" ? "text" : "muted"} part={part}>{value}</kit.KitText>;
  return <>
    <Choices part="mode" label={words.mode} choices={transferChoices(words.modes)} value={input.mode} />
    <kit.KitContent group="response" density={density}>{loading
      ? <kit.KitSkeleton shape="figure" inset="none" lead={photo ? "box" : "none"}
          content={handle ? [["heading", copy.recipient], ["label", handle]] : [["heading", copy.recipient]]} />
      : <kit.KitRow inline part={null} label={copy.recipient} density={density} leadingAlign="row"
      leading={photo ? <kit.KitPhoto part="photo" photo={photo} shape="round" /> : undefined}>
      <kit.KitText role="heading" part="recipient">{copy.recipient}</kit.KitText>
      {handle && <kit.KitText role="label" tone="muted" part="handle">{handle}</kit.KitText>}
    </kit.KitRow>}</kit.KitContent>
    <kit.KitContent group="response" density={density}>
      {line(copy.funding)}
      <Choices part="source" label={copy.funding} choices={copy.sources} value={input.sourceAt} />
      {copy.balance !== undefined && line(copy.balanceLine(copy.balance), "balance")}
    </kit.KitContent>
    {copy.empty && <kit.KitEmpty part="status" icon="wallet" decorativeIcon title={words.empty} />}
    <kit.KitContent group="response" density={density}>
      <kit.KitNumberPad part="pad" displayPart="value" target={{ part: "pad" }} loading={loading} label={words.amount} value={copy.amount} keys={copy.keys} />
      {input.detail === "full" && <kit.KitContent group="response"><kit.KitInput part="memo" hint={words.memo} value={input.memo} /></kit.KitContent>}
    </kit.KitContent>
    <kit.KitContent group="response" density={density}>
      {sending && <>
        {line(words.speed)}
        <Choices part="speed" label={words.speed} choices={transferChoices(words.speeds)} value={input.speed} />
        {line(words.summary(words.fee, copy.fee), "fee")}
      </>}
      {copy.total && line(words.summary(words.total, copy.total), "total")}
      {copy.status && !loading && <kit.KitText role="label" part="status" tone="bad">{copy.status}</kit.KitText>}
      {loading ? <kit.KitSkeleton shape="control" label={words.submit[input.mode]} full />
        : <kit.KitAction part="submit" label={words.submit[input.mode]} disabled={!copy.ready} full />}
    </kit.KitContent>
  </>;
}

// prettier-ignore
export function MoneyTransfer(input: View) {
  const state = kit.useComponentState(), { screen, component } = kit.usePartContext(), loading = state === "loading";
  const { lang } = kit.useWords(moneyWordsFor), currency = kit.useAppCurrency(), canScan = kit.useDeviceData().transferScanner?.includes(component) ?? false;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const draft = kit.useControlValue(`${screen}/${component}/pad`, state === "empty" ? "" : amountPadText(input.amount));
  const copy = transferCopy({ ...input, draft }, state, lang, currency), { words } = copy;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "success" ? <kit.KitEmpty part="status" icon="circle_check" decorativeIcon tone="good"
      title={words.success[input.mode]} sub={copy.recipient} />
      : state === "error" ? <kit.KitEmpty part="status" icon="alert" decorativeIcon title={copy.status ?? words.error} />
      : <>
      <Choices part="tab" label={words.tab} choices={transferChoices(words.tabs)} value={input.style} segments />
      {input.style === "qr" ? <kit.KitContent group="response" density={density}>
        <kit.KitCode part="code" loading={loading} label={state !== "empty" && input.qrPayload ? words.code : words.noCode}
          {...(state !== "empty" && input.qrPayload ? { value: input.qrPayload } : {})} />
        <kit.KitContent group="response">{loading ? <kit.KitSkeleton shape="control" label={words.scan} full />
          : <kit.KitAction part="scan" action="scan" kind="secondary" label={words.scan} disabled={!canScan} full />}</kit.KitContent>
      </kit.KitContent> : <TransferForm {...{ input, copy, density }} />}
    </>}
  </kit.KitCard>;
}
