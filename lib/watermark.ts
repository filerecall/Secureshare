import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

interface WatermarkOptions {
  recipientEmail: string;
  accessedAt: string;
}

export async function watermarkPdf(input: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  const stamp = `FileRecall | ${opts.recipientEmail} | ${formatTimestamp(opts.accessedAt)}`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const fontSize = Math.min(22, Math.max(12, width / 32));
    const textWidth = helvetica.widthOfTextAtSize(stamp, fontSize);

    const cols = Math.ceil(width / (textWidth * 0.8)) + 1;
    const rowGap = fontSize * 7;
    const rows = Math.ceil(height / rowGap) + 2;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * textWidth * 0.75 + (r % 2 === 0 ? 0 : textWidth * 0.35);
        const y = r * rowGap;

        page.drawText(stamp, {
          x,
          y,
          size: fontSize,
          font: helvetica,
          color: rgb(0.35, 0.38, 0.45),
          rotate: degrees(-35),
          opacity: 0.32,
        });
      }
    }
  }

  return pdf.save();
}

export async function getPageCount(input: Uint8Array): Promise<number> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  return pdf.getPageCount();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
