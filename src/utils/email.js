import nodemailer from "nodemailer";

const DEFAULT_FROM = "Bento-do <no-reply@bento-do.local>";
const BRAND_GREEN = "#16a34a";
const BRAND_GREEN_DARK = "#166534";
const BRAND_TEXT = "#17211b";
const BRAND_MUTED = "#5f6f66";
const BRAND_BG = "#f4f8f5";
const CARD_BORDER = "#dce9df";

let transporter = null;

const getBooleanEnv = (key, fallback = false) => {
  const value = process.env[key];

  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

const getNumberEnv = (key, fallback) => {
  const value = Number(process.env[key]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const isSmtpConfigured = () => {
  return Boolean(process.env.EMAIL_HOST || process.env.SMTP_HOST);
};

const shouldLogEmailInDev = () => {
  const defaultValue = process.env.NODE_ENV !== "production";

  return getBooleanEnv("EMAIL_DEV_LOG", defaultValue);
};

const getEmailFrom = () => {
  return (
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_USER ||
    process.env.SMTP_USER ||
    DEFAULT_FROM
  );
};

const escapeHtml = (value) => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getFrontendUrl = () => {
  const clientOrigin = (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_ORIGINS ||
    "http://localhost:5173"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)[0];

  return clientOrigin || "http://localhost:5173";
};

const formatJakartaDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date)} WIB`;
};

const buildButton = ({ href, label }) => {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 26px 0;">
      <tr>
        <td bgcolor="${BRAND_GREEN}" style="border-radius: 8px;">
          <a href="${safeHref}" style="display: inline-block; padding: 13px 22px; color: #ffffff; font-family: Arial, sans-serif; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
};

const buildInfoRow = (label, value) => {
  if (!value) {
    return "";
  }

  return `
    <tr>
      <td style="padding: 12px 0; color: ${BRAND_MUTED}; font-family: Arial, sans-serif; font-size: 13px; border-bottom: 1px solid #e7efe9;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 12px 0 12px 16px; color: ${BRAND_TEXT}; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; text-align: right; border-bottom: 1px solid #e7efe9;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
};

const buildEmailLayout = ({
  preheader,
  eyebrow,
  title,
  bodyHtml,
  footerNote,
}) => {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background: ${BRAND_BG};">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: ${BRAND_BG}; padding: 28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px;">
                <tr>
                  <td style="padding: 0 0 16px 0;">
                    <div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 800; color: ${BRAND_GREEN_DARK}; letter-spacing: 0;">
                      Bento-do
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size: 13px; color: ${BRAND_MUTED}; margin-top: 4px;">
                      Produktivitas yang lebih ringan untuk dikerjakan.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background: #ffffff; border: 1px solid ${CARD_BORDER}; border-radius: 8px; padding: 32px;">
                    <div style="font-family: Arial, sans-serif; font-size: 12px; font-weight: 800; color: ${BRAND_GREEN_DARK}; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px;">
                      ${escapeHtml(eyebrow)}
                    </div>
                    <h1 style="font-family: Arial, sans-serif; font-size: 26px; line-height: 1.25; color: ${BRAND_TEXT}; margin: 0 0 16px 0; font-weight: 800;">
                      ${escapeHtml(title)}
                    </h1>
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 4px 0 4px; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; color: ${BRAND_MUTED};">
                    ${escapeHtml(footerNote)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port: getNumberEnv("EMAIL_PORT", getNumberEnv("SMTP_PORT", 587)),
    secure: getBooleanEnv("EMAIL_SECURE", false),
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Tujuan email wajib diisi.");
  }

  if (!isSmtpConfigured()) {
    if (shouldLogEmailInDev()) {
      console.log("EMAIL DEV LOG:", {
        to,
        subject,
        text,
      });

      return {
        delivered: false,
        dev_logged: true,
      };
    }

    throw new Error("SMTP email belum dikonfigurasi.");
  }

  const info = await getTransporter().sendMail({
    from: getEmailFrom(),
    to,
    subject,
    text,
    html,
  });

  return {
    delivered: true,
    message_id: info.messageId,
  };
};

export const sendPasswordResetEmail = async ({
  to,
  displayName,
  resetUrl,
  expiresMinutes,
}) => {
  const safeName = displayName || "pengguna Bento-do";
  const safeNameHtml = escapeHtml(safeName);
  const resetUrlHtml = escapeHtml(resetUrl);
  const subject = "Reset password Bento-do";
  const text = [
    `Halo ${safeName},`,
    "",
    "Kami menerima permintaan reset password untuk akun Bento-do kamu.",
    `Link reset password berlaku selama ${expiresMinutes} menit:`,
    resetUrl,
    "",
    "Kalau kamu tidak meminta reset password, abaikan email ini.",
  ].join("\n");

  return await sendEmail({
    to,
    subject,
    text,
    html: buildEmailLayout({
      preheader: `Link reset password berlaku selama ${expiresMinutes} menit.`,
      eyebrow: "Keamanan akun",
      title: "Reset password akun kamu",
      bodyHtml: `
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: ${BRAND_TEXT}; margin: 0 0 14px 0;">
          Halo ${safeNameHtml},
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: ${BRAND_TEXT}; margin: 0;">
          Kami menerima permintaan untuk membuat password baru pada akun Bento-do kamu.
          Tekan tombol di bawah ini untuk melanjutkan.
        </p>
        ${buildButton({ href: resetUrl, label: "Reset password" })}
        <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: ${BRAND_MUTED}; margin: 0;">
          Link ini berlaku selama <strong>${expiresMinutes} menit</strong>.
          Kalau tombol tidak bisa dibuka, salin link berikut ke browser:
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: ${BRAND_GREEN_DARK}; word-break: break-all; margin: 12px 0 0 0;">
          ${resetUrlHtml}
        </p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 16px; margin-top: 22px;">
          <p style="font-family: Arial, sans-serif; font-size: 13px; line-height: 1.6; color: ${BRAND_GREEN_DARK}; margin: 0;">
            Jika kamu tidak meminta reset password, abaikan email ini. Password lama kamu tetap aman.
          </p>
        </div>
      `,
      footerNote:
        "Email ini dikirim otomatis oleh Bento-do. Jangan bagikan link reset password kepada siapa pun.",
    }),
  });
};

const getNotificationTitle = (notification) => {
  if (notification.type === "deadline_reminder") {
    return "Deadline tugas mendekat";
  }

  if (notification.type === "energy_critical") {
    return "Energi kamu mulai kritis";
  }

  if (notification.type === "dopamine_rescue") {
    return "Progress kecil yang layak dirayakan";
  }

  return "Pengingat dari Bento-do";
};

export const sendNotificationEmail = async ({
  to,
  displayName,
  notification,
}) => {
  const safeName = displayName || "pengguna Bento-do";
  const safeNameHtml = escapeHtml(safeName);
  const messageHtml = escapeHtml(notification.message);
  const emailTitle = getNotificationTitle(notification);
  const taskLine = notification.task_title
    ? `Tugas: ${notification.task_title}`
    : null;
  const taskTitle = notification.task_title || null;
  const deadlineText = formatJakartaDateTime(notification.task_deadline);
  const appUrl = getFrontendUrl();
  const subject = taskTitle
    ? `Reminder deadline: ${taskTitle}`
    : "Pengingat dari Bento-do";

  const text = [
    `Halo ${safeName},`,
    "",
    notification.message,
    taskLine,
    "",
    "Buka Bento-do untuk melihat detail dan mengatur tugasmu.",
  ]
    .filter(Boolean)
    .join("\n");

  return await sendEmail({
    to,
    subject,
    text,
    html: buildEmailLayout({
      preheader: notification.message,
      eyebrow: "Deadline reminder",
      title: emailTitle,
      bodyHtml: `
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: ${BRAND_TEXT}; margin: 0 0 14px 0;">
          Halo ${safeNameHtml},
        </p>
        <p style="font-family: Arial, sans-serif; font-size: 15px; line-height: 1.7; color: ${BRAND_TEXT}; margin: 0 0 20px 0;">
          ${messageHtml}
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: #f8fbf8; border: 1px solid ${CARD_BORDER}; border-radius: 8px; padding: 6px 18px; margin: 0 0 22px 0;">
          ${buildInfoRow("Tugas", taskTitle)}
          ${buildInfoRow("Deadline", deadlineText)}
          ${buildInfoRow("Status", "Perlu ditinjau")}
        </table>
        <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.7; color: ${BRAND_MUTED}; margin: 0;">
          Ambil satu langkah kecil dulu. Buka Bento-do untuk melihat detail tugas dan lanjutkan dari bagian yang paling ringan.
        </p>
        ${buildButton({ href: appUrl, label: "Buka Bento-do" })}
      `,
      footerNote:
        "Email ini dikirim otomatis karena ada deadline task yang mendekat di akun Bento-do kamu.",
    }),
  });
};
