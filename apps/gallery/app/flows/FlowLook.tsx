import { TamaguiProvider, Text, YStack } from "tamagui";
import { fillFlow, flowTemplates, space, themeName, type FlowState } from "@lmthing/ui/catalog";
import { config } from "../../index";
import { FlowPhone, flowTheme } from "./FlowPhone";

const cases = [
  ["book_slot", "guest/confirmed"],
  ["invite_accept", "invitee/review"],
  ["request_approve", "approver/reason", "error"],
  ["order_track", "customer/in_transit"],
  ["report_issue", "reporter/describe", "empty"],
  ["check_in", "attendee/arrived"],
  ["pay_receipt", "payer/processing", "waiting"],
  ["signup_onboard", "member/first_task"],
  ["login_recovery", "member/login"],
  ["class_waitlist", "member/offer"],
  ["assign_work_order", "dispatcher/verify"],
  ["lead_to_client", "prospect/review"],
  ["transfer_acknowledge", "receiver/review"],
  ["find_and_filter", "browser/results"],
  ["find_and_filter", "browser/results", "empty"],
  ["message_reply", "recipient/incoming"],
  ["change_preference", "member/edit"],
  ["edit_profile", "owner/edit"],
  ["complete_form", "applicant/review"],
  ["review_notification", "member/unread"],
  ["cart_to_order", "customer/review_pickup"],
] as const satisfies readonly (readonly [string, string, FlowState?])[];

function LookPhone({
  id,
  step,
  state,
  width,
}: {
  id: string;
  step: string;
  state?: FlowState;
  width: number;
}) {
  const template = flowTemplates.get(id)!;
  const { id: _id, ...example } = template.examples[0]!;
  const flow = fillFlow(template, example);
  const index = flow.frames.findIndex(({ key }) => key === step);
  return (
    <YStack gap={space.xs}>
      <Text color="$muted" data-look-label fontSize="$caption">
        {template.title}
      </Text>
      <YStack width={width} backgroundColor="$surface" data-look-frame={state ? `${id}-${state}` : id}>
        <FlowPhone {...{ flow, index, state }} />
      </YStack>
    </YStack>
  );
}

export function FlowLook({ width }: { width: number }) {
  return (
    <TamaguiProvider config={config} defaultTheme={themeName(flowTheme)}>
      <YStack padding={space.lg} gap={space.md} backgroundColor="$bg">
        {cases.map(([id, step, state]) => (
          <LookPhone key={`${id}/${state ?? "play"}`} {...{ id, step, width, ...(state ? { state } : {}) }} />
        ))}
      </YStack>
    </TamaguiProvider>
  );
}
