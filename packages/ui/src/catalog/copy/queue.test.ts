import { expect, it } from "vitest";
import { queueAhead, queueLabels, queueCount, queueExact } from "./queue";

it("labels empty, singular and plural queues without implying membership", () => {
  expect(queueAhead(0)).toBe("0 people ahead");
  expect(queueAhead(1)).toBe("1 person ahead");
  expect(queueAhead(2)).toBe("2 people ahead");
  expect(queueAhead(Number.MAX_SAFE_INTEGER)).toBe("9.01Q ahead");
  expect(queueCount(999)).toBe("999");
  expect(queueCount(1000)).toBe("1K");
  expect(queueCount(999999)).toBe("1M");
  expect(queueCount(1e15)).toBe("1Q");
  expect(queueExact(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toBe(
    "Your place in line: 9007199254740991; 9007199254740991 people ahead",
  );
  expect(queueLabels.join).toBe("Join waitlist");
  expect(queueLabels.leave).toBe("Leave waitlist");
});
