const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

async function sendOtpEmail(toEmail, otp, subjectName) {
  const transporter = createTransporter();
  const ttlMinutes = process.env.OTP_TTL_MINUTES || 3;

  await transporter.sendMail({
    from: `"QR Attendance System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Your Attendance OTP for ${subjectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">Attendance Verification</h2>
        <p style="color: #374151; margin-bottom: 4px;">Your one-time password for <strong>${subjectName}</strong>:</p>
        <div style="font-size: 40px; font-weight: bold; letter-spacing: 8px; color: #111827; padding: 16px 0; text-align: center;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">This OTP expires in <strong>${ttlMinutes} minutes</strong>. Do not share it with anyone.</p>
        <hr style="border-color: #e5e7eb; margin: 16px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">If you did not request this OTP, you can safely ignore this email.</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
