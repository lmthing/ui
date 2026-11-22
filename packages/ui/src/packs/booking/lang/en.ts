import { words as WaitlistWords } from "./en/Waitlist";
import { words as SlotsWords } from "./en/Slots";
import { words as StaffPickerWords } from "./en/StaffPicker";
import { words as AppointmentWords } from "./en/Appointment";
import { words as AvailabilityWords } from "./en/Availability";
import { words as ServiceMenuWords } from "./en/ServiceMenu";
import { words as SessionPackWords } from "./en/SessionPack";
import { words as ClassRosterWords } from "./en/ClassRoster";

export const en = {
  ...WaitlistWords,
  ...SlotsWords,
  ...StaffPickerWords,
  ...AppointmentWords,
  ...AvailabilityWords,
  ...ServiceMenuWords,
  ...SessionPackWords,
  ...ClassRosterWords,
};

export type BookingWords = typeof en;
