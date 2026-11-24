-- Presentation-only fixture for the Employee Profile 360° demo.
-- Safe to rerun: each certificate, attendance row, and reward is inserted once.

begin;

do $$
declare
  target_employee_id uuid;
  target_b2_register_id uuid;
begin
  select source.employee_id, registration.id
    into target_employee_id, target_b2_register_id
  from public.b2_register registration
  join public.d3_b2_employee_sources source on source.b2_register_id = registration.id
  where registration.employee_id = 'HCC-HR-MGR-003';

  if target_employee_id is null or target_b2_register_id is null then
    raise exception 'Demo employee HCC-HR-MGR-003 is not mapped between B2 and D3.';
  end if;

  insert into public.d3_employee_certifications (
    employee_id,
    title,
    issuing_organization,
    issue_date,
    expiry_date,
    credential_id,
    document_url
  )
  select
    target_employee_id,
    certificate.title,
    certificate.issuing_organization,
    certificate.issue_date,
    null,
    certificate.credential_id,
    certificate.document_url
  from (
    values
      ('Bagi Berkat / Bakti Sosial', 'Senat Mahasiswa FTI UAJY', date '2024-12-01', '1246.34/SF-FTI/2024', '/certificates/portfolio/bagi-berkat-bakti-sosial.jpg'),
      ('Green Action #13 — Roots of Change: Planting for the Future', 'Senat Mahasiswa FTI UAJY', date '2025-05-03', '497.25/SF-FTI/2025', '/certificates/portfolio/green-action-13.jpg'),
      ('Sparkfest #13 — The Wheel of Time: Hope and Fear', 'SEMA FTI UAJY', date '2025-05-24', '1036.123/SF-FTI/2025', '/certificates/portfolio/sparkfest-13.pdf'),
      ('Sparkfest #14 — Spark of Motion: Moving in Harmony Towards the Future', 'SEMA FTI UAJY', date '2026-05-23', '535.79/SF-FTI/2026', '/certificates/portfolio/sparkfest-14.pdf'),
      ('MUNAS VII APTIKOM 2026', 'APTIKOM', date '2026-10-10', '1072.54/SF-FTI/2026', '/certificates/portfolio/munas-vii-aptikom-2026.pdf')
  ) as certificate(title, issuing_organization, issue_date, credential_id, document_url)
  where not exists (
    select 1
    from public.d3_employee_certifications existing
    where existing.employee_id = target_employee_id
      and existing.credential_id = certificate.credential_id
  );

  insert into public.d3_attendances (
    b2_register_id,
    date,
    clock_in,
    clock_out,
    status,
    notes
  )
  select
    target_b2_register_id,
    date '2026-11-24',
    timestamptz '2026-11-24 08:00:00+07',
    timestamptz '2026-11-24 17:00:00+07',
    'PRESENT',
    '[DEMO D3-002] Face biometric attendance — Employee Profile 360° presentation.'
  where not exists (
    select 1
    from public.d3_attendances existing
    where existing.b2_register_id = target_b2_register_id
      and existing.date = date '2026-11-24'
  );

  insert into public.d3_employee_rewards (
    employee_id,
    reward_name,
    date,
    description,
    reward_type,
    title,
    reason,
    status,
    visibility,
    approval_reason,
    approved_at,
    evidence_path,
    is_legacy
  )
  select
    target_employee_id,
    '[DEMO] Apresiasi kontribusi sertifikasi',
    date '2026-11-24',
    '[DEMO] Data reward untuk presentasi Employee Profile 360°.',
    'SPECIAL_CONTRIBUTION',
    '[DEMO] Apresiasi kontribusi sertifikasi',
    '[DEMO] Data reward untuk presentasi Employee Profile 360°.',
    'PUBLISHED',
    'PUBLIC',
    '[DEMO] Reward disiapkan khusus untuk presentasi.',
    timestamptz '2026-11-24 09:00:00+07',
    '/certificates/portfolio/munas-vii-aptikom-2026.pdf',
    false
  where not exists (
    select 1
    from public.d3_employee_rewards existing
    where existing.employee_id = target_employee_id
      and existing.title = '[DEMO] Apresiasi kontribusi sertifikasi'
      and existing.date = date '2026-11-24'
  );
end $$;

commit;
