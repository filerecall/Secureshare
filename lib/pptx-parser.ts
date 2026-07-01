import "server-only";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export interface PptxSlide {
  index: number;
  paragraphs: string[];
  images: { src: string }[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export async function parsePptx(buffer: Buffer): Promise<PptxSlide[]> {
  const zip = await JSZip.loadAsync(buffer);

  const slideFiles: { path: string; num: number }[] = [];
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
    if (match) {
      slideFiles.push({ path: relativePath, num: parseInt(match[1], 10) });
    }
  });
  slideFiles.sort((a, b) => a.num - b.num);

  const slides: PptxSlide[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const { path: slidePath } = slideFiles[i];
    const xml = await zip.file(slidePath)!.async("text");
    const parsed = parser.parse(xml);

    const paragraphs = extractParagraphs(parsed);
    const images = await extractImages(zip, slidePath);

    slides.push({ index: i + 1, paragraphs, images });
  }

  return slides;
}

function extractParagraphs(obj: unknown): string[] {
  const paragraphs: string[] = [];
  walkParagraphs(obj, paragraphs);
  return paragraphs.filter((p) => p.trim().length > 0);
}

function walkParagraphs(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) walkParagraphs(item, out);
    return;
  }

  const obj = node as Record<string, unknown>;

  if ("a:p" in obj) {
    const paragraphNodes = toArray(obj["a:p"]);
    for (const pNode of paragraphNodes) {
      const text = collectText(pNode);
      if (text) out.push(text);
    }
  }

  for (const val of Object.values(obj)) {
    if (typeof val === "object" && val !== null && !("a:p" in (val as Record<string, unknown>))) {
      walkParagraphs(val, out);
    } else if (typeof val === "object" && val !== null && "a:p" in (val as Record<string, unknown>)) {
      walkParagraphs(val, out);
    }
  }
}

function collectText(node: unknown): string {
  const parts: string[] = [];

  function walk(n: unknown): void {
    if (n === null || n === undefined) return;
    if (typeof n === "string" || typeof n === "number") return;

    const obj = n as Record<string, unknown>;

    if ("a:t" in obj) {
      const t = obj["a:t"];
      if (typeof t === "string" || typeof t === "number") {
        parts.push(String(t));
      }
    }

    if (Array.isArray(n)) {
      for (const item of n) walk(item);
    } else if (typeof n === "object") {
      for (const val of Object.values(obj)) {
        if (typeof val === "object" && val !== null) walk(val);
      }
    }
  }

  walk(node);
  return parts.join("");
}

async function extractImages(
  zip: JSZip,
  slidePath: string,
): Promise<{ src: string }[]> {
  const relPath = slidePath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
  const relFile = zip.file(relPath);
  if (!relFile) return [];

  const relXml = await relFile.async("text");
  const relParsed = parser.parse(relXml);
  const relationships = toArray(
    (relParsed as Record<string, unknown>)?.Relationships
      ? ((relParsed as Record<string, Record<string, unknown>>).Relationships.Relationship as unknown)
      : undefined,
  );

  const images: { src: string }[] = [];
  for (const rel of relationships) {
    const r = rel as Record<string, string>;
    if (!r["@_Type"]?.includes("/image")) continue;
    const target = r["@_Target"];
    if (!target) continue;

    const imagePath = resolveRelPath("ppt/slides/", target);
    const imageFile = zip.file(imagePath);
    if (!imageFile) continue;

    const data = await imageFile.async("base64");
    const ext = imagePath.split(".").pop()?.toLowerCase() ?? "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "gif"
          ? "image/gif"
          : ext === "svg"
            ? "image/svg+xml"
            : "image/png";

    images.push({ src: `data:${mime};base64,${data}` });
  }

  return images;
}

function resolveRelPath(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (base + target).split("/");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  return resolved.join("/");
}

function toArray(val: unknown): unknown[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
