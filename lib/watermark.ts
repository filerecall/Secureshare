import "server-only";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

interface WatermarkOptions {
  recipientEmail: string;
  /** ISO timestamp of the access event. */
  accessedAt: string;
}

/**
 * Apply a diagonal watermark to every page of a PDF buffer. Returns a new
 * Uint8Array. Non-PDF inputs should not be passed here; the caller should
 * pass them through unmodified.
 */
export async function watermarkPdf(input: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
  const helvetica = await pdf.embedFont(StandardFonts.Helvetica);

  const stamp = `SecureShare · ${opts.recipientEmail} · ${formatTimestamp(opts.accessedAt)}`;

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    // Diagonal centred text. Size scales with page width so it reads on A4
    // and US Letter without looking giant on small thumbnails.
    const fontSize = Math.min(28, Math.max(14, width / 28));
    const textWidth = helvetica.widthOfTextAtSize(stamp, fontSize);

    page.drawText(stamp, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font: helvetica,
      color: rgb(0.5, 0.55, 0.65),
      rotate: degrees(-30),
      opacity: 0.22,
    });
  }

  return pdf.save();
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}
