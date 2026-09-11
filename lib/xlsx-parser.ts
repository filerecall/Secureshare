import "server-only";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

/**
 * Minimal XLSX reader.
 *
 * Built on the same two libraries as the PowerPoint parser rather than pulling
 * in a spreadsheet SDK: an .xlsx is a zip of XML, and we only need values, not
 * formulas, charts or styling. Everything the recipient sees is rendered as an
 * HTML table, so no spreadsheet file ever reaches their machine.
 *
 * Deliberate limits: cached values are shown rather than formulas (that's what
 * the file stores anyway), and very large sheets are truncated so one huge
 * workbook can't blow up the response.
 */

export interface XlsxSheet {
  name: string;
  /** Row-major cell text. Ragged rows are padded to the widest row. */
  rows: string[][];
  /** True when the sheet had more rows or columns than we render. */
  truncated: boolean;
  totalRows: number;
}

export const MAX_ROWS_PER_SHEET = 500;
export const MAX_COLS_PER_SHEET = 40;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Keep everything as text: Excel stores numbers as strings and we do our own
  // formatting. Letting the parser coerce would lose precision on long ids.
  parseTagValue: false,
  parseAttributeValue: false,
  // Required for numeric character references. Office writes any non-ASCII
  // character as &#233; rather than the character itself, and without this
  // "café" reaches the recipient as "caf&#233;".
  htmlEntities: true,
});

export async function parseXlsx(buffer: Buffer): Promise<XlsxSheet[]> {
  const zip = await JSZip.loadAsync(buffer);

  const sharedStrings = await readSharedStrings(zip);
  const dateStyles = await readDateStyles(zip);
  const sheetOrder = await readSheetOrder(zip);

  const sheets: XlsxSheet[] = [];

  for (const { name, path } of sheetOrder) {
    const file = zip.file(path);
    if (!file) continue;

    const xml = await file.async("text");
    const parsed = parser.parse(xml);
    sheets.push(readSheet(name, parsed, sharedStrings, dateStyles));
  }

  return sheets;
}

// ──────────────────────────────────────────────────────────────────
// Workbook structure
// ──────────────────────────────────────────────────────────────────

/**
 * Sheet order and names live in workbook.xml, but the FILE each one maps to
 * lives in the rels. Reading only the worksheets folder would give us the
 * wrong order and no names.
 */
async function readSheetOrder(zip: JSZip): Promise<{ name: string; path: string }[]> {
  const workbookFile = zip.file("xl/workbook.xml");
  if (!workbookFile) return [];

  const workbook = parser.parse(await workbookFile.async("text"));
  const sheetNodes = toArray(workbook?.workbook?.sheets?.sheet);

  const rels = await readRelationships(zip, "xl/_rels/workbook.xml.rels");

  const out: { name: string; path: string }[] = [];
  for (const node of sheetNodes) {
    const sheet = node as Record<string, string>;
    const name = sheet["@_name"] ?? `Sheet${out.length + 1}`;
    const rid = sheet["@_r:id"] ?? sheet["@_id"];
    const target = rid ? rels[rid] : undefined;

    const path = target
      ? target.startsWith("/")
        ? target.slice(1)
        : `xl/${target.replace(/^\.\//, "")}`
      : `xl/worksheets/sheet${out.length + 1}.xml`;

    out.push({ name, path });
  }

  return out;
}

async function readRelationships(zip: JSZip, path: string): Promise<Record<string, string>> {
  const file = zip.file(path);
  if (!file) return {};

  const parsed = parser.parse(await file.async("text"));
  const map: Record<string, string> = {};

  for (const node of toArray(parsed?.Relationships?.Relationship)) {
    const rel = node as Record<string, string>;
    if (rel["@_Id"] && rel["@_Target"]) map[rel["@_Id"]] = rel["@_Target"];
  }

  return map;
}

/** sharedStrings.xml holds every repeated string once; cells reference it by index. */
async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];

  const parsed = parser.parse(await file.async("text"));
  return toArray(parsed?.sst?.si).map((si) => extractText(si));
}

/**
 * A date in Excel is just a number wearing a date format, so the only way to
 * know "45000" means a date is to follow the cell's style to its number format.
 */
async function readDateStyles(zip: JSZip): Promise<Set<number>> {
  const dateStyleIndexes = new Set<number>();

  const file = zip.file("xl/styles.xml");
  if (!file) return dateStyleIndexes;

  const parsed = parser.parse(await file.async("text"));

  // Custom formats declare themselves; anything with d/m/y or h:mm is a date.
  const customDateFormats = new Set<number>();
  for (const node of toArray(parsed?.styleSheet?.numFmts?.numFmt)) {
    const fmt = node as Record<string, string>;
    const id = Number(fmt["@_numFmtId"]);
    const code = fmt["@_formatCode"] ?? "";
    if (Number.isFinite(id) && /[dmyhs]/i.test(code.replace(/\[[^\]]*\]|"[^"]*"/g, ""))) {
      customDateFormats.add(id);
    }
  }

  // 14-22 and 45-47 are Excel's built-in date and time formats.
  const isBuiltInDate = (id: number) => (id >= 14 && id <= 22) || (id >= 45 && id <= 47);

  const xfs = toArray(parsed?.styleSheet?.cellXfs?.xf);
  xfs.forEach((node, index) => {
    const xf = node as Record<string, string>;
    const numFmtId = Number(xf["@_numFmtId"] ?? 0);
    if (isBuiltInDate(numFmtId) || customDateFormats.has(numFmtId)) {
      dateStyleIndexes.add(index);
    }
  });

  return dateStyleIndexes;
}

// ──────────────────────────────────────────────────────────────────
// Sheet contents
// ──────────────────────────────────────────────────────────────────

function readSheet(
  name: string,
  parsed: Record<string, unknown>,
  sharedStrings: string[],
  dateStyles: Set<number>,
): XlsxSheet {
  const sheetData = (parsed?.worksheet as Record<string, unknown> | undefined)?.sheetData;
  const rowNodes = toArray((sheetData as Record<string, unknown> | undefined)?.row);

  const rows: string[][] = [];
  let widest = 0;
  let truncated = false;

  for (const rowNode of rowNodes) {
    if (rows.length >= MAX_ROWS_PER_SHEET) {
      truncated = true;
      break;
    }

    const row = rowNode as Record<string, unknown>;
    const cells = toArray(row.c);
    const values: string[] = [];

    for (const cellNode of cells) {
      const cell = cellNode as Record<string, unknown>;
      const ref = cell["@_r"] as string | undefined;
      const columnIndex = ref ? columnIndexFromRef(ref) : values.length;

      if (columnIndex >= MAX_COLS_PER_SHEET) {
        truncated = true;
        continue;
      }

      // Pad the gaps: Excel omits empty cells entirely, so column position
      // comes from the reference, not from how many cells we've seen.
      while (values.length < columnIndex) values.push("");
      values[columnIndex] = formatCell(cell, sharedStrings, dateStyles);
    }

    widest = Math.max(widest, values.length);
    rows.push(values);
  }

  // Square the grid off so the table renders without ragged edges.
  for (const row of rows) {
    while (row.length < widest) row.push("");
  }

  return { name, rows, truncated, totalRows: rowNodes.length };
}

function formatCell(
  cell: Record<string, unknown>,
  sharedStrings: string[],
  dateStyles: Set<number>,
): string {
  const type = cell["@_t"] as string | undefined;

  // Inline strings carry their text instead of pointing at the shared table.
  if (type === "inlineStr") return extractText(cell.is);

  const raw = extractText(cell.v);
  if (raw === "") return "";

  if (type === "s") {
    const index = Number(raw);
    return Number.isFinite(index) ? (sharedStrings[index] ?? "") : "";
  }
  if (type === "str" || type === "e") return raw;
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";

  const styleIndex = Number(cell["@_s"] ?? NaN);
  if (Number.isFinite(styleIndex) && dateStyles.has(styleIndex)) {
    const asDate = excelSerialToDate(Number(raw));
    if (asDate) return asDate;
  }

  return trimNumber(raw);
}

/** "BC12" -> 54. Letters are the column, digits are the row. */
function columnIndexFromRef(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

/**
 * Excel counts days from 1900-01-00 and wrongly treats 1900 as a leap year,
 * so serials above 59 are one day ahead of reality. 25569 is the offset to
 * the Unix epoch once that's accounted for.
 */
function excelSerialToDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) return null;

  const adjusted = serial < 60 ? serial + 1 : serial;
  const ms = Math.round((adjusted - 25569) * 86400 * 1000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;

  const iso = date.toISOString();
  const hasTime = Math.abs(serial % 1) > 1e-9;
  return hasTime ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : iso.slice(0, 10);
}

/** Floating point noise: 0.30000000000000004 -> 0.3. */
function trimNumber(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(12)));
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function toArray(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Pull the text out of a node, following rich-text runs when present. */
function extractText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);

  if (Array.isArray(node)) return node.map(extractText).join("");

  const obj = node as Record<string, unknown>;
  if (obj["#text"] !== undefined) return String(obj["#text"]);
  if (obj.t !== undefined) return extractText(obj.t);
  if (obj.r !== undefined) return extractText(obj.r);

  return "";
}
