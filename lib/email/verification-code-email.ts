import "server-only";
import { getResend } from "@/lib/email/client";
import { env } from "@/lib/env";

interface SendVerificationCodeOptions {
  recipientEmail: string;
  documentName: string;
  code: string;
  /** Minutes the code stays valid, for the copy. */
  expiresInMinutes: number;
}

export interface SendVerificationCodeResult {
  sent: boolean;
  error?: string;
}

/**
 * Email a one-time code to the address a share link was issued to.
 *
 * Same structured-result contract as the other senders in this folder: the
 * Resend SDK returns { data, error } rather than throwing, so a missed check
 * silently drops the mail.
 */
export async function sendVerificationCodeEmail(
  opts: SendVerificationCodeOptions,
): Promise<SendVerificationCodeResult> {
  let resend;
  try {
    resend = getResend();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Resend not configured";
    // eslint-disable-next-line no-console
    console.error("Resend client init failed", err);
    return { sent: false, error: msg };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.resendFromEmail(),
      to: opts.recipientEmail,
      subject: `${opts.code} is your FileRecall access code`,
      html: renderHtml(opts),
      text: renderText(opts),
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("Resend rejected the verification code send", {
        recipient: opts.recipientEmail,
        error,
      });
      return { sent: false, error: error.message ?? "Email could not be sent." };
    }
    if (!data?.id) return { sent: false, error: "Resend returned no message id" };
    return { sent: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send verification code email", err);
    return { sent: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}

function renderHtml({ documentName, code, expiresInMinutes }: SendVerificationCodeOptions): string {
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
                Your access code
              </h1>
              <p style="margin:10px 0 0;color:#475569;font-size:14px;line-height:1.6;">
                Enter this code to open <strong>${escapeHtml(documentName)}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 4px;">
              <div style="background:#0f172a;border-radius:10px;padding:18px 16px;text-align:center;">
                <span style="color:#ffffff;font-size:32px;letter-spacing:0.32em;font-weight:600;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;">
                  ${escapeHtml(code)}
                </span>
              </div>
              <p style="margin:12px 0 0;color:#64748b;font-size:12px;text-align:center;">
                Expires in ${expiresInMinutes} minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 32px;">
              <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6;">
                If you didn't try to open this document, someone may have your link. Ignore this
                email and the code expires on its own - the document stays closed.
              </p>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:14px;">
                FileRecall · never share this code with anyone
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

function renderText({ documentName, code, expiresInMinutes }: SendVerificationCodeOptions): string {
  return [
    `Your FileRecall access code is ${code}`,
    "",
    `Enter it to open: ${documentName}`,
    `The code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you didn't try to open this document, ignore this email. Never share this code.",
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
