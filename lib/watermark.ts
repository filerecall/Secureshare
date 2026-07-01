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
    const fontSize = Math.min(24, Math.max(12, width / 28));
    const textWidth = helvetica.widthOfTextAtSize(stamp, fontSize);

    const colGap = textWidth * 0.55;
    const cols = Math.ceil(width / colGap) + 2;
    const rowGap = fontSize * 5.5;
    const rows = Math.ceil(height / rowGap) + 3;

    for (let r = -2; r < rows; r++) {
      for (let c = -2; c < cols; c++) {
        const x = c * colGap + (r % 2 === 0 ? 0 : colGap * 0.35);
        const y = r * rowGap;

        page.drawText(stamp, {
          x,
          y,
          size: fontSize,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.28),
          rotate: degrees(-35),
          opacity: 0.28,
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
