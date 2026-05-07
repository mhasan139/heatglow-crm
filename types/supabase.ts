// Supabase Database types for HeatGlow CRM
// Replace this with generated types when Supabase project is created:
//   npx supabase gen types typescript --project-id <project-id> > types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
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
          known_contacts: Json | null;
          last_job_date: string | null;
          last_synced_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          sm8_client_uuid: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          postcode?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          is_heatshield?: boolean;
          heatshield_category_uuid?: string | null;
          customer_since?: string | null;
          total_spend?: number;
          job_count?: number;
          known_contacts?: Json | null;
          last_job_date?: string | null;
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          sm8_client_uuid?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          postcode?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          is_heatshield?: boolean;
          heatshield_category_uuid?: string | null;
          customer_since?: string | null;
          total_spend?: number;
          job_count?: number;
          known_contacts?: Json | null;
          last_job_date?: string | null;
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
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
        };
        Insert: {
          id?: number;
          sm8_job_uuid: string;
          client_id?: number | null;
          sm8_client_uuid?: string | null;
          job_ref?: string | null;
          job_type?: string | null;
          sm8_status?: string | null;
          invoice_status?: string | null;
          invoice_amount?: number | null;
          invoice_created_at?: string | null;
          completed_by_uuid?: string | null;
          engineer_name?: string | null;
          job_date?: string | null;
          description?: string | null;
          quote_lapsed?: boolean;
          quote_lapsed_checked_at?: string | null;
          sm8_job_url?: string | null;
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          sm8_job_uuid?: string;
          client_id?: number | null;
          sm8_client_uuid?: string | null;
          job_ref?: string | null;
          job_type?: string | null;
          sm8_status?: string | null;
          invoice_status?: string | null;
          invoice_amount?: number | null;
          invoice_created_at?: string | null;
          completed_by_uuid?: string | null;
          engineer_name?: string | null;
          job_date?: string | null;
          description?: string | null;
          quote_lapsed?: boolean;
          quote_lapsed_checked_at?: string | null;
          sm8_job_url?: string | null;
          last_synced_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      enquiries: {
        Row: {
          id: number;
          created_at: string;
          customer_name: string;
          phone: string;
          email: string;
          postcode: string;
          postcode_covered: boolean | null;
          job_type: string;
          job_type_accepted: boolean | null;
          urgency: string;
          source: string | null;
          referral_name: string | null;
          description: string;
          internal_notes: string | null;
          is_duplicate: boolean;
          is_suspicious: boolean;
          recaptcha_score: number | null;
          ai_score: number | null;
          ai_recommendation: string | null;
          ai_confidence: number | null;
          ai_reason: string | null;
          ai_flags: Json | null;
          ai_scored_at: string | null;
          ai_error: boolean;
          auto_reject_reason: string | null;
          status: string;
          qualified_by: string | null;
          qualified_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          override_note: string | null;
          sm8_client_uuid: string | null;
          sm8_job_uuid: string | null;
          sm8_push_status: string | null;
          sm8_push_attempted_at: string | null;
          sm8_push_attempt_count: number;
          existing_client_id: number | null;
          customer_email_sent: boolean;
          customer_email_type: string | null;
          gareth_email_sent: boolean;
          expired_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          customer_name: string;
          phone: string;
          email: string;
          postcode: string;
          postcode_covered?: boolean | null;
          job_type: string;
          job_type_accepted?: boolean | null;
          urgency: string;
          source?: string | null;
          referral_name?: string | null;
          description: string;
          internal_notes?: string | null;
          is_duplicate?: boolean;
          is_suspicious?: boolean;
          recaptcha_score?: number | null;
          ai_score?: number | null;
          ai_recommendation?: string | null;
          ai_confidence?: number | null;
          ai_reason?: string | null;
          ai_flags?: Json | null;
          ai_scored_at?: string | null;
          ai_error?: boolean;
          auto_reject_reason?: string | null;
          status?: string;
          qualified_by?: string | null;
          qualified_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          override_note?: string | null;
          sm8_client_uuid?: string | null;
          sm8_job_uuid?: string | null;
          sm8_push_status?: string | null;
          sm8_push_attempted_at?: string | null;
          sm8_push_attempt_count?: number;
          existing_client_id?: number | null;
          customer_email_sent?: boolean;
          customer_email_type?: string | null;
          gareth_email_sent?: boolean;
          expired_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          customer_name?: string;
          phone?: string;
          email?: string;
          postcode?: string;
          postcode_covered?: boolean | null;
          job_type?: string;
          job_type_accepted?: boolean | null;
          urgency?: string;
          source?: string | null;
          referral_name?: string | null;
          description?: string;
          internal_notes?: string | null;
          is_duplicate?: boolean;
          is_suspicious?: boolean;
          recaptcha_score?: number | null;
          ai_score?: number | null;
          ai_recommendation?: string | null;
          ai_confidence?: number | null;
          ai_reason?: string | null;
          ai_flags?: Json | null;
          ai_scored_at?: string | null;
          ai_error?: boolean;
          auto_reject_reason?: string | null;
          status?: string;
          qualified_by?: string | null;
          qualified_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          override_note?: string | null;
          sm8_client_uuid?: string | null;
          sm8_job_uuid?: string | null;
          sm8_push_status?: string | null;
          sm8_push_attempted_at?: string | null;
          sm8_push_attempt_count?: number;
          existing_client_id?: number | null;
          customer_email_sent?: boolean;
          customer_email_type?: string | null;
          gareth_email_sent?: boolean;
          expired_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'enquiries_existing_client_id_fkey';
            columns: ['existing_client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      heatshield_members: {
        Row: {
          id: number;
          client_id: number;
          sm8_client_uuid: string;
          customer_name: string;
          sign_up_date: string;
          last_service_date: string;
          monthly_amount_pence: number;
          status: string;
          cancellation_reason: string | null;
          cancellation_date: string | null;
          notes: string | null;
          service_due_flag: boolean;
          reminder_draft_created_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          client_id: number;
          sm8_client_uuid: string;
          customer_name: string;
          sign_up_date: string;
          last_service_date: string;
          monthly_amount_pence?: number;
          status?: string;
          cancellation_reason?: string | null;
          cancellation_date?: string | null;
          notes?: string | null;
          service_due_flag?: boolean;
          reminder_draft_created_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          client_id?: number;
          sm8_client_uuid?: string;
          customer_name?: string;
          sign_up_date?: string;
          last_service_date?: string;
          monthly_amount_pence?: number;
          status?: string;
          cancellation_reason?: string | null;
          cancellation_date?: string | null;
          notes?: string | null;
          service_due_flag?: boolean;
          reminder_draft_created_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'heatshield_members_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      campaign_drafts: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          trigger_type: string | null;
          subject: string | null;
          body: string | null;
          segment_filters: Json | null;
          segment_description: string | null;
          recipient_count: number | null;
          attributed_revenue: number;
          status: string;
          scheduled_at: string | null;
          approved_by: string | null;
          approved_at: string | null;
          sent_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          name: string;
          trigger_type?: string | null;
          subject?: string | null;
          body?: string | null;
          segment_filters?: Json | null;
          segment_description?: string | null;
          recipient_count?: number | null;
          attributed_revenue?: number;
          status?: string;
          scheduled_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          sent_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          name?: string;
          trigger_type?: string | null;
          subject?: string | null;
          body?: string | null;
          segment_filters?: Json | null;
          segment_description?: string | null;
          recipient_count?: number | null;
          attributed_revenue?: number;
          status?: string;
          scheduled_at?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          sent_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      campaign_emails: {
        Row: {
          id: number;
          campaign_draft_id: number;
          client_id: number | null;
          recipient_email: string;
          personalised_subject: string;
          personalised_body: string;
          status: string;
          sent_at: string | null;
          resend_message_id: string | null;
          opened_at: string | null;
          clicked_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          campaign_draft_id: number;
          client_id?: number | null;
          recipient_email: string;
          personalised_subject: string;
          personalised_body: string;
          status?: string;
          sent_at?: string | null;
          resend_message_id?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          campaign_draft_id?: number;
          client_id?: number | null;
          recipient_email?: string;
          personalised_subject?: string;
          personalised_body?: string;
          status?: string;
          sent_at?: string | null;
          resend_message_id?: string | null;
          opened_at?: string | null;
          clicked_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'campaign_emails_campaign_draft_id_fkey';
            columns: ['campaign_draft_id'];
            isOneToOne: false;
            referencedRelation: 'campaign_drafts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'campaign_emails_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          }
        ];
      };
      suppression_list: {
        Row: {
          id: number;
          email: string;
          added_at: string;
          reason: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          email: string;
          added_at?: string;
          reason?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          email?: string;
          added_at?: string;
          reason?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          created_at: string;
          event_type: string;
          description: string;
          actor: string | null;
          metadata: Json | null;
          entity_type: string | null;
          entity_id: number | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          event_type: string;
          description: string;
          actor?: string | null;
          metadata?: Json | null;
          entity_type?: string | null;
          entity_id?: number | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          event_type?: string;
          description?: string;
          actor?: string | null;
          metadata?: Json | null;
          entity_type?: string | null;
          entity_id?: number | null;
        };
        Relationships: [];
      };
      email_log: {
        Row: {
          id: number;
          created_at: string;
          type: string;
          recipient_email: string;
          subject: string | null;
          resend_message_id: string | null;
          status: string | null;
          error_message: string | null;
          entity_type: string | null;
          entity_id: number | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          type: string;
          recipient_email: string;
          subject?: string | null;
          resend_message_id?: string | null;
          status?: string | null;
          error_message?: string | null;
          entity_type?: string | null;
          entity_id?: number | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          type?: string;
          recipient_email?: string;
          subject?: string | null;
          resend_message_id?: string | null;
          status?: string | null;
          error_message?: string | null;
          entity_type?: string | null;
          entity_id?: number | null;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          id: number;
          key: string;
          value: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          key: string;
          value: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: number;
          key?: string;
          value?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      sync_log: {
        Row: {
          id: number;
          started_at: string;
          completed_at: string | null;
          status: string | null;
          records_updated: number | null;
          error_message: string | null;
          triggered_by: string | null;
        };
        Insert: {
          id?: number;
          started_at: string;
          completed_at?: string | null;
          status?: string | null;
          records_updated?: number | null;
          error_message?: string | null;
          triggered_by?: string | null;
        };
        Update: {
          id?: number;
          started_at?: string;
          completed_at?: string | null;
          status?: string | null;
          records_updated?: number | null;
          error_message?: string | null;
          triggered_by?: string | null;
        };
        Relationships: [];
      };
      campaign_templates: {
        Row: {
          id: number;
          created_at: string;
          name: string;
          subject: string;
          body: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: number;
          created_at?: string;
          name: string;
          subject: string;
          body: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: number;
          created_at?: string;
          name?: string;
          subject?: string;
          body?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
