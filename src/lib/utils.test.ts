import { describe, expect, it } from "vitest";
import { cn, formatLongDate, formatShortDate } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });
});

describe("formatShortDate", () => {
  it("formats a date as abbreviated month + day", () => {
    expect(formatShortDate(new Date(2026, 7, 22))).toBe("Aug 22");
  });
});

describe("formatLongDate", () => {
  it("formats a date as full month, day, and year", () => {
    expect(formatLongDate(new Date(2026, 7, 22))).toBe("August 22, 2026");
  });
});
