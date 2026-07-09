import nodemailer from "nodemailer";

const FROM = process.env.SMTP_FROM || "MetroGo <noreply@metrogo.app>";
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function wrap(body: string): string {
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f5f7fa;border-radius:12px;overflow:hidden">
    <div style="background:#0b1320;padding:24px 32px">
      <p style="color:#FFC83D;font-size:12px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;margin:0">MetroGo</p>
    </div>
    <div style="padding:32px">${body}</div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) { console.log(`[email:mock] "${subject}" → ${to}`); return; }
  await t.sendMail({ from: FROM, to, subject, html });
}

// ── Ticket confirmation ──────────────────────────────────────────────────────
export async function sendTicketConfirmationEmail(p: {
  to: string; passengerName: string; fromStation: string;
  toStation: string; fare: number; ticketId: string; expiresAt: string;
}) {
  const url = `${APP_URL}/tickets/${p.ticketId}`;
  await send(p.to, `Your MetroGo ticket: ${p.fromStation} → ${p.toStation}`, wrap(`
    <p style="color:#0b1320;font-size:15px">Hi ${p.passengerName},</p>
    <div style="background:#eef1f6;border-radius:8px;padding:20px;margin:16px 0">
      <p style="margin:0 0 4px;font-size:12px;color:#5b6678;text-transform:uppercase">Journey</p>
      <p style="margin:0;font-size:18px;font-weight:700;color:#0b1320">${p.fromStation} → ${p.toStation}</p>
      <p style="margin:8px 0 0;font-size:24px;font-weight:700;font-family:monospace">₹${p.fare.toFixed(2)}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#5b6678">Expires: ${new Date(p.expiresAt).toLocaleString()}</p>
    </div>
    <a href="${url}" style="display:block;background:#0b1320;color:#FFC83D;text-align:center;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;margin-bottom:12px">View ticket & QR code →</a>
    <p style="color:#8b96a5;font-size:12px">Show the QR code at the gate scanner. Single-use only.</p>
  `));
}

// ── Email verification ───────────────────────────────────────────────────────
export async function sendVerificationEmail(p: { to: string; name: string; verifyUrl: string }) {
  await send(p.to, "Verify your MetroGo email address", wrap(`
    <p style="color:#0b1320;font-size:15px">Hi ${p.name},</p>
    <p style="color:#5b6678;font-size:14px">Click the button below to verify your email. This link expires in 24 hours.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${p.verifyUrl}" style="background:#0b1320;color:#FFC83D;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">Verify email address</a>
    </div>
    <p style="color:#8b96a5;font-size:12px">If you didn't create a MetroGo account, ignore this email.</p>
  `));
}

// ── Password reset ───────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(p: { to: string; name: string; resetUrl: string }) {
  await send(p.to, "Reset your MetroGo password", wrap(`
    <p style="color:#0b1320;font-size:15px">Hi ${p.name},</p>
    <p style="color:#5b6678;font-size:14px">Someone requested a password reset. This link expires in 1 hour.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${p.resetUrl}" style="background:#0b1320;color:#FFC83D;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">Reset password</a>
    </div>
    <p style="color:#8b96a5;font-size:12px">If you didn't request this, ignore this email — your password won't change.</p>
  `));
}

// ── Streak reminder ──────────────────────────────────────────────────────────
export async function sendStreakReminderEmail(to: string, name: string, streak: number) {
  await send(to, `Don't break your ${streak}-day streak! 🔥`, wrap(`
    <p style="color:#0b1320;font-size:15px">Hi ${name},</p>
    <p style="color:#5b6678;font-size:14px">You have a <strong>${streak}-day booking streak</strong> — but you haven't booked today yet. Book before midnight to keep it going!</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${APP_URL}" style="background:#FFC83D;color:#0b1320;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">Book a ticket now →</a>
    </div>
  `));
}

// ── Pass expiry reminder ─────────────────────────────────────────────────────
export async function sendPassExpiryEmail(to: string, name: string, passType: string, expiresAt: Date) {
  await send(to, `Your MetroGo ${passType} Pass expires soon`, wrap(`
    <p style="color:#0b1320;font-size:15px">Hi ${name},</p>
    <p style="color:#5b6678;font-size:14px">Your <strong>${passType} Pass</strong> expires on <strong>${expiresAt.toLocaleDateString()}</strong>. Renew it now to keep travelling without interruption.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${APP_URL}/passes" style="background:#0b1320;color:#FFC83D;padding:14px 32px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block">Renew pass →</a>
    </div>
  `));
}
