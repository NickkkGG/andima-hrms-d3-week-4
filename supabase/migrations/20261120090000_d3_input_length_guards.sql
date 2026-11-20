-- Input length guards for D3 tables.
--
-- The frontend and server actions already cap these fields, but Supabase can be
-- called directly with the public key and a signed-in session, so the database
-- is the last line of defence against oversized payloads (for example a
-- multi-megabyte "title" that the audit trigger would copy again into jsonb).
--
-- Every constraint is NOT VALID: existing rows are not re-checked, so this
-- migration cannot fail on legacy data, while every new insert or update must
-- respect the limit. Limits match utils/feedback-reward-rules.ts and the forms.
-- Ticket tables already have CHECK constraints from 20260927153229.
begin;

-- Feedback & Reward
alter table public.d3_employee_feedback
  drop constraint if exists d3_feedback_title_length,
  drop constraint if exists d3_feedback_text_length,
  drop constraint if exists d3_feedback_follow_up_length,
  drop constraint if exists d3_feedback_progress_note_length;
alter table public.d3_employee_feedback
  add constraint d3_feedback_title_length check (char_length(title) <= 120) not valid,
  add constraint d3_feedback_text_length check (char_length(feedback_text) <= 2000) not valid,
  add constraint d3_feedback_follow_up_length check (follow_up_text is null or char_length(follow_up_text) <= 1000) not valid,
  add constraint d3_feedback_progress_note_length check (progress_note is null or char_length(progress_note) <= 1000) not valid;

alter table public.d3_employee_rewards
  drop constraint if exists d3_reward_title_length,
  drop constraint if exists d3_reward_name_length,
  drop constraint if exists d3_reward_description_length,
  drop constraint if exists d3_reward_reason_length,
  drop constraint if exists d3_reward_approval_reason_length,
  drop constraint if exists d3_reward_evidence_path_length;
alter table public.d3_employee_rewards
  add constraint d3_reward_title_length check (char_length(title) <= 120) not valid,
  add constraint d3_reward_name_length check (reward_name is null or char_length(reward_name) <= 120) not valid,
  add constraint d3_reward_description_length check (description is null or char_length(description) <= 2000) not valid,
  add constraint d3_reward_reason_length check (char_length(reason) <= 2000) not valid,
  add constraint d3_reward_approval_reason_length check (approval_reason is null or char_length(approval_reason) <= 500) not valid,
  add constraint d3_reward_evidence_path_length check (evidence_path is null or char_length(evidence_path) <= 300) not valid;

-- Attendance
alter table public.d3_attendances
  drop constraint if exists d3_attendance_notes_length;
alter table public.d3_attendances
  add constraint d3_attendance_notes_length check (notes is null or char_length(notes) <= 500) not valid;

alter table public.d3_attendance_corrections
  drop constraint if exists d3_attendance_correction_reason_length;
alter table public.d3_attendance_corrections
  add constraint d3_attendance_correction_reason_length check (reason is null or char_length(reason) <= 1000) not valid;

alter table public.d3_attendance_closings
  drop constraint if exists d3_attendance_closing_reason_length;
alter table public.d3_attendance_closings
  add constraint d3_attendance_closing_reason_length check (reason is null or char_length(reason) <= 500) not valid;

-- Face biometric: each account writes only its own template, but the jsonb
-- columns had no size cap. 1 MB is far above a real template (18 descriptors).
alter table public.d3_face_biometric_templates
  drop constraint if exists d3_face_template_descriptors_size,
  drop constraint if exists d3_face_template_quality_size;
alter table public.d3_face_biometric_templates
  add constraint d3_face_template_descriptors_size check (pg_column_size(descriptors) <= 1048576) not valid,
  add constraint d3_face_template_quality_size check (pg_column_size(enrollment_quality) <= 16384) not valid;

-- Ticket attachments: enforce the 5 MB image-only rule at the bucket, not only
-- in the browser.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'd3-ticket-attachments';

commit;
