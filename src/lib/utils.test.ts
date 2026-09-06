import { describe, expect, it } from "vitest";
import { cn, formatFileSize, formatLongDate, formatShortDate } from "@/lib/utils";

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

describe("formatFileSize", () => {
  it("keeps whole bytes without a decimal", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("scales to KB and MB with one decimal place", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("returns '0 B' for zero, negative, or non-finite input", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(-10)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });
});
