import { words as TeamNoticeWords } from "./en/TeamNotice";
import { words as TeamDirectoryWords } from "./en/TeamDirectory";
import { words as PayStubWords } from "./en/PayStub";
import { words as LeaveBalanceWords } from "./en/LeaveBalance";
import { words as RosterWords } from "./en/Roster";
import { words as ShiftWords } from "./en/Shift";
import { words as OpenShiftWords } from "./en/OpenShift";
import { words as TimeClockWords } from "./en/TimeClock";
import { words as TimesheetWords } from "./en/Timesheet";
import { words as ApprovalWords } from "./en/Approval";
import { words as HandoverWords } from "./en/Handover";
export const en = {
  ...TeamNoticeWords,
  ...TeamDirectoryWords,
  ...PayStubWords,
  ...LeaveBalanceWords,
  ...RosterWords,
  ...ShiftWords,
  ...OpenShiftWords,
  ...TimeClockWords,
  ...TimesheetWords,
  ...ApprovalWords,
  ...HandoverWords,
};

export type TeamWords = typeof en;
