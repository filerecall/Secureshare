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
    const fontSize = Math.min(18, Math.max(10, width / 40));
    const textWidth = helvetica.widthOfTextAtSize(stamp, fontSize);

    const cols = Math.ceil(width / (textWidth * 0.7)) + 1;
    const rowGap = fontSize * 6;
    const rows = Math.ceil(height / rowGap) + 2;

    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * textWidth * 0.65 + (r % 2 === 0 ? 0 : textWidth * 0.3);
        const y = r * rowGap;

        page.drawText(stamp, {
          x,
          y,
          size: fontSize,
          font: helvetica,
          color: rgb(0.45, 0.48, 0.55),
          rotate: degrees(-35),
          opacity: 0.18,
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
