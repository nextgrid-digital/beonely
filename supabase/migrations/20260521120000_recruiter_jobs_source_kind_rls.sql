-- Recruiters may only read/update/delete their own recruiter_posted jobs.
-- LinkedIn imports remain visible via "Approved paid jobs are public" and admin only for edits.

DROP POLICY IF EXISTS "Recruiters can read own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can update unpaid or pending own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Recruiters can delete own unapproved jobs" ON public.jobs;

CREATE POLICY "Recruiters can read own jobs"
ON public.jobs FOR SELECT
USING (
  public.is_admin ()
  OR (
    source_kind = 'recruiter_posted'
    AND recruiter_id IN (
      SELECT recruiters.id
      FROM public.recruiters
      WHERE recruiters.user_id = auth.uid ()
    )
  )
);

CREATE POLICY "Recruiters can update unpaid or pending own jobs"
ON public.jobs FOR UPDATE
TO authenticated
USING (
  public.is_admin ()
  OR (
    source_kind = 'recruiter_posted'
    AND recruiter_id IN (
      SELECT recruiters.id
      FROM public.recruiters
      WHERE
        recruiters.user_id = auth.uid ()
        AND recruiters.disabled = false
    )
    AND approval_status <> 'approved'
  )
)
WITH CHECK (
  public.is_admin ()
  OR (
    source_kind = 'recruiter_posted'
    AND recruiter_id IN (
      SELECT recruiters.id
      FROM public.recruiters
      WHERE
        recruiters.user_id = auth.uid ()
        AND recruiters.disabled = false
    )
  )
);

CREATE POLICY "Recruiters can delete own unapproved jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (
  public.is_admin ()
  OR (
    source_kind = 'recruiter_posted'
    AND recruiter_id IN (
      SELECT recruiters.id
      FROM public.recruiters
      WHERE
        recruiters.user_id = auth.uid ()
        AND recruiters.disabled = false
    )
    AND approval_status <> 'approved'
  )
);
