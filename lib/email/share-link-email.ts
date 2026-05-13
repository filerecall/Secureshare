import "server-only";
import { getResend } from "@/lib/email/client";
import { env } from "@/lib/env";

interface SendShareLinkEmailOptions {
  recipientEmail: string;
  senderEmail: string;
  documentName: string;
  shareUrl: string;
  expiryDescription: string;
}

/**
 * Send a recipient-notification email when a share link is created.
 * Failure is logged but never thrown - email is a nice-to-have, the link
 * itself is the source of truth and the sender can still copy/paste it.
 */
export async function sendShareLinkEmail(opts: SendShareLinkEmailOptions): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: env.resendFromEmail(),
      to: opts.recipientEmail,
      subject: `${opts.senderEmail} shared a document with you on SecureShare`,
      html: renderShareLinkHtml(opts),
      text: renderShareLinkText(opts),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send share-link email", { recipient: opts.recipientEmail, err });
  }
}

function renderShareLinkHtml({
  senderEmail,
  documentName,
  shareUrl,
  expiryDescription,
}: SendShareLinkEmailOptions): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0;color:#64748b;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">SecureShare</p>
              <h1 style="margin:16px 0 0;color:#0f172a;font-size:20px;line-height:1.4;font-weight:600;">
                ${escapeHtml(senderEmail)} shared a document with you
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;color:#0f172a;font-size:14px;font-weight:500;word-break:break-word;">
                  ${escapeHtml(documentName)}
                </p>
                <p style="margin:6px 0 0;color:#64748b;font-size:12px;">
                  ${escapeHtml(expiryDescription)}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <a href="${shareUrl}" style="display:inline-block;background:#0f172a;color:white;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:500;">
                Open document
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 32px;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                The link is tokenised and only works for the recipient address above. If you weren't expecting this, you can safely ignore the email.
              </p>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px;">
                SecureShare · AES-256 encrypted at rest · TLS 1.3 in transit
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderShareLinkText({
  senderEmail,
  documentName,
  shareUrl,
  expiryDescription,
}: SendShareLinkEmailOptions): string {
  return [
    `${senderEmail} shared a document with you on SecureShare.`,
    "",
    `Document: ${documentName}`,
    expiryDescription,
    "",
    `Open: ${shareUrl}`,
    "",
    "The link is tokenised and only works for the recipient address above.",
  ].join("\n");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
