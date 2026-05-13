"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

/**
 * Multi-image gallery uploader. Up to `max` photos. Click or drop to add,
 * X to remove. Newly uploaded items are appended.
 */
export function GalleryUploader({
  value,
  onChange,
  max = 6,
}: GalleryUploaderProps): React.ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [hover, setHover] = useState(false);

  const handleFiles = async (files: FileList | File[]): Promise<void> => {
    const remaining = max - value.length;
    if (remaining <= 0) {
      toast.error(`Up to ${max} photos. Remove one to add another.`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of list) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}: not an image, skipped.`);
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name}: bigger than 8 MB, skipped.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`${API_URL}/uploads/image`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!res.ok) {
          toast.error(`${file.name}: upload failed.`);
          continue;
        }
        const { url } = (await res.json()) as { url: string };
        uploaded.push(url);
      }
      if (uploaded.length > 0) {
        onChange([...value, ...uploaded]);
        toast.success(`Added ${uploaded.length} photo${uploaded.length === 1 ? "" : "s"}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number): void => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      {/* Existing photos grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-3">
          {value.map((url, i) => (
            <div
              key={url + i}
              className="relative aspect-square rounded-lg overflow-hidden bg-canvas-subtle group"
            >
              <Image
                src={url}
                alt={`Gallery ${i + 1}`}
                fill
                sizes="(min-width:768px) 16vw, 33vw"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-ink-900/70 hover:bg-red-600 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone (only when below max) */}
      {value.length < max && (
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
            if (e.dataTransfer.files?.length) {
              void handleFiles(e.dataTransfer.files);
            }
          }}
          className={`relative cursor-pointer rounded-xl border-2 border-dashed p-5 transition bg-canvas-subtle text-center ${
            hover
              ? "border-primary-500 bg-primary-50"
              : "border-ink-200 hover:border-ink-300"
          } ${uploading ? "opacity-70 pointer-events-none" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
          <div className="inline-flex items-center gap-3">
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 text-ink-500 animate-spin" />
                <span className="text-sm text-ink-700">Uploading…</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5 text-ink-500" />
                <span className="text-sm text-ink-700">
                  {value.length === 0
                    ? "Drop or choose photos (up to "
                    : "Add more (up to "}
                  {max}, {max - value.length} remaining)
                </span>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-500">PNG / JPG / WEBP · up to 8 MB each</p>
        </div>
      )}
    </div>
  );
}
