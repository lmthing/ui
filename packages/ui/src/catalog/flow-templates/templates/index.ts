import { bookSlot } from "./book_slot";
import { inviteAccept } from "./invite_accept";
import { requestApprove } from "./request_approve";
import { orderTrack } from "./order_track";
import { reportIssue } from "./report_issue";
import { checkIn } from "./check_in";
import { payReceipt } from "./pay_receipt";
import { signupOnboard } from "./signup_onboard";
import type { FlowTemplateSource } from "../registry";

export const builtInFlowTemplates: readonly FlowTemplateSource[] = [
  bookSlot,
  inviteAccept,
  requestApprove,
  orderTrack,
  reportIssue,
  checkIn,
  payReceipt,
  signupOnboard,
];
