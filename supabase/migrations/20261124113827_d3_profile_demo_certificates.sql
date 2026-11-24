-- Adds the optional, app-hosted document link used by employee profile certification cards.
-- The existing view keeps invoker security so its underlying certification RLS policy remains active.

alter table public.d3_employee_certifications
  add column if not exists document_url text;

alter table public.d3_employee_certifications
  drop constraint if exists d3_employee_certifications_document_url_check;

alter table public.d3_employee_certifications
  add constraint d3_employee_certifications_document_url_check
  check (document_url is null or document_url ~ '^/certificates/[A-Za-z0-9._/-]+$') not valid;

create or replace view public.view_employee_certifications
with (security_invoker = true)
as
select
  ec.id,
  ec.employee_id,
  ec.title,
  ec.issuing_organization,
  ec.issue_date,
  ec.expiry_date,
  ec.credential_id,
  ec.created_at,
  case
    when ec.expiry_date is null then 'VALID'::text
    when ec.expiry_date < current_date then 'EXPIRED'::text
    when ec.expiry_date <= (current_date + interval '60 days') then 'EXPIRING'::text
    else 'VALID'::text
  end as status,
  ec.document_url
from public.d3_employee_certifications ec;
