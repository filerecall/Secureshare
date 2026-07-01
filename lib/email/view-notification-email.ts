import "server-only";
import { getResend } from "@/lib/email/client";
import { env } from "@/lib/env";

interface SendViewNotificationOptions {
  senderEmail: string;
  recipientEmail: string;
  documentName: string;
  viewedAt: string;
}

export interface SendViewNotificationResult {
  sent: boolean;
  error?: string;
}

export async function sendViewNotificationEmail(
  opts: SendViewNotificationOptions,
): Promise<SendViewNotificationResult> {
  let resend;
  try {
    resend = getResend();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Resend not configured";
    // eslint-disable-next-line no-console
    console.error("Resend client init failed (view notification)", err);
    return { sent: false, error: msg };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.resendFromEmail(),
      to: opts.senderEmail,
      subject: "Your document was viewed on FileRecall",
      html: renderHtml(opts),
      text: renderText(opts),
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Resend rejected view notification", {
        sender: opts.senderEmail,
        from: env.resendFromEmail(),
        error,
      });
      return { sent: false, error: error.message ?? "Email could not be sent." };
    }

    if (!data?.id) {
      return { sent: false, error: "Resend returned no message id" };
    }
    return { sent: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send view notification email", { sender: opts.senderEmail, err });
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}

function renderHtml({
  recipientEmail,
  documentName,
  viewedAt,
}: SendViewNotificationOptions): string {
  const formattedTime = new Date(viewedAt).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="padding:32px 28px 8px;">
              <p style="margin:0;color:#64748b;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">FileRecall</p>
              <h1 style="margin:16px 0 0;color:#0f172a;font-size:20px;line-height:1.4;font-weight:600;">
                Your document was viewed
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;">
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
                <p style="margin:0;color:#0f172a;font-size:14px;font-weight:500;word-break:break-word;">
                  ${escapeHtml(documentName)}
                </p>
                <p style="margin:8px 0 0;color:#64748b;font-size:12px;">
                  Viewed by <strong style="color:#0f172a;">${escapeHtml(recipientEmail)}</strong>
                </p>
                <p style="margin:4px 0 0;color:#64748b;font-size:12px;">
                  ${escapeHtml(formattedTime)}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 32px;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                The document was watermarked with the viewer's identity and a unique session timestamp.
              </p>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px;">
                FileRecall · Secure document delivery
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

function renderText({
  recipientEmail,
  documentName,
  viewedAt,
}: SendViewNotificationOptions): string {
  return [
    "Your document was viewed on FileRecall.",
    "",
    `Document: ${documentName}`,
    `Viewed by: ${recipientEmail}`,
    `Time: ${viewedAt}`,
    "",
    "The document was watermarked with the viewer's identity and a unique session timestamp.",
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
