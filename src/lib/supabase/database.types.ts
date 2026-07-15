export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          key_hash: string
          request_count: number
          window_expires_at: string
        }
        Insert: {
          key_hash: string
          request_count: number
          window_expires_at: string
        }
        Update: {
          key_hash?: string
          request_count?: number
          window_expires_at?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          candidate_email: string
          candidate_name: string
          candidate_phone: string | null
          candidate_user_id: string
          created_at: string
          current_company: string | null
          experience_years: number | null
          id: string
          job_id: string
          linkedin_url: string | null
          match_rationale: string | null
          match_score: number | null
          note: string | null
          recruiter_id: string
          resume_storage_path: string | null
          resume_structured_snapshot: Json | null
          resume_url: string | null
          status: Database['public']['Enums']['application_status']
          updated_at: string
        }
        Insert: {
          candidate_email: string
          candidate_name: string
          candidate_phone?: string | null
          candidate_user_id: string
          created_at?: string
          current_company?: string | null
          experience_years?: number | null
          id?: string
          job_id: string
          linkedin_url?: string | null
          match_rationale?: string | null
          match_score?: number | null
          note?: string | null
          recruiter_id: string
          resume_storage_path?: string | null
          resume_structured_snapshot?: Json | null
          resume_url?: string | null
          status?: Database['public']['Enums']['application_status']
          updated_at?: string
        }
        Update: {
          candidate_email?: string
          candidate_name?: string
          candidate_phone?: string | null
          candidate_user_id?: string
          created_at?: string
          current_company?: string | null
          experience_years?: number | null
          id?: string
          job_id?: string
          linkedin_url?: string | null
          match_rationale?: string | null
          match_score?: number | null
          note?: string | null
          recruiter_id?: string
          resume_storage_path?: string | null
          resume_structured_snapshot?: Json | null
          resume_url?: string | null
          status?: Database['public']['Enums']['application_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applications_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'applications_recruiter_id_fkey'
            columns: ['recruiter_id']
            isOneToOne: false
            referencedRelation: 'recruiters'
            referencedColumns: ['id']
          },
        ]
      }
      email_automation_rules: {
        Row: {
          enabled: boolean
          trigger_key: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          trigger_key: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          trigger_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          delivery_status: Database['public']['Enums']['delivery_status']
          delivery_event_at: string | null
          email: string
          error_message: string | null
          id: string
          recipient_type: string
          resend_message_id: string | null
          sent_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delivery_status?: Database['public']['Enums']['delivery_status']
          delivery_event_at?: string | null
          email: string
          error_message?: string | null
          id?: string
          recipient_type: string
          resend_message_id?: string | null
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delivery_status?: Database['public']['Enums']['delivery_status']
          delivery_event_at?: string | null
          email?: string
          error_message?: string | null
          id?: string
          recipient_type?: string
          resend_message_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'email_campaign_recipients_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'email_campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience: Database['public']['Enums']['campaign_audience']
          body: string
          created_at: string
          created_by: string | null
          id: string
          preview_text: string | null
          sent_at: string | null
          status: Database['public']['Enums']['campaign_status']
          subject: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience?: Database['public']['Enums']['campaign_audience']
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          preview_text?: string | null
          sent_at?: string | null
          status?: Database['public']['Enums']['campaign_status']
          subject: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience?: Database['public']['Enums']['campaign_audience']
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          preview_text?: string | null
          sent_at?: string | null
          status?: Database['public']['Enums']['campaign_status']
          subject?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_campaigns_template_id_fkey'
            columns: ['template_id']
            isOneToOne: false
            referencedRelation: 'email_templates'
            referencedColumns: ['id']
          },
        ]
      }
      email_templates: {
        Row: {
          audience:
            | Database['public']['Enums']['email_template_audience']
            | null
          body_html: string
          category: Database['public']['Enums']['email_template_category']
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          name: string
          preview_text: string | null
          shell: Database['public']['Enums']['email_template_shell']
          slug: string
          subject: string
          trigger_key: string | null
          updated_at: string
        }
        Insert: {
          audience?:
            | Database['public']['Enums']['email_template_audience']
            | null
          body_html: string
          category: Database['public']['Enums']['email_template_category']
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name: string
          preview_text?: string | null
          shell: Database['public']['Enums']['email_template_shell']
          slug: string
          subject: string
          trigger_key?: string | null
          updated_at?: string
        }
        Update: {
          audience?:
            | Database['public']['Enums']['email_template_audience']
            | null
          body_html?: string
          category?: Database['public']['Enums']['email_template_category']
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name?: string
          preview_text?: string | null
          shell?: Database['public']['Enums']['email_template_shell']
          slug?: string
          subject?: string
          trigger_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          attempt_count: number
          attempted_at: string | null
          campaign_id: string | null
          claim_token: string | null
          created_at: string
          delivery_event_at: string | null
          error_message: string | null
          id: string
          metadata: Json
          recipient_email: string
          recipient_role: string
          resend_message_id: string | null
          status: string
          subject: string | null
          trigger_key: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          attempted_at?: string | null
          campaign_id?: string | null
          claim_token?: string | null
          created_at?: string
          delivery_event_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email: string
          recipient_role?: string
          resend_message_id?: string | null
          status?: string
          subject?: string | null
          trigger_key?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          attempted_at?: string | null
          campaign_id?: string | null
          claim_token?: string | null
          created_at?: string
          delivery_event_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email?: string
          recipient_role?: string
          resend_message_id?: string | null
          status?: string
          subject?: string | null
          trigger_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'email_send_log_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'email_campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      email_subscribers: {
        Row: {
          audience: Database['public']['Enums']['subscriber_audience']
          created_at: string
          email: string
          id: string
          linkedin_url: string | null
          pending_opt_in_requested_at: string | null
          pending_opt_in_token: string | null
          source: string
          unsubscribe_token: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          audience?: Database['public']['Enums']['subscriber_audience']
          created_at?: string
          email: string
          id?: string
          linkedin_url?: string | null
          pending_opt_in_requested_at?: string | null
          pending_opt_in_token?: string | null
          source?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          audience?: Database['public']['Enums']['subscriber_audience']
          created_at?: string
          email?: string
          id?: string
          linkedin_url?: string | null
          pending_opt_in_requested_at?: string | null
          pending_opt_in_token?: string | null
          source?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hiring_requests: {
        Row: {
          assigned_to_email: string | null
          company_name: string
          company_website: string | null
          contact_name: string
          created_at: string
          email: string
          headcount: number | null
          hiring_type: string
          id: string
          internal_notes: string | null
          last_contacted_at: string | null
          location: string | null
          notes: string | null
          phone: string | null
          role_title: string
          servicenow_scope: string | null
          source: string
          status: string
          timeline: string | null
          updated_at: string
          work_mode: string | null
        }
        Insert: {
          assigned_to_email?: string | null
          company_name: string
          company_website?: string | null
          contact_name: string
          created_at?: string
          email: string
          headcount?: number | null
          hiring_type: string
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          role_title: string
          servicenow_scope?: string | null
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          work_mode?: string | null
        }
        Update: {
          assigned_to_email?: string | null
          company_name?: string
          company_website?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          headcount?: number | null
          hiring_type?: string
          id?: string
          internal_notes?: string | null
          last_contacted_at?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          role_title?: string
          servicenow_scope?: string | null
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      job_seeker_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_profile_update_at: string | null
          linkedin_url: string | null
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          phone: string | null
          notification_opt_in: boolean
          portfolio_published_at: string | null
          portfolio_url: string | null
          public_slug: string | null
          is_public: boolean
          resume_markdown: string | null
          resume_source: Database['public']['Enums']['resume_source']
          resume_storage_path: string | null
          resume_structured: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          last_profile_update_at?: string | null
          linkedin_url?: string | null
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          phone?: string | null
          notification_opt_in?: boolean
          portfolio_published_at?: string | null
          portfolio_url?: string | null
          public_slug?: string | null
          is_public?: boolean
          resume_markdown?: string | null
          resume_source?: Database['public']['Enums']['resume_source']
          resume_storage_path?: string | null
          resume_structured?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_profile_update_at?: string | null
          linkedin_url?: string | null
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          phone?: string | null
          notification_opt_in?: boolean
          portfolio_published_at?: string | null
          portfolio_url?: string | null
          public_slug?: string | null
          is_public?: boolean
          resume_markdown?: string | null
          resume_source?: Database['public']['Enums']['resume_source']
          resume_storage_path?: string | null
          resume_structured?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          applied_at: string
          id: string
          job_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          id?: string
          job_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'job_applications_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
        ]
      }
      jobs: {
        Row: {
          apply_url: string
          approval_status: Database['public']['Enums']['approval_status']
          certifications: string[]
          company_logo: string | null
          company_name: string
          company_website: string | null
          created_at: string
          employment_type: Database['public']['Enums']['employment_type']
          experience_level: Database['public']['Enums']['experience_level']
          featured: boolean
          featured_expiry: string | null
          id: string
          job_description: string
          job_slug: string
          job_title: string
          job_type: Database['public']['Enums']['job_type']
          listing_duration: Database['public']['Enums']['listing_duration']
          listing_expires_at: string | null
          listing_tier: Database['public']['Enums']['listing_tier']
          location: string
          modules: string[]
          payment_status: Database['public']['Enums']['payment_status']
          recruiter_email: string
          recruiter_id: string
          recruiter_name: string
          salary_range: string | null
          skills: string[]
          source_kind: Database['public']['Enums']['job_source_kind']
          updated_at: string
          work_mode: Database['public']['Enums']['work_mode']
        }
        Insert: {
          apply_url: string
          approval_status?: Database['public']['Enums']['approval_status']
          certifications?: string[]
          company_logo?: string | null
          company_name: string
          company_website?: string | null
          created_at?: string
          employment_type: Database['public']['Enums']['employment_type']
          experience_level: Database['public']['Enums']['experience_level']
          featured?: boolean
          featured_expiry?: string | null
          id?: string
          job_description: string
          job_slug: string
          job_title: string
          job_type: Database['public']['Enums']['job_type']
          listing_duration?: Database['public']['Enums']['listing_duration']
          listing_expires_at?: string | null
          listing_tier?: Database['public']['Enums']['listing_tier']
          location: string
          modules?: string[]
          payment_status?: Database['public']['Enums']['payment_status']
          recruiter_email: string
          recruiter_id: string
          recruiter_name: string
          salary_range?: string | null
          skills?: string[]
          source_kind?: Database['public']['Enums']['job_source_kind']
          updated_at?: string
          work_mode: Database['public']['Enums']['work_mode']
        }
        Update: {
          apply_url?: string
          approval_status?: Database['public']['Enums']['approval_status']
          certifications?: string[]
          company_logo?: string | null
          company_name?: string
          company_website?: string | null
          created_at?: string
          employment_type?: Database['public']['Enums']['employment_type']
          experience_level?: Database['public']['Enums']['experience_level']
          featured?: boolean
          featured_expiry?: string | null
          id?: string
          job_description?: string
          job_slug?: string
          job_title?: string
          job_type?: Database['public']['Enums']['job_type']
          listing_duration?: Database['public']['Enums']['listing_duration']
          listing_expires_at?: string | null
          listing_tier?: Database['public']['Enums']['listing_tier']
          location?: string
          modules?: string[]
          payment_status?: Database['public']['Enums']['payment_status']
          recruiter_email?: string
          recruiter_id?: string
          recruiter_name?: string
          salary_range?: string | null
          skills?: string[]
          source_kind?: Database['public']['Enums']['job_source_kind']
          updated_at?: string
          work_mode?: Database['public']['Enums']['work_mode']
        }
        Relationships: [
          {
            foreignKeyName: 'jobs_recruiter_id_fkey'
            columns: ['recruiter_id']
            isOneToOne: false
            referencedRelation: 'recruiters'
            referencedColumns: ['id']
          },
        ]
      }
      operator_feedback: {
        Row: {
          admin_notes: string | null
          body: string
          contact_email: string | null
          created_at: string
          id: string
          status: Database['public']['Enums']['operator_feedback_status']
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          body: string
          contact_email?: string | null
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['operator_feedback_status']
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          body?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          status?: Database['public']['Enums']['operator_feedback_status']
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          chargeback_amount: number
          checkout_expires_at: string | null
          checkout_version: number
          created_at: string
          currency: string
          entitlement_applied_at: string | null
          entitlement_withheld_reason: string | null
          id: string
          job_id: string
          last_failure_at: string | null
          last_failure_code: string | null
          paid_at: string | null
          payment_kind: Database['public']['Enums']['payment_kind']
          plan: Database['public']['Enums']['payment_plan']
          provider_event_at: string | null
          provider_receipt: string
          provisioning_started_at: string | null
          provisioning_token: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          recruiter_id: string
          refunded_amount: number
          requires_manual_review: boolean
          risk_status: string | null
          status: Database['public']['Enums']['payment_status']
          updated_at: string
        }
        Insert: {
          amount: number
          chargeback_amount?: number
          checkout_expires_at?: string | null
          checkout_version?: number
          created_at?: string
          currency?: string
          entitlement_applied_at?: string | null
          entitlement_withheld_reason?: string | null
          id?: string
          job_id: string
          last_failure_at?: string | null
          last_failure_code?: string | null
          paid_at?: string | null
          payment_kind: Database['public']['Enums']['payment_kind']
          plan: Database['public']['Enums']['payment_plan']
          provider_event_at?: string | null
          provider_receipt: string
          provisioning_started_at?: string | null
          provisioning_token?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recruiter_id: string
          refunded_amount?: number
          requires_manual_review?: boolean
          risk_status?: string | null
          status?: Database['public']['Enums']['payment_status']
          updated_at?: string
        }
        Update: {
          amount?: number
          chargeback_amount?: number
          checkout_expires_at?: string | null
          checkout_version?: number
          created_at?: string
          currency?: string
          entitlement_applied_at?: string | null
          entitlement_withheld_reason?: string | null
          id?: string
          job_id?: string
          last_failure_at?: string | null
          last_failure_code?: string | null
          paid_at?: string | null
          payment_kind?: Database['public']['Enums']['payment_kind']
          plan?: Database['public']['Enums']['payment_plan']
          provider_event_at?: string | null
          provider_receipt?: string
          provisioning_started_at?: string | null
          provisioning_token?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recruiter_id?: string
          refunded_amount?: number
          requires_manual_review?: boolean
          risk_status?: string | null
          status?: Database['public']['Enums']['payment_status']
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payments_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_recruiter_id_fkey'
            columns: ['recruiter_id']
            isOneToOne: false
            referencedRelation: 'recruiters'
            referencedColumns: ['id']
          },
        ]
      }
      payment_provider_events: {
        Row: {
          action_taken: string | null
          attempt_count: number
          error_code: string | null
          event_id: string
          event_type: string
          payment_record_id: string | null
          processing_status: string
          provider: string
          provider_entity_id: string | null
          provider_event_at: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          received_at: string
          requires_manual_review: boolean
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          attempt_count?: number
          error_code?: string | null
          event_id: string
          event_type: string
          payment_record_id?: string | null
          processing_status?: string
          provider?: string
          provider_entity_id?: string | null
          provider_event_at?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          received_at?: string
          requires_manual_review?: boolean
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          attempt_count?: number
          error_code?: string | null
          event_id?: string
          event_type?: string
          payment_record_id?: string | null
          processing_status?: string
          provider?: string
          provider_entity_id?: string | null
          provider_event_at?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          received_at?: string
          requires_manual_review?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_provider_events_payment_record_id_fkey'
            columns: ['payment_record_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
        ]
      }
      recruiters: {
        Row: {
          company_name: string
          company_website: string | null
          created_at: string
          disabled: boolean
          email: string
          id: string
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          name: string
          role: Database['public']['Enums']['recruiter_role']
          user_id: string
        }
        Insert: {
          company_name: string
          company_website?: string | null
          created_at?: string
          disabled?: boolean
          email: string
          id?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          name: string
          role?: Database['public']['Enums']['recruiter_role']
          user_id: string
        }
        Update: {
          company_name?: string
          company_website?: string | null
          created_at?: string
          disabled?: boolean
          email?: string
          id?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          name?: string
          role?: Database['public']['Enums']['recruiter_role']
          user_id?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'saved_jobs_job_id_fkey'
            columns: ['job_id']
            isOneToOne: false
            referencedRelation: 'jobs'
            referencedColumns: ['id']
          },
        ]
      }
      webhook_event_receipts: {
        Row: {
          event_id: string
          event_type: string
          provider: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          provider: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          provider?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_jobs: {
        Row: Database['public']['Tables']['jobs']['Row']
        Relationships: []
      }
    }
    Functions: {
      apply_resend_delivery_event: {
        Args: {
          p_error_message: string | null
          p_event_at: string
          p_event_id: string
          p_event_type: string
          p_message_id: string
          p_recipient_email?: string | null
          p_status: string
          p_suppress_recipient?: boolean
        }
        Returns: Json
      }
      apply_razorpay_lifecycle_event: {
        Args: {
          p_amount: number | null
          p_event_at: string
          p_event_id: string
          p_event_type: string
          p_failure_code: string | null
          p_provider_order_id: string | null
          p_provider_payment_id: string | null
        }
        Returns: Json
      }
      bind_razorpay_order: {
        Args: {
          p_order_id: string
          p_payment_id: string
          p_provisioning_token: string
        }
        Returns: Json
      }
      claim_razorpay_webhook_event: {
        Args: {
          p_event_at: string
          p_event_id: string
          p_event_type: string
          p_provider_entity_id: string | null
          p_provider_order_id: string | null
          p_provider_payment_id: string | null
        }
        Returns: Json
      }
      complete_razorpay_webhook_event: {
        Args: {
          p_action: string
          p_event_id: string
          p_payment_record_id?: string | null
        }
        Returns: undefined
      }
      claim_transactional_email: {
        Args: {
          p_dedupe_key: string
          p_metadata?: Json
          p_recipient_email: string
          p_recipient_role: string
          p_stale_after_seconds?: number
          p_subject: string
          p_trigger_key: string
        }
        Returns: Json
      }
      consume_api_rate_limit: {
        Args: {
          p_key_hash: string
          p_limit: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      can_apply_to_job: {
        Args: { p_job_id: string; p_recruiter_id: string }
        Returns: boolean
      }
      fulfill_razorpay_payment: {
        Args: {
          p_duration_days: number
          p_expected_amount: number
          p_expected_user_id?: string | null
          p_featured: boolean
          p_is_boost: boolean
          p_is_renewal: boolean
          p_listing_duration: Database['public']['Enums']['listing_duration']
          p_listing_tier: Database['public']['Enums']['listing_tier']
          p_order_id: string
          p_payment_id: string
          p_plan: string
        }
        Returns: Json
      }
      fulfill_razorpay_payment_v2: {
        Args: {
          p_expected_user_id?: string | null
          p_order_id: string
          p_paid_at: string
          p_payment_id: string
        }
        Returns: Json
      }
      fail_razorpay_webhook_event: {
        Args: { p_error_code: string; p_event_id: string }
        Returns: undefined
      }
      finish_transactional_email: {
        Args: {
          p_claim_token: string
          p_error_message?: string | null
          p_log_id: string
          p_resend_message_id?: string | null
          p_status: string
        }
        Returns: boolean
      }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_admin_email_analytics: { Args: never; Returns: Json }
      get_admin_email_automation_counts: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_portfolio_slug_available: {
        Args: { p_slug: string }
        Returns: boolean
      }
      get_public_portfolio: { Args: { p_slug: string }; Returns: Json }
      reserve_payment_checkout: {
        Args: {
          p_amount: number
          p_currency: string
          p_expected_user_id: string
          p_job_id: string
          p_payment_kind: Database['public']['Enums']['payment_kind']
          p_plan: Database['public']['Enums']['payment_plan']
          p_recruiter_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      application_status: 'new' | 'reviewed' | 'shortlisted' | 'rejected'
      approval_status: 'pending' | 'approved' | 'rejected'
      campaign_audience:
        | 'subscribers'
        | 'recruiters'
        | 'both'
        | 'candidates'
        | 'newsletter'
        | 'all_marketing'
      subscriber_audience: 'newsletter' | 'candidate' | 'recruiter'
      campaign_status: 'draft' | 'sending' | 'sent' | 'failed'
      delivery_status: 'pending' | 'sent' | 'failed' | 'skipped'
      employment_type: 'full_time' | 'part_time' | 'contract' | 'freelance'
      experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'principal'
      job_source_kind: 'recruiter_posted' | 'linkedin_import'
      job_type:
        | 'developer'
        | 'consultant'
        | 'architect'
        | 'admin'
        | 'analyst'
        | 'manager'
        | 'other'
      listing_duration: 'weekly' | 'monthly'
      listing_tier: 'standard' | 'featured'
      operator_feedback_status: 'new' | 'triaged' | 'done'
      payment_kind: 'initial' | 'renewal' | 'boost'
      payment_plan:
        | 'standard_week'
        | 'standard_month'
        | 'featured_week'
        | 'featured_month'
        | 'standard_week_renew'
        | 'standard_month_renew'
        | 'featured_week_renew'
        | 'featured_month_renew'
      payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded'
      recruiter_role: 'recruiter' | 'admin'
      resume_source: 'none' | 'linkedin_import' | 'manual_admin' | 'user_edit'
      work_mode: 'remote' | 'hybrid' | 'onsite'
      email_template_category: 'transactional' | 'marketing'
      email_template_audience: 'candidates' | 'recruiters' | 'newsletter'
      email_template_shell: 'transactional' | 'marketing'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ['new', 'reviewed', 'shortlisted', 'rejected'],
      approval_status: ['pending', 'approved', 'rejected'],
      campaign_audience: [
        'subscribers',
        'recruiters',
        'both',
        'candidates',
        'newsletter',
        'all_marketing',
      ],
      subscriber_audience: ['newsletter', 'candidate', 'recruiter'],
      campaign_status: ['draft', 'sending', 'sent', 'failed'],
      delivery_status: ['pending', 'sent', 'failed', 'skipped'],
      employment_type: ['full_time', 'part_time', 'contract', 'freelance'],
      experience_level: ['entry', 'mid', 'senior', 'lead', 'principal'],
      job_source_kind: ['recruiter_posted', 'linkedin_import'],
      job_type: [
        'developer',
        'consultant',
        'architect',
        'admin',
        'analyst',
        'manager',
        'other',
      ],
      listing_duration: ['weekly', 'monthly'],
      listing_tier: ['standard', 'featured'],
      operator_feedback_status: ['new', 'triaged', 'done'],
      payment_kind: ['initial', 'renewal', 'boost'],
      payment_plan: [
        'standard_week',
        'standard_month',
        'featured_week',
        'featured_month',
        'standard_week_renew',
        'standard_month_renew',
        'featured_week_renew',
        'featured_month_renew',
      ],
      payment_status: ['unpaid', 'paid', 'failed', 'refunded'],
      recruiter_role: ['recruiter', 'admin'],
      resume_source: ['none', 'linkedin_import', 'manual_admin', 'user_edit'],
      work_mode: ['remote', 'hybrid', 'onsite'],
      email_template_category: ['transactional', 'marketing'],
      email_template_audience: ['candidates', 'recruiters', 'newsletter'],
      email_template_shell: ['transactional', 'marketing'],
    },
  },
} as const

/** App-level role for auth UI (candidates have no `recruiters` row). */
export type UserRole = 'candidate' | 'recruiter' | 'admin'

/** Synthetic profile built from `auth.users` + optional `recruiters` row. */
export type ProfileRow = {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
  /** `public.recruiters.id` when a recruiters row exists; null for candidates or pending recruiter signup. */
  recruiter_row_id?: string | null
}

export type JobRow = Database['public']['Tables']['jobs']['Row']
export type RecruiterRow = Database['public']['Tables']['recruiters']['Row']
export type JobSeekerProfileRow =
  Database['public']['Tables']['job_seeker_profiles']['Row']
