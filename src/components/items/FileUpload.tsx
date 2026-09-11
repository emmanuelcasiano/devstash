"use client";

import { useCallback, useRef, useState } from "react";
import { File as FileIcon, Loader2, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatFileSize } from "@/lib/utils";
import {
    acceptAttribute,
    validateUpload,
    type UploadKind,
} from "@/lib/validation/upload";

export interface UploadedFile {
    fileUrl: string;
    fileName: string;
    fileSize: number;
}

interface FileUploadProps {
    kind: UploadKind;
    value: UploadedFile | null;
    onChange: (value: UploadedFile | null) => void;
    disabled?: boolean;
}

/**
 * Drag-and-drop file picker used by the "New Item" dialog for the file and image
 * types. Uploads straight to `POST /api/upload` via `XMLHttpRequest` so the
 * progress bar reflects real bytes sent, then hands the resulting
 * `{ fileUrl, fileName, fileSize }` back through `onChange`.
 */
export function FileUpload({ kind, value, onChange, disabled }: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const xhrRef = useRef<XMLHttpRequest | null>(null);

    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [pendingName, setPendingName] = useState<string | null>(null);

    const upload = useCallback(
        (file: File) => {
            const validation = validateUpload({
                kind,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
            });
            if (!validation.ok) {
                setError(validation.error);
                return;
            }

            setError(null);
            setUploading(true);
            setProgress(0);
            setPendingName(file.name);

            const body = new FormData();
            body.append("file", file);
            body.append("kind", kind);

            const xhr = new XMLHttpRequest();
            xhrRef.current = xhr;
            xhr.open("POST", "/api/upload");

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    setProgress(Math.round((event.loaded / event.total) * 100));
                }
            };

            xhr.onload = () => {
                xhrRef.current = null;
                setUploading(false);
                setPendingName(null);

                let payload: Record<string, unknown> = {};
                try {
                    payload = JSON.parse(xhr.responseText);
                } catch {
                    // fall through to the status-based message below
                }

                if (xhr.status >= 200 && xhr.status < 300) {
                    onChange({
                        fileUrl: String(payload.fileUrl),
                        fileName: String(payload.fileName),
                        fileSize: Number(payload.fileSize),
                    });
                    return;
                }

                setError(
                    typeof payload.error === "string"
                        ? payload.error
                        : "Upload failed. Please try again.",
                );
            };

            xhr.onerror = () => {
                xhrRef.current = null;
                setUploading(false);
                setPendingName(null);
                setError("Upload failed. Please check your connection.");
            };

            xhr.onabort = () => {
                xhrRef.current = null;
                setUploading(false);
                setPendingName(null);
                setProgress(0);
            };

            xhr.send(body);
        },
        [kind, onChange],
    );

    function handleFiles(files: FileList | null) {
        const file = files?.[0];
        if (file) upload(file);
    }

    function cancelUpload() {
        xhrRef.current?.abort();
    }

    function removeFile() {
        onChange(null);
        setError(null);
        if (inputRef.current) inputRef.current.value = "";
    }

    const isImage = kind === "image";

    // Uploaded — show a preview / file summary with a remove control.
    if (value) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={value.fileUrl}
                        alt={value.fileName}
                        className="size-14 shrink-0 rounded-md border border-border object-cover"
                    />
                ) : (
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                        <FileIcon className="size-6 text-muted-foreground" />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <p className="wrap-anywhere text-sm font-medium text-foreground">
                        {value.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {formatFileSize(value.fileSize)}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={removeFile}
                    disabled={disabled}
                    aria-label="Remove file"
                >
                    <X className="size-4" />
                </Button>
            </div>
        );
    }

    // Uploading — progress bar with a cancel control.
    if (uploading) {
        return (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-start gap-2 text-sm text-foreground">
                    <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
                    <span className="min-w-0 flex-1 wrap-anywhere">
                        {pendingName}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {progress}%
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={cancelUpload}
                        aria-label="Cancel upload"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        );
    }

    // Idle — the drop zone.
    return (
        <div className="flex flex-col gap-1.5">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    handleFiles(event.dataTransfer.files);
                }}
                disabled={disabled}
                className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    dragActive && "border-primary bg-primary/10",
                )}
            >
                <UploadCloud className="size-6 text-muted-foreground" />
                <span className="text-sm text-foreground">
                    Drop {isImage ? "an image" : "a file"} here, or click to
                    browse
                </span>
                <span className="text-xs text-muted-foreground">
                    {acceptAttribute(kind).replaceAll(",", " ")} ·{" "}
                    {isImage ? "5 MB" : "10 MB"} max
                </span>
            </button>

            <input
                ref={inputRef}
                type="file"
                accept={acceptAttribute(kind)}
                hidden
                onChange={(event) => handleFiles(event.target.files)}
            />

            {error && (
                <p
                    role="alert"
                    className="text-sm text-destructive"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
