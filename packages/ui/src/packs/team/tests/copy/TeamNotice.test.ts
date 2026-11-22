import { expect, it } from "vitest";
import { noticeProgress } from "../../copy";

const receipt = { requireAck: true, acknowledged: false, counted: false, readCount: 14, totalMembers: 18 };

it("counts a newly acknowledged reader once and never exceeds the total", () => {
  expect(noticeProgress(receipt, false)).toEqual({ done: false, count: "14 of 18 read", unread: "4 unread" });
  expect(noticeProgress({ ...receipt, acknowledged: true }, false)).toEqual({
    done: true,
    count: "15 of 18 read",
    unread: "3 unread",
  });
  expect(noticeProgress({ ...receipt, acknowledged: true, counted: true }, true).count).toBe("14 of 18 read");
  expect(noticeProgress({ ...receipt, readCount: 18 }, true).unread).toBe("0 unread");
});

it("formats counts in the requested locale and does not invent optional receipts", () => {
  const input = { ...receipt, requireAck: false };
  expect(noticeProgress(input, true, "ar-EG")).toEqual({
    done: false,
    count: "١٤ of ١٨ read",
    unread: "٤ unread",
  });
});
