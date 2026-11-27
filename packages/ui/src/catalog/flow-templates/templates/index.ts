import { bookSlot } from "./book_slot";
import { inviteAccept } from "./invite_accept";
import { requestApprove } from "./request_approve";
import { orderTrack } from "./order_track";
import { reportIssue } from "./report_issue";
import { checkIn } from "./check_in";
import { payReceipt } from "./pay_receipt";
import { signupOnboard } from "./signup_onboard";
import { transferAcknowledge } from "./transfer_acknowledge";
import { findAndFilter } from "./find_and_filter";
import { messageReply } from "./message_reply";
import { changePreference } from "./change_preference";
import { editProfile } from "./edit_profile";
import { completeForm } from "./complete_form";
import { reviewNotification } from "./review_notification";
import { cartToOrder } from "./cart_to_order";
import { classWaitlist } from "../../../packs/booking/flow-templates";
import { assignWorkOrder } from "../../../packs/requests/flow-templates";
import { leadToClient } from "../../../packs/customers/flow-templates";
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
  classWaitlist,
  assignWorkOrder,
  leadToClient,
  transferAcknowledge,
  findAndFilter,
  messageReply,
  changePreference,
  editProfile,
  completeForm,
  reviewNotification,
  cartToOrder,
];
