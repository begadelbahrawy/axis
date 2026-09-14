// Pluggable email sender. Swap sendEmail's body for a real provider (SMTP, SES, Resend, ...)
// via env vars; defaults to logging so the app is usable out of the box in dev/self-host.

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[mailer] To: ${to}\nSubject: ${subject}\n${body}\n`);
}
