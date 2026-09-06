import { describe, expect, it } from "vitest";
import { getItemTypeIcon, getItemTypeSlug, isProItemType } from "@/lib/constants/item-types";
import { Code } from "lucide-react";

describe("getItemTypeSlug", () => {
  it("lowercases the item type name", () => {
    expect(getItemTypeSlug("Snippet")).toBe("snippet");
  });
});

describe("isProItemType", () => {
  it("flags file and image as Pro-only, case-insensitively", () => {
    expect(isProItemType("file")).toBe(true);
    expect(isProItemType("Image")).toBe(true);
  });

  it("does not flag the free system types", () => {
    expect(isProItemType("snippet")).toBe(false);
    expect(isProItemType("link")).toBe(false);
  });
});

describe("getItemTypeIcon", () => {
  it("falls back to the Code icon for an unknown icon name", () => {
    expect(getItemTypeIcon("NotARealIcon")).toBe(Code);
  });
});
