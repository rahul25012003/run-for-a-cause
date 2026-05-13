"use client";

import { useRef, useState } from "react";
import { UploadCloud, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadDropzoneProps {
  endpoint: "image" | "proof";
  value?: string;
  onUploaded: (url: string) => void;
  className?: string;
  label?: string;
}

// Use the server-side upload proxy (/api/upload/[endpoint]) which reads
// the httpOnly cookie directly from the Next.js cookie store and forwards
// multipart form data to the backend. Reliable on all deployment targets.
const UPLOAD_BASE = "/api/upload";

export function FileUploadDropzone({
  endpoint,
  value,
  onUploaded,
  className,
  label = "Drop an image, or click to choose",
}: FileUploadDropzoneProps): React.ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleFile = async (file: File): Promise<void> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be 8 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${UPLOAD_BASE}/${endpoint}`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Upload failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      onUploaded(url);
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all bg-canvas-subtle",
          hover
            ? "border-primary-500 bg-primary-50"
            : "border-ink-200 hover:border-ink-300",
          uploading && "opacity-70 pointer-events-none",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <div className="flex items-center gap-4">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="w-16 h-16 rounded-xl object-cover border border-ink-100"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-white border border-ink-100 flex items-center justify-center">
              <UploadCloud className="w-6 h-6 text-ink-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {uploading ? (
              <p className="text-sm text-ink-700 inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
              </p>
            ) : value ? (
              <>
                <p className="text-sm font-semibold text-secondary-700 inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Uploaded
                </p>
                <p className="text-xs text-ink-500 truncate mt-0.5">{value}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-ink-700">{label}</p>
                <p className="text-xs text-ink-500 mt-0.5">
                  PNG / JPG / WEBP up to 8 MB
                </p>
              </>
            )}
          </div>
          {value && !uploading && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUploaded("");
              }}
              className="p-2 rounded-lg hover:bg-white text-ink-400 hover:text-ink-700 transition"
              aria-label="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
