-- HeatGlow CRM — Initial Schema
-- All tables include deleted_at for soft deletes. Never hard delete.

-- ─────────────────────────────────────────────────────────────
-- CLIENTS (mirror of ServiceM8 client records)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id                       bigserial PRIMARY KEY,
  sm8_client_uuid          text UNIQUE NOT NULL,
  name                     text NOT NULL,
  phone                    text,
  email                    text,
  postcode                 text,
  address_line1            text,
  address_line2            text,
  city                     text,
  is_heatshield            boolean DEFAULT false,
  heatshield_category_uuid text,
  customer_since           date,
  total_spend              numeric(10,2) DEFAULT 0,
  job_count                integer DEFAULT 0,
  known_contacts           jsonb,
  last_job_date            date,
  last_synced_at           timestamptz,
  deleted_at               timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- JOBS (mirror of ServiceM8 job records)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE jobs (
  id                      bigserial PRIMARY KEY,
  sm8_job_uuid            text UNIQUE NOT NULL,
  client_id               bigint REFERENCES clients(id),
  sm8_client_uuid         text,
  job_ref                 text,
  job_type                text,
  sm8_status              text,
  invoice_status          text,
  invoice_amount          numeric(10,2),
  invoice_created_at      timestamptz,
  completed_by_uuid       text,
  engineer_name           text,
  job_date                date,
  description             text,
  quote_lapsed            boolean DEFAULT false,
  quote_lapsed_checked_at timestamptz,
  sm8_job_url             text,
  last_synced_at          timestamptz,
  deleted_at              timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- ENQUIRIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE enquiries (
  id                        bigserial PRIMARY KEY,
  created_at                timestamptz DEFAULT now(),
  customer_name             text NOT NULL,
  phone                     text NOT NULL,
  email                     text NOT NULL,
  postcode                  text NOT NULL,
  postcode_covered          boolean,
  job_type                  text NOT NULL,
  job_type_accepted         boolean,
  urgency                   text NOT NULL,
  source                    text,
  referral_name             text,
  description               text NOT NULL,
  internal_notes            text,
  is_duplicate              boolean DEFAULT false,
  is_suspicious             boolean DEFAULT false,
  recaptcha_score           numeric(3,2),
  ai_score                  integer,
  ai_recommendation         text,
  ai_confidence             integer,
  ai_reason                 text,
  ai_flags                  jsonb,
  ai_scored_at              timestamptz,
  ai_error                  boolean DEFAULT false,
  auto_reject_reason        text,
  status                    text NOT NULL DEFAULT 'New',
  qualified_by              text,
  qualified_at              timestamptz,
  rejected_by               text,
  rejected_at               timestamptz,
  rejection_reason          text,
  override_note             text,
  sm8_client_uuid           text,
  sm8_job_uuid              text,
  sm8_push_status           text,
  sm8_push_attempted_at     timestamptz,
  sm8_push_attempt_count    integer DEFAULT 0,
  existing_client_id        bigint REFERENCES clients(id),
  customer_email_sent       boolean DEFAULT false,
  customer_email_type       text,
  gareth_email_sent         boolean DEFAULT false,
  expired_at                timestamptz,
  deleted_at                timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- HEATSHIELD MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE heatshield_members (
  id                        bigserial PRIMARY KEY,
  client_id                 bigint REFERENCES clients(id) NOT NULL,
  sm8_client_uuid           text NOT NULL,
  customer_name             text NOT NULL,
  sign_up_date              date NOT NULL,
  last_service_date         date NOT NULL,
  monthly_amount_pence      integer DEFAULT 1000,
  status                    text NOT NULL DEFAULT 'Active',
  cancellation_reason       text,
  cancellation_date         date,
  notes                     text,
  service_due_flag          boolean DEFAULT false,
  reminder_draft_created_at timestamptz,
  deleted_at                timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGN DRAFTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE campaign_drafts (
  id                   bigserial PRIMARY KEY,
  created_at           timestamptz DEFAULT now(),
  name                 text NOT NULL,
  trigger_type         text,
  subject              text,
  body                 text,
  segment_filters      jsonb,
  segment_description  text,
  recipient_count      integer,
  attributed_revenue   numeric(10,2) DEFAULT 0,
  status               text DEFAULT 'Draft',
  scheduled_at         timestamptz,
  approved_by          text,
  approved_at          timestamptz,
  sent_at              timestamptz,
  deleted_at           timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGN EMAILS (one row per recipient per campaign)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE campaign_emails (
  id                   bigserial PRIMARY KEY,
  campaign_draft_id    bigint REFERENCES campaign_drafts(id),
  client_id            bigint REFERENCES clients(id),
  recipient_email      text NOT NULL,
  personalised_subject text NOT NULL,
  personalised_body    text NOT NULL,
  status               text DEFAULT 'Draft',
  sent_at              timestamptz,
  resend_message_id    text,
  opened_at            timestamptz,
  clicked_at           timestamptz,
  deleted_at           timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- SUPPRESSION LIST
-- ─────────────────────────────────────────────────────────────
CREATE TABLE suppression_list (
  id         bigserial PRIMARY KEY,
  email      text UNIQUE NOT NULL,
  added_at   timestamptz DEFAULT now(),
  reason     text,
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  event_type  text NOT NULL,
  description text NOT NULL,
  actor       text,
  metadata    jsonb,
  entity_type text,
  entity_id   bigint
);

-- ─────────────────────────────────────────────────────────────
-- EMAIL LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE email_log (
  id                bigserial PRIMARY KEY,
  created_at        timestamptz DEFAULT now(),
  type              text NOT NULL,
  recipient_email   text NOT NULL,
  subject           text,
  resend_message_id text,
  status            text,
  error_message     text,
  entity_type       text,
  entity_id         bigint
);

-- ─────────────────────────────────────────────────────────────
-- SETTINGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE settings (
  id         bigserial PRIMARY KEY,
  key        text UNIQUE NOT NULL,
  value      text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- ─────────────────────────────────────────────────────────────
-- SYNC LOG
-- ─────────────────────────────────────────────────────────────
CREATE TABLE sync_log (
  id               bigserial PRIMARY KEY,
  started_at       timestamptz NOT NULL,
  completed_at     timestamptz,
  status           text,
  records_updated  integer,
  error_message    text,
  triggered_by     text
);

-- ─────────────────────────────────────────────────────────────
-- CAMPAIGN TEMPLATES (Phase 4)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE campaign_templates (
  id         bigserial PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name       text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX ON clients(postcode);
CREATE INDEX ON clients(phone);
CREATE INDEX ON clients(email);
CREATE INDEX ON clients(is_heatshield);
CREATE INDEX ON clients(deleted_at);
CREATE INDEX ON enquiries(status);
CREATE INDEX ON enquiries(created_at);
CREATE INDEX ON enquiries(phone);
CREATE INDEX ON enquiries(email);
CREATE INDEX ON enquiries(deleted_at);
CREATE INDEX ON jobs(sm8_status);
CREATE INDEX ON jobs(invoice_status);
CREATE INDEX ON jobs(client_id);
CREATE INDEX ON jobs(job_date);
CREATE INDEX ON jobs(deleted_at);
CREATE INDEX ON heatshield_members(status);
CREATE INDEX ON heatshield_members(last_service_date);
CREATE INDEX ON heatshield_members(client_id);
CREATE INDEX ON campaign_drafts(status);
CREATE INDEX ON campaign_emails(campaign_draft_id);
CREATE INDEX ON campaign_emails(client_id);
CREATE INDEX ON campaign_emails(resend_message_id);
CREATE INDEX ON audit_log(entity_type, entity_id);
CREATE INDEX ON audit_log(created_at);
CREATE INDEX ON email_log(entity_type, entity_id);
CREATE INDEX ON sync_log(started_at);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE heatshield_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write all CRM tables
CREATE POLICY "Authenticated users have full access" ON clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON enquiries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON heatshield_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON campaign_drafts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON campaign_emails
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON suppression_list
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON email_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON sync_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users have full access" ON campaign_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────
-- SEED: DEFAULT SETTINGS
-- ─────────────────────────────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('auto_qualify_threshold', '85'),
  ('auto_reject_threshold', '30'),
  ('quote_lapse_days', '3'),
  ('overdue_invoice_days', '14'),
  ('heatshield_reminder_days_before_due', '60'),
  ('auto_qualify_enabled', 'true'),
  ('auto_reject_enabled', 'true'),
  ('send_customer_confirmation_email', 'true'),
  ('send_gareth_notification_email', 'true'),
  ('send_emergency_instant_alert', 'true'),
  ('stale_enquiry_alert_hours', '48'),
  ('auto_expire_enquiry_days', '14'),
  ('sm8_api_key', ''),
  ('sm8_oauth_access_token', ''),
  ('sm8_oauth_refresh_token', ''),
  ('sm8_oauth_token_expires_at', ''),
  ('sm8_heatshield_category_uuid', '')
ON CONFLICT (key) DO NOTHING;
