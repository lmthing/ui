import type { FilledFlow, FlowFrame } from "@lmthing/ui/catalog";

const demoPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function draftFields(
  screen: string,
  frame: FlowFrame,
  record: FilledFlow["record"],
  get: (address: string) => unknown,
) {
  const edited = Object.fromEntries(
    frame.fields.flatMap((field, i) => {
      const value = get(`${screen}/field_${i + 1}/field`);
      return typeof value === "string" && typeof record[field] === "string" ? [[field, value.trim()]] : [];
    }),
  );
  const at = get(`${screen}/choice/$at`);
  const choice = frame.choice;
  const option = choice?.options[typeof at === "number" ? at : -1];
  if (!choice || !option) return edited;
  const selected = String(record[option]);
  const { total } = choice;
  return {
    ...edited,
    [choice.field]: selected,
    ...(total ? { [total.field]: demoPrice.format(Number(selected) * Number(record[total.unitPrice])) } : {}),
  };
}
