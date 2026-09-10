import { describe, expect, it } from "vitest";

import {
    acceptAttribute,
    extensionOf,
    isUploadKind,
    sanitizeFileName,
    validateUpload,
} from "@/lib/validation/upload";

const MB = 1024 * 1024;

describe("isUploadKind", () => {
    it("accepts the two known kinds", () => {
        expect(isUploadKind("file")).toBe(true);
        expect(isUploadKind("image")).toBe(true);
    });

    it("rejects anything else", () => {
        expect(isUploadKind("snippet")).toBe(false);
        expect(isUploadKind("")).toBe(false);
        expect(isUploadKind(null)).toBe(false);
        expect(isUploadKind(undefined)).toBe(false);
    });
});

describe("extensionOf", () => {
    it("returns the lower-cased extension including the dot", () => {
        expect(extensionOf("photo.PNG")).toBe(".png");
        expect(extensionOf("archive.tar.gz")).toBe(".gz");
        expect(extensionOf("/tmp/path/to/report.PDF")).toBe(".pdf");
    });

    it("returns an empty string when there is no extension", () => {
        expect(extensionOf("README")).toBe("");
        expect(extensionOf(".gitignore")).toBe("");
    });
});

describe("sanitizeFileName", () => {
    it("strips directories and unsafe characters", () => {
        expect(sanitizeFileName("../../etc/passwd")).toBe("passwd");
        expect(sanitizeFileName("my report (final).pdf")).toBe(
            "my-report-final-.pdf",
        );
        expect(sanitizeFileName("weird  spaces.txt")).toBe("weird-spaces.txt");
    });

    it("falls back to 'file' when nothing usable remains", () => {
        expect(sanitizeFileName("   ")).toBe("file");
        expect(sanitizeFileName("***")).toBe("file");
    });
});

describe("validateUpload", () => {
    it("accepts a valid PNG image", () => {
        expect(
            validateUpload({
                kind: "image",
                fileName: "avatar.png",
                mimeType: "image/png",
                size: 200 * 1024,
            }),
        ).toEqual({ ok: true });
    });

    it("accepts a valid PDF file", () => {
        expect(
            validateUpload({
                kind: "file",
                fileName: "spec.pdf",
                mimeType: "application/pdf",
                size: 1 * MB,
            }),
        ).toEqual({ ok: true });
    });

    it("accepts a text-ish file whose browser MIME is blank", () => {
        expect(
            validateUpload({
                kind: "file",
                fileName: "config.toml",
                mimeType: "",
                size: 512,
            }),
        ).toEqual({ ok: true });
    });

    it("rejects an unknown kind", () => {
        const result = validateUpload({
            kind: "video",
            fileName: "clip.mp4",
            mimeType: "video/mp4",
            size: 1024,
        });
        expect(result.ok).toBe(false);
    });

    it("rejects an empty file", () => {
        const result = validateUpload({
            kind: "file",
            fileName: "empty.txt",
            mimeType: "text/plain",
            size: 0,
        });
        expect(result).toMatchObject({ ok: false });
    });

    it("rejects an image over 5 MB", () => {
        const result = validateUpload({
            kind: "image",
            fileName: "huge.jpg",
            mimeType: "image/jpeg",
            size: 6 * MB,
        });
        expect(result).toMatchObject({ ok: false });
    });

    it("rejects a file over 10 MB", () => {
        const result = validateUpload({
            kind: "file",
            fileName: "huge.pdf",
            mimeType: "application/pdf",
            size: 11 * MB,
        });
        expect(result).toMatchObject({ ok: false });
    });

    it("rejects an extension that belongs to the other kind", () => {
        const result = validateUpload({
            kind: "image",
            fileName: "notes.pdf",
            mimeType: "application/pdf",
            size: 1024,
        });
        expect(result).toMatchObject({ ok: false });
    });

    it("rejects a disallowed MIME type even with an allowed extension", () => {
        const result = validateUpload({
            kind: "image",
            fileName: "trick.png",
            mimeType: "application/x-msdownload",
            size: 1024,
        });
        expect(result).toMatchObject({ ok: false });
    });
});

describe("acceptAttribute", () => {
    it("lists the allowed extensions for a kind", () => {
        expect(acceptAttribute("image")).toBe(
            ".png,.jpg,.jpeg,.gif,.webp,.svg",
        );
        expect(acceptAttribute("file")).toContain(".pdf");
    });
});
