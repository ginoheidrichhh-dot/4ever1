const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendInvitation({ to, studentName, instructorName, token }) {
  const portalUrl = process.env.PORTAL_URL || 'https://meine.fahrschulo.com';
  const activationLink = `${portalUrl}/activate?token=${token}`;

  let html = fs.readFileSync(path.join(__dirname, 'templates', 'invitation.html'), 'utf-8');
  html = html
    .replace(/{{STUDENT_NAME}}/g, studentName)
    .replace(/{{INSTRUCTOR_NAME}}/g, instructorName)
    .replace(/{{ACTIVATION_LINK}}/g, activationLink)
    .replace(/{{PORTAL_URL}}/g, portalUrl);

  const info = await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'noreply@fahrschulo.com',
    to,
    subject: `Einladung zum Fahrschüler-Portal - ${instructorName}`,
    html,
    text: `Hallo ${studentName},\n\n${instructorName} hat dich zum Fahrschüler-Portal eingeladen.\n\nAktiviere dein Portal hier: ${activationLink}\n\nBei der Aktivierung legst du eine 4-6 stellige PIN fest.\n\nViel Erfolg bei der Fahrausbildung!\nDein Fahrschulo-Team`,
  });

  console.log('Einladung gesendet an:', to, 'Message ID:', info.messageId);
  return info;
}

module.exports = { sendInvitation };
