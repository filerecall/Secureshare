"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ACCEPT_ATTRIBUTE,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/upload-constraints";

interface PresignResponse {
  document: { id: string };
  uploadUrl: string;
}

const MAX_MB = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);

export function UploadButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    setError(null);
    inputRef.current?.click();
  }

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      setError(`File type "${file.type}" is not supported.`);
      return;
    }

    setUploading(true);
    let createdDocumentId: string | null = null;

    try {
      // 1. Ask the server for a presigned URL.
      const presignRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        const payload = (await presignRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not prepare upload.");
      }

      const { document, uploadUrl } = (await presignRes.json()) as PresignResponse;
      createdDocumentId = document.id;

      // 2. PUT the bytes directly to S3. Every header the presigner included
      //    in X-Amz-SignedHeaders has to be sent here with the same value, or
      //    S3 returns 403 SignatureDoesNotMatch. We sign x-amz-server-side-
      //    encryption in lib/s3.ts so it MUST be set on the request too.
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-amz-server-side-encryption": "AES256",
        },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error(`S3 rejected the upload (status ${putRes.status}).`);
      }

      // 3. Re-render the server component so the new row appears.
      router.refresh();
    } catch (err) {
      // Roll back the orphan row if we created one.
      if (createdDocumentId) {
        await fetch(`/api/documents/${createdDocumentId}`, { method: "DELETE" }).catch(() => {
          /* swallow cleanup failure */
        });
      }
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      // Reset the input so picking the same file twice still fires onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button onClick={pickFile} loading={uploading} disabled={uploading}>
        <Upload className="h-4 w-4" aria-hidden />
        {uploading ? "Uploading..." : "Upload document"}
      </Button>
      {error ? (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
