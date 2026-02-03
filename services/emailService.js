/**
 * Email via nodemailer (SMTP).
 * Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_PORT, SMTP_FROM) to enable.
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  try {
    const nodemailer = require("nodemailer");
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
    return transporter;
  } catch (err) {
    console.warn("Email service: transporter init failed", err.message);
    return null;
  }
}

/**
 * Send enrollment notification to academy email.
 * @param {string} to - academy email
 * @param {object} applicant - { fullName, phone, email, idNumber }
 * @param {string} voucherLink - URL or path description for voucher
 * @param {string[]} attachments - optional [{ filename, content }] for voucher
 * @returns {Promise<boolean>} - true if sent
 */
async function sendEnrollmentNotification(
  to,
  applicant,
  voucherLink,
  attachments = []
) {
  const trans = getTransporter();
  if (!trans) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const text = [
    `New enrollment request`,
    ``,
    `Applicant: ${applicant.fullName}`,
    `Email: ${applicant.email}`,
    `Phone: ${applicant.phone}`,
    `ID: ${applicant.idNumber}`,
    ``,
    `Voucher: ${voucherLink}`,
  ].join("\n");
  const html = `
    <h2>New enrollment request</h2>
    <p><strong>Applicant:</strong> ${applicant.fullName}</p>
    <p><strong>Email:</strong> ${applicant.email}</p>
    <p><strong>Phone:</strong> ${applicant.phone}</p>
    <p><strong>ID:</strong> ${applicant.idNumber}</p>
    <p><strong>Voucher:</strong> <a href="${voucherLink}">${voucherLink}</a></p>
  `;
  try {
    await trans.sendMail({
      from,
      to,
      subject: "New enrollment – " + applicant.fullName,
      text,
      html,
      attachments: attachments.length ? attachments : undefined,
    });
    return true;
  } catch (err) {
    console.warn("Email send failed:", err.message);
    return false;
  }
}

/**
 * Notify dancer of enrollment decision (approval or rejection).
 * @param {string} to - dancer email
 * @param {string} academyName - academy name
 * @param {boolean} approved - true = approved, false = rejected
 * @returns {Promise<boolean>}
 */
async function sendEnrollmentDecisionToDancer(to, academyName, approved) {
  const trans = getTransporter();
  if (!trans) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = approved
    ? `Enrollment approved – ${academyName}`
    : `Enrollment not approved – ${academyName}`;
  const text = approved
    ? `Your enrollment at ${academyName} has been approved.`
    : `Your enrollment at ${academyName} was not approved. Contact the academy for more information.`;
  const html = approved
    ? `<p>Your enrollment at <strong>${academyName}</strong> has been approved.</p>`
    : `<p>Your enrollment at <strong>${academyName}</strong> was not approved. Contact the academy for more information.</p>`;
  try {
    await trans.sendMail({ from, to, subject, text, html });
    return true;
  } catch (err) {
    console.warn("Email send failed:", err.message);
    return false;
  }
}

module.exports = {
  sendEnrollmentNotification,
  sendEnrollmentDecisionToDancer,
  getTransporter,
};
