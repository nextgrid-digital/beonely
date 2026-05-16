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
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          campaign_id: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          recipient_email: string
          recipient_role: string
          resend_message_id: string | null
          status: string
          subject: string | null
          trigger_key: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email: string
          recipient_role?: string
          resend_message_id?: string | null
          status?: string
          subject?: string | null
          trigger_key?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          recipient_email?: string
          recipient_role?: string
          resend_message_id?: string | null
          status?: string
          subject?: string | null
          trigger_key?: string | null
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
          source?: string
          unsubscribe_token?: string
          unsubscribed_at?: string | null
          updated_at?: string
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
          portfolio_url: string | null
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
          portfolio_url?: string | null
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
          portfolio_url?: string | null
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
          created_at: string
          currency: string
          id: string
          job_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          recruiter_id: string
          status: Database['public']['Enums']['payment_status']
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          job_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recruiter_id: string
          status?: Database['public']['Enums']['payment_status']
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          job_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          recruiter_id?: string
          status?: Database['public']['Enums']['payment_status']
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
      payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded'
      recruiter_role: 'recruiter' | 'admin'
      resume_source: 'none' | 'linkedin_import' | 'manual_admin' | 'user_edit'
      work_mode: 'remote' | 'hybrid' | 'onsite'
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
      payment_status: ['unpaid', 'paid', 'failed', 'refunded'],
      recruiter_role: ['recruiter', 'admin'],
      resume_source: ['none', 'linkedin_import', 'manual_admin', 'user_edit'],
      work_mode: ['remote', 'hybrid', 'onsite'],
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
