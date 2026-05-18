-- Email template library for admin marketing campaigns + read-only transactional previews.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_template_category') THEN
    CREATE TYPE public.email_template_category AS ENUM ('transactional', 'marketing');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_template_audience') THEN
    CREATE TYPE public.email_template_audience AS ENUM (
      'candidates',
      'recruiters',
      'newsletter'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_template_shell') THEN
    CREATE TYPE public.email_template_shell AS ENUM ('transactional', 'marketing');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category public.email_template_category NOT NULL,
  audience public.email_template_audience,
  trigger_key TEXT,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  shell public.email_template_shell NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT email_templates_marketing_audience_chk CHECK (
    category <> 'marketing' OR audience IS NOT NULL
  ),
  CONSTRAINT email_templates_transactional_audience_chk CHECK (
    category <> 'transactional' OR audience IS NULL
  )
);

CREATE INDEX IF NOT EXISTS email_templates_category_audience_idx
ON public.email_templates (category, audience);

ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.email_templates (id) ON DELETE SET NULL;

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Seeds: transactional (read-only in admin UI)
INSERT INTO public.email_templates (
  slug, name, category, audience, trigger_key, subject, preview_text, body_html, shell, is_system
) VALUES
  (
    'tx-candidate-signup',
    'Candidate signup',
    'transactional',
    NULL,
    'candidate_signup',
    'Welcome to Beonely',
    NULL,
    '<p>Hi Alex, thanks for joining Beonely.</p><p>Complete your profile to apply to ServiceNow roles and get matched with hiring teams.</p>',
    'transactional',
    true
  ),
  (
    'tx-recruiter-signup',
    'Recruiter signup',
    'transactional',
    NULL,
    'recruiter_signup',
    'Welcome to Beonely for recruiters',
    NULL,
    '<p>Thanks for signing up on behalf of Acme Corp.</p><p>Post a paid listing when you are ready to reach ServiceNow talent on Beonely.</p>',
    'transactional',
    true
  ),
  (
    'tx-job-submitted',
    'Job submitted (recruiter)',
    'transactional',
    NULL,
    'job_submitted',
    'Listing submitted — Senior ServiceNow Developer',
    NULL,
    '<p>Senior ServiceNow Developer at Acme Corp is submitted for review.</p><p>Our team will approve eligible paid listings shortly.</p>',
    'transactional',
    true
  ),
  (
    'tx-job-approved',
    'Job approved (recruiter)',
    'transactional',
    NULL,
    'job_approved',
    'Beonely — "Senior ServiceNow Developer" is live',
    NULL,
    '<p>Good news — Senior ServiceNow Developer at Acme Corp is now live on Beonely.</p><p>Share the link with candidates from your recruiter dashboard.</p>',
    'transactional',
    true
  ),
  (
    'tx-job-rejected',
    'Job rejected (recruiter)',
    'transactional',
    NULL,
    'job_rejected',
    'Beonely — update on "Senior ServiceNow Developer"',
    NULL,
    '<p>We could not approve Senior ServiceNow Developer at Acme Corp for the public job board.</p><p>Reason: Please add more detail about required modules.</p>',
    'transactional',
    true
  ),
  (
    'tx-application-received',
    'Application received (recruiter)',
    'transactional',
    NULL,
    'application_received',
    'New application — Senior ServiceNow Developer',
    NULL,
    '<p>Alex Candidate applied to Senior ServiceNow Developer on Beonely.</p><p>Review applications in your recruiter dashboard.</p>',
    'transactional',
    true
  ),
  (
    'tx-application-confirmation',
    'Application confirmation (candidate)',
    'transactional',
    NULL,
    'application_confirmation',
    'Application sent — Senior ServiceNow Developer',
    NULL,
    '<p>Your application to Senior ServiceNow Developer at Acme Corp was submitted successfully.</p><p>The hiring team will review your profile on Beonely.</p>',
    'transactional',
    true
  )
ON CONFLICT (slug) DO NOTHING;

-- Seeds: marketing (editable)
INSERT INTO public.email_templates (
  slug, name, category, audience, trigger_key, subject, preview_text, body_html, shell, is_system
) VALUES
  (
    'mk-candidate-new-roles',
    'New roles this week',
    'marketing',
    'candidates',
    NULL,
    'New ServiceNow roles on Beonely',
    'Fresh listings matched to your profile',
    '<h2 style="margin:0 0 12px;font-size:18px;">New roles this week</h2><p>We added new ServiceNow opportunities. Update your profile and apply in one click.</p><p><a href="{{site_url}}/jobs">Browse open roles</a></p>',
    'marketing',
    true
  ),
  (
    'mk-candidate-complete-profile',
    'Complete your profile',
    'marketing',
    'candidates',
    NULL,
    'Finish your Beonely profile',
    'Recruiters see stronger profiles first',
    '<h2 style="margin:0 0 12px;font-size:18px;">Complete your profile</h2><p>Add experience, modules, and location so recruiters can find you faster.</p><p><a href="{{site_url}}/candidate/profile">Open your profile</a></p>',
    'marketing',
    true
  ),
  (
    'mk-candidate-application-tips',
    'Application tips',
    'marketing',
    'candidates',
    NULL,
    'Tips for stronger applications',
    'Stand out on ServiceNow roles',
    '<h2 style="margin:0 0 12px;font-size:18px;">Application tips</h2><p>Tailor your resume to the modules in the job description and highlight relevant implementations.</p>',
    'marketing',
    true
  ),
  (
    'mk-recruiter-more-applicants',
    'Drive more applicants',
    'marketing',
    'recruiters',
    NULL,
    'Get more applicants on Beonely',
    'Optimize your listing for candidates',
    '<h2 style="margin:0 0 12px;font-size:18px;">Drive more applicants</h2><p>Use a clear title, module keywords, and work mode so your role appears in more searches.</p><p><a href="{{site_url}}/recruiter">Manage listings</a></p>',
    'marketing',
    true
  ),
  (
    'mk-recruiter-listing-live',
    'Listing approved reminder',
    'marketing',
    'recruiters',
    NULL,
    'Your listing is live',
    'Share your job page with candidates',
    '<h2 style="margin:0 0 12px;font-size:18px;">Your listing is live</h2><p>Your approved job is on the public board. Share the link on LinkedIn and with your network.</p>',
    'marketing',
    true
  ),
  (
    'mk-recruiter-hiring-on-beonely',
    'Hiring on Beonely',
    'marketing',
    'recruiters',
    NULL,
    'Hire ServiceNow talent on Beonely',
    'Paid listings reach opted-in candidates',
    '<h2 style="margin:0 0 12px;font-size:18px;">Hiring on Beonely</h2><p>Post a paid listing to reach candidates who opted in to hiring updates from Beonely.</p>',
    'marketing',
    true
  ),
  (
    'mk-newsletter-product-update',
    'Product update',
    'marketing',
    'newsletter',
    NULL,
    'What''s new on Beonely',
    'Platform updates for the community',
    '<h2 style="margin:0 0 12px;font-size:18px;">Product update</h2><p>We shipped improvements to job search, applications, and recruiter tools. Thanks for being part of Beonely.</p>',
    'marketing',
    true
  ),
  (
    'mk-newsletter-community-roundup',
    'Community roundup',
    'marketing',
    'newsletter',
    NULL,
    'Beonely community roundup',
    'Highlights from the ServiceNow hiring community',
    '<h2 style="margin:0 0 12px;font-size:18px;">Community roundup</h2><p>Featured roles, hiring trends, and tips for candidates and recruiters using Beonely.</p>',
    'marketing',
    true
  ),
  (
    'mk-newsletter-announcement',
    'Announcement',
    'marketing',
    'newsletter',
    NULL,
    'An announcement from Beonely',
    'Important update from the team',
    '<h2 style="margin:0 0 12px;font-size:18px;">Announcement</h2><p>We have news to share with the Beonely community. Read the full update on our site.</p>',
    'marketing',
    true
  )
ON CONFLICT (slug) DO NOTHING;
