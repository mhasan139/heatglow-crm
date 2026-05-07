import { createServiceClient } from './supabase';
import { djangoFetch } from './django';

const RESEND_API_URL = 'https://api.resend.com';

// ── Email config (reads from Django settings DB, env-var fallback) ────────────
interface EmailConfig {
  fromAddress: string;
  garethEmail: string;
  resendApiKey: string;
}

let _emailConfigCache: EmailConfig | null = null;
let _emailConfigExpiresAt = 0;

async function getEmailConfig(): Promise<EmailConfig> {
  const now = Date.now();
  if (_emailConfigCache && now < _emailConfigExpiresAt) return _emailConfigCache;

  const defaults: EmailConfig = {
    fromAddress: `${process.env.FROM_NAME ?? 'Gareth at HeatGlow'} <${process.env.FROM_EMAIL ?? 'info@heatglow.co.uk'}>`,
    garethEmail: process.env.GARETH_EMAIL ?? 'gareth@heatglow.co.uk',
    resendApiKey: process.env.RESEND_API_KEY ?? '',
  };

  try {
    const res = await djangoFetch('/api/v1/dashboard/settings/');
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      const fromName    = (data.from_name         as string) || 'Gareth at HeatGlow';
      const fromEmail   = (data.from_email        as string) || 'info@heatglow.co.uk';
      const notifEmail  = (data.notification_email as string) || defaults.garethEmail;
      const resendKey   = (data.resend_api_key    as string) || defaults.resendApiKey;

      _emailConfigCache = {
        fromAddress: `${fromName} <${fromEmail}>`,
        garethEmail: notifEmail,
        resendApiKey: resendKey,
      };
      _emailConfigExpiresAt = now + 5 * 60 * 1000;
      return _emailConfigCache;
    }
  } catch {
    // fall through to defaults
  }

  return defaults;
}

interface ResendSendResponse {
  id: string;
  error?: { name: string; message: string };
}

interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
}

async function resendFetch(
  endpoint: string,
  body: unknown
): Promise<ResendSendResponse> {
  const { resendApiKey } = await getEmailConfig();
  if (!resendApiKey) {
    throw new Error('Resend API key not configured. Add it in Settings → Integrations.');
  }

  const response = await fetch(`${RESEND_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend ${endpoint} failed: ${response.status} — ${text}`);
  }

  return response.json();
}

// ── Core send + log ────────────────────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  type: string,
  entityType?: string,
  entityId?: number
): Promise<string | null> {
  const supabase = createServiceClient();

  try {
    const { fromAddress } = await getEmailConfig();
    const payload: EmailPayload = { from: fromAddress, to, subject, html };
    const result = await resendFetch('/emails', payload);

    await supabase.from('email_log').insert({
      type,
      recipient_email: to,
      subject,
      resend_message_id: result.id,
      status: 'sent',
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    });

    return result.id;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`sendEmail(${type}) to ${to} failed:`, message);

    await supabase.from('email_log').insert({
      type,
      recipient_email: to,
      subject,
      status: 'failed',
      error_message: message,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
    });

    return null;
  }
}

// Batch send for campaigns — returns array of [email, message_id | null]
export async function sendBatch(
  emails: Array<{ to: string; subject: string; html: string }>
): Promise<string[]> {
  const { fromAddress } = await getEmailConfig();
  const batch = emails.map((e) => ({
    from: fromAddress,
    to: e.to,
    subject: e.subject,
    html: e.html,
  }));

  const result = await resendFetch('/emails/batch', batch);
  // Resend returns array on batch endpoint
  if (Array.isArray(result)) {
    return (result as ResendSendResponse[]).map((r) => r.id ?? '');
  }
  return [];
}

// ── Notification helpers ───────────────────────────────────────────────────────

export async function sendSystemAlert(message: string) {
  const { garethEmail } = await getEmailConfig();
  await sendEmail(
    garethEmail,
    'HeatGlow CRM — System Alert',
    systemAlertHtml(message),
    'system_alert'
  );
}

export async function sendEnquiryConfirmation(
  to: string,
  customerName: string,
  jobType: string,
  enquiryId: number
) {
  await sendEmail(
    to,
    'We received your enquiry — HeatGlow Heating & Plumbing',
    enquiryConfirmationHtml(customerName, jobType),
    'enquiry_confirmation',
    'enquiry',
    enquiryId
  );
}

export async function sendEnquiryDecline(
  to: string,
  customerName: string,
  reason: string,
  enquiryId: number
) {
  await sendEmail(
    to,
    'Your enquiry — HeatGlow Heating & Plumbing',
    enquiryDeclineHtml(customerName, reason),
    'enquiry_declined',
    'enquiry',
    enquiryId
  );
}

export async function sendGarethNotification(
  enquiryId: number,
  customerName: string,
  jobType: string,
  postcode: string,
  aiScore: number | null,
  aiRecommendation: string | null,
  urgency: string,
  baseUrl: string
) {
  const subject =
    urgency === 'Emergency'
      ? `🚨 EMERGENCY Enquiry — ${customerName} (${jobType})`
      : `New Enquiry — ${customerName} (${jobType}) — Score: ${aiScore ?? 'N/A'}`;

  const { garethEmail } = await getEmailConfig();
  await sendEmail(
    garethEmail,
    subject,
    garethNotificationHtml({
      enquiryId,
      customerName,
      jobType,
      postcode,
      aiScore,
      aiRecommendation,
      urgency,
      baseUrl,
    }),
    urgency === 'Emergency' ? 'emergency_alert' : 'enquiry_notification_gareth',
    'enquiry',
    enquiryId
  );
}

export async function sendTestEmail(toEmail: string): Promise<boolean> {
  const result = await sendEmail(
    toEmail,
    'HeatGlow CRM — Test Email',
    testEmailHtml(),
    'test_email'
  );
  return result !== null;
}

// ── Email Templates (inline HTML) ────────────────────────────────────────────

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #fff;
  color: #111;
`;

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyles}">
  <div style="border-bottom:3px solid #f97316;padding-bottom:16px;margin-bottom:24px;">
    <span style="font-size:22px;font-weight:700;color:#f97316;">🔥 HeatGlow</span>
    <span style="font-size:14px;color:#6b7280;margin-left:8px;">Heating & Plumbing</span>
  </div>
  ${content}
  <div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:12px;color:#9ca3af;">
    HeatGlow Heating & Plumbing | 66 Park Road, Whitchurch, Cardiff CF14 7BR<br>
    <a href="mailto:info@heatglow.co.uk" style="color:#f97316;">info@heatglow.co.uk</a>
  </div>
</body>
</html>`;
}

function enquiryConfirmationHtml(customerName: string, jobType: string): string {
  return wrapEmail(`
    <h2 style="margin:0 0 16px;font-size:20px;">Thanks for getting in touch, ${customerName}!</h2>
    <p>We've received your enquiry about <strong>${jobType}</strong> and one of our team will be in touch shortly.</p>
    <p>Our typical response time is within 2 business hours. For emergencies, please call us directly.</p>
    <p style="margin-top:24px;">Warm regards,<br><strong>Gareth &amp; the HeatGlow Team</strong></p>
  `);
}

function enquiryDeclineHtml(customerName: string, reason: string): string {
  return wrapEmail(`
    <h2 style="margin:0 0 16px;font-size:20px;">Thank you for contacting us, ${customerName}</h2>
    <p>Unfortunately, we're unable to assist with your enquiry at this time.</p>
    ${reason ? `<p style="color:#6b7280;font-size:14px;">${reason}</p>` : ''}
    <p>We'd recommend contacting a local heating specialist who may be better placed to help.</p>
    <p style="margin-top:24px;">Kind regards,<br><strong>Gareth at HeatGlow</strong></p>
  `);
}

interface GarethNotifParams {
  enquiryId: number;
  customerName: string;
  jobType: string;
  postcode: string;
  aiScore: number | null;
  aiRecommendation: string | null;
  urgency: string;
  baseUrl: string;
}

function garethNotificationHtml(p: GarethNotifParams): string {
  const scoreColor =
    (p.aiScore ?? 0) >= 70 ? '#16a34a' : (p.aiScore ?? 0) >= 40 ? '#d97706' : '#dc2626';
  const approveUrl = `${p.baseUrl}/enquiries/${p.enquiryId}`;

  return wrapEmail(`
    <h2 style="margin:0 0 16px;font-size:20px;">
      ${p.urgency === 'Emergency' ? '🚨 EMERGENCY — ' : ''}New Enquiry Received
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Customer</td><td><strong>${p.customerName}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Job Type</td><td>${p.jobType}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Postcode</td><td>${p.postcode}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Urgency</td><td><strong>${p.urgency}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">AI Score</td>
        <td><span style="color:${scoreColor};font-weight:700;">${p.aiScore ?? 'N/A'}/100</span>
        ${p.aiRecommendation ? ` — ${p.aiRecommendation}` : ''}</td></tr>
    </table>
    <div style="margin-top:24px;">
      <a href="${approveUrl}" style="background:#f97316;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
        Review Enquiry →
      </a>
    </div>
  `);
}

function systemAlertHtml(message: string): string {
  return wrapEmail(`
    <h2 style="margin:0 0 16px;color:#dc2626;">⚠️ System Alert</h2>
    <p>${message}</p>
    <p>Please log in to the CRM to investigate.</p>
  `);
}

function testEmailHtml(): string {
  return wrapEmail(`
    <h2 style="margin:0 0 16px;">✅ Test Email Successful</h2>
    <p>Your Resend email configuration is working correctly.</p>
    <p>This test was sent from the HeatGlow CRM Settings page.</p>
  `);
}

export { getEmailConfig };
