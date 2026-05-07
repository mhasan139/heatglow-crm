// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

export type EnquiryStatus = 'New' | 'Qualified' | 'Rejected' | 'Expired';
export type EnquiryUrgency = 'Normal' | 'Urgent' | 'Emergency';
export type EnquirySource =
  | 'Google'
  | 'Referral'
  | 'Website'
  | 'Phone'
  | 'Facebook'
  | 'Checkatrade'
  | 'Other';
export type AiRecommendation = 'QUALIFY' | 'REVIEW' | 'REJECT';
export type SM8PushStatus = 'success' | 'pending' | 'failed';

export type HeatShieldStatus = 'Active' | 'Lapsed' | 'Cancelled';
export type CancellationReason =
  | 'Price'
  | 'Moving away'
  | 'Switching provider'
  | 'No longer own property'
  | 'Other';

export type CampaignStatus =
  | 'Draft'
  | 'Scheduled'
  | 'Sending'
  | 'Sent'
  | 'Cancelled';
export type CampaignTriggerType =
  | 'heatshield_service_due'
  | 'quote_lapsed'
  | 'win_back'
  | 'service_reminder'
  | 're_engagement'
  | 'manual';

export type CampaignEmailStatus =
  | 'Draft'
  | 'Queued'
  | 'Sent'
  | 'Failed'
  | 'Suppressed';

export type SyncStatus = 'running' | 'success' | 'failed';

export type UserRole = 'admin' | 'staff';

// ─────────────────────────────────────────────────────────────
// CLIENT (ServiceM8 customer)
// ─────────────────────────────────────────────────────────────

export interface Client {
  id: number;
  sm8_client_uuid: string;
  name: string;
  phone: string | null;
  email: string | null;
  postcode: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  is_heatshield: boolean;
  heatshield_category_uuid: string | null;
  customer_since: string | null;
  total_spend: number;
  job_count: number;
  known_contacts: KnownContact[] | null;
  last_job_date: string | null;
  last_synced_at: string | null;
  deleted_at: string | null;
}

export interface KnownContact {
  type: 'phone' | 'email';
  value: string;
}

// ─────────────────────────────────────────────────────────────
// JOB (ServiceM8 job record)
// ─────────────────────────────────────────────────────────────

export interface Job {
  id: number;
  sm8_job_uuid: string;
  client_id: number | null;
  sm8_client_uuid: string | null;
  job_ref: string | null;
  job_type: string | null;
  sm8_status: string | null;
  invoice_status: string | null;
  invoice_amount: number | null;
  invoice_created_at: string | null;
  completed_by_uuid: string | null;
  engineer_name: string | null;
  job_date: string | null;
  description: string | null;
  quote_lapsed: boolean;
  quote_lapsed_checked_at: string | null;
  sm8_job_url: string | null;
  last_synced_at: string | null;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// ENQUIRY
// ─────────────────────────────────────────────────────────────

export interface Enquiry {
  id: number;
  created_at: string;
  customer_name: string;
  phone: string;
  email: string;
  postcode: string;
  postcode_covered: boolean | null;
  job_type: string;
  job_type_accepted: boolean | null;
  urgency: EnquiryUrgency;
  source: EnquirySource | null;
  referral_name: string | null;
  description: string;
  internal_notes: string | null;
  is_duplicate: boolean;
  is_suspicious: boolean;
  recaptcha_score: number | null;
  ai_score: number | null;
  ai_recommendation: AiRecommendation | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  ai_flags: string[] | null;
  ai_scored_at: string | null;
  ai_error: boolean;
  auto_reject_reason: string | null;
  status: EnquiryStatus;
  qualified_by: string | null;
  qualified_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  override_note: string | null;
  sm8_client_uuid: string | null;
  sm8_job_uuid: string | null;
  sm8_push_status: SM8PushStatus | null;
  sm8_push_attempted_at: string | null;
  sm8_push_attempt_count: number;
  existing_client_id: number | null;
  customer_email_sent: boolean;
  customer_email_type: string | null;
  gareth_email_sent: boolean;
  expired_at: string | null;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// HEATSHIELD MEMBER
// ─────────────────────────────────────────────────────────────

export interface HeatShieldMember {
  id: number;
  client_id: number;
  sm8_client_uuid: string;
  customer_name: string;
  sign_up_date: string;
  last_service_date: string;
  monthly_amount_pence: number;
  status: HeatShieldStatus;
  cancellation_reason: CancellationReason | null;
  cancellation_date: string | null;
  notes: string | null;
  service_due_flag: boolean;
  reminder_draft_created_at: string | null;
  deleted_at: string | null;
  // Joined
  client?: Client;
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN DRAFT
// ─────────────────────────────────────────────────────────────

export interface SegmentFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | string[] | number[];
}

export interface CampaignDraft {
  id: number;
  created_at: string;
  name: string;
  trigger_type: CampaignTriggerType | null;
  subject: string | null;
  body: string | null;
  segment_filters: SegmentFilter[] | null;
  segment_description: string | null;
  recipient_count: number | null;
  attributed_revenue: number;
  status: CampaignStatus;
  scheduled_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN EMAIL
// ─────────────────────────────────────────────────────────────

export interface CampaignEmail {
  id: number;
  campaign_draft_id: number;
  client_id: number | null;
  recipient_email: string;
  personalised_subject: string;
  personalised_body: string;
  status: CampaignEmailStatus;
  sent_at: string | null;
  resend_message_id: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// SUPPRESSION LIST
// ─────────────────────────────────────────────────────────────

export interface SuppressionEntry {
  id: number;
  email: string;
  added_at: string;
  reason: 'unsubscribe' | 'manual' | 'import' | null;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  created_at: string;
  event_type: string;
  description: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  entity_type: string | null;
  entity_id: number | null;
}

// ─────────────────────────────────────────────────────────────
// EMAIL LOG
// ─────────────────────────────────────────────────────────────

export interface EmailLog {
  id: number;
  created_at: string;
  type: string;
  recipient_email: string;
  subject: string | null;
  resend_message_id: string | null;
  status: 'sent' | 'failed' | null;
  error_message: string | null;
  entity_type: string | null;
  entity_id: number | null;
}

// ─────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────

export interface Setting {
  id: number;
  key: string;
  value: string;
  updated_at: string;
  updated_by: string | null;
}

export interface CRMSettings {
  auto_qualify_threshold: number;
  auto_reject_threshold: number;
  quote_lapse_days: number;
  overdue_invoice_days: number;
  heatshield_reminder_days_before_due: number;
  auto_qualify_enabled: boolean;
  auto_reject_enabled: boolean;
  send_customer_confirmation_email: boolean;
  send_gareth_notification_email: boolean;
  send_emergency_instant_alert: boolean;
  stale_enquiry_alert_hours: number;
  auto_expire_enquiry_days: number;
  sm8_api_key: string;
  sm8_oauth_access_token: string;
  sm8_oauth_refresh_token: string;
  sm8_oauth_token_expires_at: string;
  sm8_heatshield_category_uuid: string;
}

// ─────────────────────────────────────────────────────────────
// SYNC LOG
// ─────────────────────────────────────────────────────────────

export interface SyncLog {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: SyncStatus | null;
  records_updated: number | null;
  error_message: string | null;
  triggered_by: 'cron' | 'manual' | null;
}

// ─────────────────────────────────────────────────────────────
// CAMPAIGN TEMPLATE
// ─────────────────────────────────────────────────────────────

export interface CampaignTemplate {
  id: number;
  created_at: string;
  name: string;
  subject: string;
  body: string;
  deleted_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// API RESPONSE SHAPES
// ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiError {
  error: string;
  details?: string;
}

// Dashboard KPI shape
export interface DashboardKPIs {
  revenue_paid_mtd: number;
  revenue_paid_mtd_delta: number;
  awaiting_payment_total: number;
  quotes_sent_mtd: number;
  quotes_sent_mtd_delta: number;
  quotes_accepted_mtd: number;
  quotes_accepted_mtd_delta: number;
  quotes_declined_lapsed_mtd: number;
  jobs_completed_mtd: number;
  jobs_completed_mtd_delta: number;
  heatshield_active_count: number;
  heatshield_active_delta: number;
  enquiries_received_mtd: number;
  enquiries_received_mtd_delta: number;
}

export interface DashboardAlerts {
  unreviewed_enquiries: number;
  lapsed_quotes: number;
  overdue_invoices_count: number;
  overdue_invoices_total: number;
  heatshield_due_count: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  alerts: DashboardAlerts;
  quote_funnel: { month: string; sent: number; accepted: number; declined: number }[];
  enquiry_quality: { qualified: number; rejected: number; pending: number };
  recent_enquiries: Enquiry[];
  recent_activity: AuditLog[];
  recent_jobs: Job[];
  last_sync: { synced_at: string | null; status: SyncStatus | null };
}

// Gemini qualification result
export interface GeminiQualificationResult {
  score: number;
  recommendation: AiRecommendation;
  confidence: number;
  reason: string;
  flags: string[];
}

// SM8 write-back result
export interface SM8WriteResult {
  success: boolean;
  sm8_client_uuid?: string;
  sm8_job_uuid?: string;
  error?: string;
}
