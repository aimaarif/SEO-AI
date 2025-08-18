import nodemailer from "nodemailer";

interface SendArticleEmailParams {
  to: string;
  subject: string;
  html: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    throw new Error("SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  });

  return transporter;
}

export async function sendArticleEmail({ to, subject, html }: SendArticleEmailParams): Promise<void> {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER || "no-reply@example.com";

  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}


