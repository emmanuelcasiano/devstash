import { describe, expect, it } from "vitest";
import {
  getItemTypeColor,
  getItemTypeIcon,
  getItemTypeSlug,
  isProItemType,
  resolveProItemTypeSlug,
} from "@/lib/constants/item-types";
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

describe("resolveProItemTypeSlug", () => {
  it("resolves singular and plural file/image slugs, case-insensitively", () => {
    expect(resolveProItemTypeSlug("file")).toBe("file");
    expect(resolveProItemTypeSlug("files")).toBe("file");
    expect(resolveProItemTypeSlug("Image")).toBe("image");
    expect(resolveProItemTypeSlug("images")).toBe("image");
  });

  it("returns null for non-Pro or unknown type slugs", () => {
    expect(resolveProItemTypeSlug("snippet")).toBeNull();
    expect(resolveProItemTypeSlug("snippets")).toBeNull();
    expect(resolveProItemTypeSlug("bogus")).toBeNull();
  });
});

describe("getItemTypeIcon", () => {
  it("falls back to the Code icon for an unknown icon name", () => {
    expect(getItemTypeIcon("NotARealIcon")).toBe(Code);
  });
});

describe("getItemTypeColor", () => {
  it("returns the brand color for a system type, case-insensitively", () => {
    expect(getItemTypeColor("snippet")).toBe("#3b82f6");
    expect(getItemTypeColor("Link")).toBe("#10b981");
  });

  it("falls back to gray for an unknown type", () => {
    expect(getItemTypeColor("whatever")).toBe("#6b7280");
  });
});
