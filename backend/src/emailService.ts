import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { COMPANY_NAME } from './config';

dotenv.config();

const smtpPort = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    // Gmail: secure true for 465 (SSL), false for ports like 587 (STARTTLS)
    secure: smtpPort === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});
export const sendAgreementEmail = async (
    to: string,
    agentEmail: string,
    agentName: string,
    clientName: string,
    title: string,
    linkUrl: string
) => {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP credentials not configured (SMTP_USER / SMTP_PASS missing)');
    }

    const subject = `${COMPANY_NAME} Agreement: ${title}`;
    const html = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #004e7c;">Agreement Ready for Signature</h2>
      <p>Dear ${clientName},</p>
      <p><strong>${COMPANY_NAME}</strong> has prepared the agreement <strong>"${title}"</strong> for your review and signature.</p>
      <p>This agreement is between <strong>${COMPANY_NAME}</strong> (Service Provider) and you (Client).</p>
      <p>Please click the secure link below to review and sign the document:</p>
      <p>
        <a href="${linkUrl}" style="display:inline-block;padding:10px 16px;background:#facc15;color:#000;text-decoration:none;border-radius:4px;font-weight:bold;">
          Open Secure Document
        </a>
      </p>
      <p style="font-size: 12px; color: #777; margin-top: 16px;">
        If the button does not work, copy and paste this URL into your browser:<br/>
        <a href="${linkUrl}">${linkUrl}</a>
      </p>
      <br/>
      <p><strong>Created Date:</strong> ${new Date().toLocaleDateString()}</p>
      <br/>
      <hr/>
      <p style="font-size: 12px; color: #777;">
        ${COMPANY_NAME}<br/>
        Authorized Representative: ${agentName} (${agentEmail})
      </p>
    </div>
  `;

    const info = await transporter.sendMail({
        from: `"${COMPANY_NAME}" <${process.env.SMTP_USER}>`,
        replyTo: agentEmail,
        to,
        cc: agentEmail,
        subject,
        html,
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
};
