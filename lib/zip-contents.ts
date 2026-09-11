import "server-only";
import JSZip from "jszip";

export interface ZipEntry {
  name: string;
  /** Uncompressed size in bytes. Null when the archive doesn't record it. */
  size: number | null;
  isDirectory: boolean;
}

export const MAX_ZIP_ENTRIES = 300;

/**
 * List what's inside an archive without extracting anything.
 *
 * A zip can't be "viewed" in any meaningful sense, but a recipient staring at
 * a dead end is worse than a recipient who can at least see what they were
 * sent. Nothing is decompressed - we only read the central directory - so a
 * zip bomb has nothing to explode into.
 */
export async function readZipContents(
  buffer: Buffer,
): Promise<{ entries: ZipEntry[]; truncated: boolean }> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: ZipEntry[] = [];
  let truncated = false;

  zip.forEach((relativePath, file) => {
    if (entries.length >= MAX_ZIP_ENTRIES) {
      truncated = true;
      return;
    }

    // JSZip exposes the uncompressed size on an internal field; treat it as
    // optional rather than trusting it to exist.
    const raw = (file as unknown as { _data?: { uncompressedSize?: number } })._data;
    const size = typeof raw?.uncompressedSize === "number" ? raw.uncompressedSize : null;

    entries.push({ name: relativePath, size, isDirectory: file.dir });
  });

  entries.sort((a, b) => a.name.localeCompare(b.name));

  return { entries, truncated };
}
