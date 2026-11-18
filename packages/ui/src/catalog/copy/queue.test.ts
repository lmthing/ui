import { expect, it } from "vitest";
import { queueAhead, queueLabels } from "./queue";

it("labels empty, singular and plural queues without implying membership", () => {
  expect(queueAhead(0)).toBe("0 people ahead");
  expect(queueAhead(1)).toBe("1 person ahead");
  expect(queueAhead(2)).toBe("2 people ahead");
  expect(queueLabels.join).toBe("Join waitlist");
  expect(queueLabels.leave).toBe("Leave waitlist");
});
