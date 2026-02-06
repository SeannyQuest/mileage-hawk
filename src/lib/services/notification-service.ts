// ==========================================
// Notification Service
// Dispatches alerts via Email (Resend), SMS (Twilio), Push
// ==========================================

import { Resend } from "resend";
import { formatPoints, formatPointsShort } from "../amex-partners";
import { CABIN_CLASS_LABELS } from "../constants";
import type { AlertNotification } from "../types";

// ── Email via Resend ──

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendEmailAlert(notification: AlertNotification): Promise<boolean> {
  try {
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || "alerts@mileagehawk.app";
    const cabinLabel = CABIN_CLASS_LABELS[notification.cabinClass] || notification.cabinClass;

    const { error } = await resend.emails.send({
      from: `MileageHawk <${fromEmail}>`,
      to: notification.userEmail,
      subject: `Price Drop: ${notification.origin}-${notification.destination} ${cabinLabel} — ${formatPointsShort(notification.amexPointsEquivalent)} pts`,
      html: buildEmailHtml(notification),
    });

    if (error) {
      console.error("[Notify] Email send error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Notify] Email error:", error);
    return false;
  }
}

function buildEmailHtml(n: AlertNotification): string {
  const cabinLabel = CABIN_CLASS_LABELS[n.cabinClass] || n.cabinClass;
  const bookingCta = n.bookingUrl
    ? `<a href="${n.bookingUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:16px;">Book Now</a>`
    : "";

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:24px;margin:0;color:#0f172a;">MileageHawk Alert</h1>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:16px;">
        <div style="font-size:14px;color:#64748b;margin-bottom:4px;">${cabinLabel}</div>
        <div style="font-size:28px;font-weight:700;color:#0f172a;margin-bottom:8px;">
          ${n.originCity} (${n.origin}) → ${n.destinationCity} (${n.destination})
        </div>
        <div style="font-size:16px;color:#475569;">via ${n.airlineName} (${n.loyaltyProgram})</div>
      </div>

      <div style="display:flex;gap:16px;margin-bottom:16px;">
        <div style="flex:1;background:#ecfdf5;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#059669;font-weight:600;">CURRENT PRICE</div>
          <div style="font-size:24px;font-weight:700;color:#047857;">${formatPoints(n.amexPointsEquivalent)} pts</div>
          <div style="font-size:12px;color:#6b7280;">${formatPoints(n.mileageCost)} ${n.loyaltyProgram} miles</div>
        </div>
        <div style="flex:1;background:#fef3c7;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:12px;color:#d97706;font-weight:600;">YOUR THRESHOLD</div>
          <div style="font-size:24px;font-weight:700;color:#b45309;">${formatPoints(n.thresholdPoints)} pts</div>
        </div>
      </div>

      <div style="font-size:14px;color:#64748b;margin-bottom:8px;">
        Travel date: ${n.travelDate}
      </div>

      <div style="text-align:center;">
        ${bookingCta}
      </div>

      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/alerts" style="color:#64748b;">Manage Alerts</a> &middot;
        Prices are estimates — always verify on the airline site before booking.
      </div>
    </div>
  `;
}

// ── SMS via Twilio ──

export async function sendSmsAlert(notification: AlertNotification): Promise<boolean> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error("[Notify] Twilio credentials not configured");
      return false;
    }

    if (!notification.userPhone) {
      console.warn("[Notify] No phone number for user, skipping SMS");
      return false;
    }

    // Check quiet hours
    // TODO: Implement timezone-aware quiet hours check

    const cabinLabel = CABIN_CLASS_LABELS[notification.cabinClass] || notification.cabinClass;
    const message =
      `MileageHawk: ${notification.origin}-${notification.destination} ${cabinLabel} ` +
      `on ${notification.airlineName} dropped to ${formatPointsShort(notification.amexPointsEquivalent)} pts ` +
      `(${formatPointsShort(notification.mileageCost)} miles). ` +
      (notification.bookingUrl ? `Book: ${notification.bookingUrl}` : "");

    // Dynamic import to avoid loading Twilio in builds where it's unused
    const twilio = await import("twilio");
    const client = twilio.default(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: notification.userPhone,
    });

    return true;
  } catch (error) {
    console.error("[Notify] SMS error:", error);
    return false;
  }
}

// ── Dispatch ──

export async function sendNotification(notification: AlertNotification): Promise<boolean> {
  switch (notification.channel) {
    case "EMAIL":
      return sendEmailAlert(notification);
    case "SMS":
      return sendSmsAlert(notification);
    case "PUSH":
      // TODO: Implement web push notifications
      console.log("[Notify] Push notifications not yet implemented");
      return false;
    default:
      console.error(`[Notify] Unknown channel: ${notification.channel}`);
      return false;
  }
}
