"use client";

import { useRef, useState } from "react";
import { Film, Loader2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoUploadDropzoneProps {
  value?: string;
  onUploaded: (url: string) => void;
  className?: string;
  label?: string;
  /** MB cap displayed in hint and enforced visually before upload. */
  maxMb?: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export function VideoUploadDropzone({
  value,
  onUploaded,
  className,
  label = "Drop a video, or click to choose",
  maxMb = 50,
}: VideoUploadDropzoneProps): React.ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleFile = async (file: File): Promise<void> => {
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file (mp4, webm, mov).");
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(
        `Video must be ${maxMb} MB or smaller. Compress with ffmpeg first.`,
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/uploads/video`, {
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
      toast.success("Video uploaded");
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
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <div className="flex items-center gap-4">
          {value ? (
            <div className="w-20 h-14 rounded-lg bg-ink-900 overflow-hidden flex items-center justify-center relative">
              <video
                src={value}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Film className="w-5 h-5 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-20 h-14 rounded-lg bg-white border border-ink-100 flex items-center justify-center">
              <Film className="w-6 h-6 text-ink-400" />
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
                  MP4 / WEBM / MOV up to {maxMb} MB · keep it short, &lt;15s
                  loops best
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
              aria-label="Remove video"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
