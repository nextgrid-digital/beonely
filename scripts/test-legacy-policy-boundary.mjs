import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const inventory = JSON.parse(
  await readFile(
    new URL('scripts/fixtures/legacy-public-policies.json', root),
    'utf8'
  )
)
const migration = await readFile(
  new URL(
    'supabase/migrations/20260906090000_remove_legacy_permissive_policies.sql',
    root
  ),
  'utf8'
)
const db = new PGlite()
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const quote = (s) => '"' + s.replaceAll('"', '""') + '"'
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.role() returns text language sql stable as $$select current_setting('role',true)$$;
create type recruiter_role as enum ('recruiter','admin');
create type approval_status as enum ('pending','approved','rejected');
create type payment_status as enum ('unpaid','paid','failed');
create type job_source_kind as enum ('recruiter_posted','linkedin_import');
create type application_status as enum ('new','reviewed','rejected');
create table recruiters(id uuid primary key,user_id uuid,role recruiter_role,disabled boolean);
create table jobs(id uuid primary key,recruiter_id uuid,source_kind job_source_kind,approval_status approval_status,payment_status payment_status,listing_expires_at timestamptz,recruiter_email text);
create table applications(id uuid primary key,job_id uuid,recruiter_id uuid,candidate_user_id uuid,status application_status);
create table payments(id uuid primary key,recruiter_id uuid);
create table job_seeker_profiles(id uuid primary key,user_id uuid);
create table email_subscribers(id uuid primary key);
create table email_campaigns(id uuid primary key);
create table email_campaign_recipients(id uuid primary key);
create table operator_feedback(id uuid primary key);
create function is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from recruiters where user_id=auth.uid() and role='admin' and not disabled)$$;
create function can_apply_to_job(p_job_id uuid,p_recruiter_id uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from jobs j join recruiters r on r.id=j.recruiter_id where j.id=p_job_id and j.recruiter_id=p_recruiter_id and j.source_kind='recruiter_posted' and j.approval_status='approved' and j.payment_status='paid' and not r.disabled and (j.listing_expires_at is null or j.listing_expires_at>now()))$$;
grant usage on schema public,auth to anon,authenticated,service_role;
grant all on all tables in schema public to authenticated,service_role;
create view public_jobs with(security_barrier=true) as select j.id,''::text as recruiter_email from jobs j join recruiters r on r.id=j.recruiter_id where j.approval_status='approved' and j.payment_status='paid' and not r.disabled and (j.listing_expires_at is null or j.listing_expires_at>now());
grant select on public_jobs to anon,authenticated,service_role;
insert into recruiters values ('${id(1)}','${id(11)}','recruiter',false),('${id(2)}','${id(12)}','recruiter',false),('${id(3)}','${id(13)}','admin',false),('${id(4)}','${id(14)}','recruiter',true);
insert into jobs values ('${id(21)}','${id(1)}','recruiter_posted','approved','paid',null,'private'),('${id(22)}','${id(2)}','recruiter_posted','approved','paid',null,'private'),('${id(23)}','${id(4)}','recruiter_posted','approved','paid',null,'private');
insert into job_seeker_profiles values ('${id(31)}','${id(41)}'),('${id(32)}','${id(42)}');
insert into applications values ('${id(51)}','${id(21)}','${id(1)}','${id(41)}','new');
insert into payments values ('${id(61)}','${id(1)}'),('${id(62)}','${id(2)}'),('${id(63)}','${id(4)}');
`)
for (const table of new Set(
  inventory.policies
    .filter((p) => p.schemaname === 'public')
    .map((p) => p.tablename)
))
  await db.exec(`alter table ${quote(table)} enable row level security`)
for (const p of inventory.policies.filter((p) => p.schemaname === 'public')) {
  await db.exec(
    `create policy ${quote(p.policyname)} on ${quote(p.tablename)} as ${p.permissive} for ${p.cmd} to ${p.roles.map(quote).join(',')} ${p.qual ? 'using (' + p.qual + ')' : ''} ${p.with_check ? 'with check (' + p.with_check + ')' : ''}`
  )
}
async function session(role, user, sql) {
  await db.exec(
    `set role ${role}; select set_config('request.jwt.claim.sub','${user ?? ''}',false)`
  )
  try {
    return (await db.query(sql)).rows
  } finally {
    await db.exec('reset role')
  }
}
assert.equal(
  (
    await session(
      'authenticated',
      id(41),
      'select count(*)::int as count from jobs'
    )
  )[0].count,
  3,
  'legacy exposure reproduced'
)
assert.equal(
  (
    await session(
      'authenticated',
      id(13),
      'select count(*)::int as count from job_seeker_profiles'
    )
  )[0].count,
  2,
  'legacy admin profile exposure reproduced'
)
await db.exec(migration)
await db.exec(migration)
const checks = []
async function count(label, role, user, table, expected) {
  const actual = (
    await session(role, user, `select count(*)::int as count from ${table}`)
  )[0].count
  assert.equal(actual, expected, label)
  checks.push({ label, passed: true })
}
await count('anonymous public jobs', 'anon', null, 'public_jobs', 2)
await assert.rejects(
  () => session('anon', null, 'select * from jobs'),
  /permission denied/
)
checks.push({ label: 'anonymous base jobs denied', passed: true })
await count('candidate base jobs hidden', 'authenticated', id(41), 'jobs', 0)
await count('recruiter sees own job', 'authenticated', id(11), 'jobs', 1)
await count('other recruiter sees own job', 'authenticated', id(12), 'jobs', 1)
await count(
  'disabled recruiter jobs hidden',
  'authenticated',
  id(14),
  'jobs',
  0
)
await count(
  'admin browser base jobs hidden',
  'authenticated',
  id(13),
  'jobs',
  0
)
await count(
  'candidate sees own profile',
  'authenticated',
  id(41),
  'job_seeker_profiles',
  1
)
await count(
  'admin browser cannot read candidate profiles',
  'authenticated',
  id(13),
  'job_seeker_profiles',
  0
)
await count(
  'candidate sees own application',
  'authenticated',
  id(41),
  'applications',
  1
)
await count(
  'other candidate cannot read application',
  'authenticated',
  id(42),
  'applications',
  0
)
await count(
  'recruiter sees own application',
  'authenticated',
  id(11),
  'applications',
  1
)
await count(
  'admin browser cannot read applications',
  'authenticated',
  id(13),
  'applications',
  0
)
await count(
  'disabled recruiter payments hidden',
  'authenticated',
  id(14),
  'payments',
  0
)
await count(
  'admin browser payments hidden',
  'authenticated',
  id(13),
  'payments',
  0
)
await count('service role retains access', 'service_role', null, 'jobs', 3)
await assert.rejects(
  () =>
    session(
      'authenticated',
      id(13),
      `insert into email_campaigns values ('${id(71)}')`
    ),
  /row-level security/
)
checks.push({ label: 'admin browser cannot create campaigns', passed: true })
await session(
  'authenticated',
  id(42),
  `insert into applications values ('${id(52)}','${id(21)}','${id(1)}','${id(42)}','new')`
)
checks.push({
  label: 'legitimate candidate application still works',
  passed: true,
})
await assert.rejects(
  () =>
    session(
      'authenticated',
      id(42),
      `insert into applications values ('${id(53)}','${id(21)}','${id(1)}','${id(41)}','new')`
    ),
  /row-level security/
)
checks.push({ label: 'candidate impersonation denied', passed: true })
await db.exec('begin; drop policy jobs_owned_select on jobs;')
await assert.rejects(
  () => db.exec(migration),
  /Apply the complete July hardening chain/
)
await db.exec('rollback')
checks.push({
  label: 'incomplete baseline rejected and rolled back',
  passed: true,
})
console.log(
  JSON.stringify({
    passed: checks.length,
    legacyExposureReproduced: true,
    idempotent: true,
  })
)
await db.close()
