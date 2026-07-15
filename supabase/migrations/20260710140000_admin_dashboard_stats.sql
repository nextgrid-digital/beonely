-- Admin read surfaces and one bounded aggregate RPC for the control center.

DROP POLICY IF EXISTS email_campaigns_admin_select ON public.email_campaigns;
CREATE POLICY email_campaigns_admin_select
ON public.email_campaigns FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS email_campaign_recipients_admin_select ON public.email_campaign_recipients;
CREATE POLICY email_campaign_recipients_admin_select
ON public.email_campaign_recipients FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS email_subscribers_admin_select ON public.email_subscribers;
CREATE POLICY email_subscribers_admin_select
ON public.email_subscribers FOR SELECT TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS email_templates_admin_select ON public.email_templates;
CREATE POLICY email_templates_admin_select
ON public.email_templates FOR SELECT TO authenticated
USING (public.is_admin());

GRANT SELECT ON public.email_campaigns TO authenticated;
GRANT SELECT ON public.email_campaign_recipients TO authenticated;
GRANT SELECT ON public.email_subscribers TO authenticated;
GRANT SELECT ON public.email_templates TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'revenue_all_time_inr', COALESCE((
      SELECT SUM(p.amount) / 100.0
      FROM public.payments AS p
      WHERE p.status = 'paid' AND UPPER(p.currency) = 'INR'
    ), 0),
    'revenue_30d_inr', COALESCE((
      SELECT SUM(p.amount) / 100.0
      FROM public.payments AS p
      WHERE p.status = 'paid'
        AND UPPER(p.currency) = 'INR'
        AND p.created_at >= now() - interval '30 days'
    ), 0),
    'pending_moderation', (
      SELECT COUNT(*)
      FROM public.jobs AS j
      WHERE j.approval_status = 'pending'
        AND (j.payment_status = 'paid' OR j.source_kind = 'linkedin_import')
    ),
    'active_listings', (
      SELECT COUNT(*)
      FROM public.jobs AS j
      WHERE j.approval_status = 'approved'
        AND j.payment_status = 'paid'
        AND (j.listing_expires_at IS NULL OR j.listing_expires_at > now())
    ),
    'recruiter_count', (SELECT COUNT(*) FROM public.recruiters),
    'candidate_count', (SELECT COUNT(*) FROM public.job_seeker_profiles),
    'campaigns_needing_attention', (
      SELECT COUNT(*)
      FROM public.email_campaigns AS c
      WHERE c.status IN ('sending', 'failed')
    ),
    'email_failures_7d', (
      SELECT COUNT(*)
      FROM public.email_send_log AS l
      WHERE l.status IN ('failed', 'bounced', 'complained')
        AND l.created_at >= now() - interval '7 days'
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_email_analytics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  since_at TIMESTAMPTZ := now() - interval '30 days';
  result JSONB;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'transactional_30d', (
        SELECT COUNT(*) FROM public.email_send_log WHERE created_at >= since_at
      ),
      'campaigns_total', (SELECT COUNT(*) FROM public.email_campaigns),
      'campaign_recipients_30d', (
        SELECT COUNT(*) FROM public.email_campaign_recipients WHERE created_at >= since_at
      )
    ),
    'by_trigger', COALESCE((
      SELECT jsonb_object_agg(group_key, group_count)
      FROM (
        SELECT COALESCE(trigger_key, 'manual') AS group_key, COUNT(*) AS group_count
        FROM public.email_send_log
        WHERE created_at >= since_at
        GROUP BY COALESCE(trigger_key, 'manual')
      ) AS grouped
    ), '{}'::jsonb),
    'by_status', COALESCE((
      SELECT jsonb_object_agg(group_key, group_count)
      FROM (
        SELECT status AS group_key, COUNT(*) AS group_count
        FROM public.email_send_log
        WHERE created_at >= since_at
        GROUP BY status
      ) AS grouped
    ), '{}'::jsonb),
    'by_day', COALESCE((
      SELECT jsonb_object_agg(group_key, group_count)
      FROM (
        SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS group_key,
               COUNT(*) AS group_count
        FROM public.email_send_log
        WHERE created_at >= since_at
        GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
      ) AS grouped
    ), '{}'::jsonb),
    'campaign_delivery', COALESCE((
      SELECT jsonb_object_agg(group_key, group_count)
      FROM (
        SELECT delivery_status::TEXT AS group_key, COUNT(*) AS group_count
        FROM public.email_campaign_recipients
        WHERE created_at >= since_at
        GROUP BY delivery_status
      ) AS grouped
    ), '{}'::jsonb),
    'recent_sends', COALESCE((
      SELECT jsonb_agg(to_jsonb(recent) ORDER BY recent.created_at DESC)
      FROM (
        SELECT id, trigger_key, campaign_id, recipient_email, recipient_role,
               subject, resend_message_id, status, error_message, created_at
        FROM public.email_send_log
        ORDER BY created_at DESC
        LIMIT 20
      ) AS recent
    ), '[]'::jsonb),
    'campaigns', COALESCE((
      SELECT jsonb_agg(to_jsonb(recent_campaign) ORDER BY recent_campaign.created_at DESC)
      FROM (
        SELECT id, status, subject, sent_at, created_at
        FROM public.email_campaigns
        ORDER BY created_at DESC
        LIMIT 100
      ) AS recent_campaign
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_email_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_email_analytics() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_admin_email_automation_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF COALESCE((SELECT auth.role()), '') <> 'service_role'
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_object_agg(
    trigger_key,
    jsonb_build_object('sent', sent_count, 'failed', failed_count)
  ), '{}'::jsonb)
  INTO result
  FROM (
    SELECT
      trigger_key,
      COUNT(*) FILTER (
        WHERE status IN ('sent', 'delivered')
      ) AS sent_count,
      COUNT(*) FILTER (
        WHERE status IN ('failed', 'bounced', 'complained')
      ) AS failed_count
    FROM public.email_send_log
    WHERE created_at >= now() - interval '7 days'
      AND trigger_key IS NOT NULL
    GROUP BY trigger_key
  ) AS grouped;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_email_automation_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_email_automation_counts() TO authenticated, service_role;
