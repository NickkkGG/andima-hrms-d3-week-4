-- Cover the correction-table foreign keys used by attendance detail and HR review.
create index if not exists d3_attendance_corrections_attendance_id_idx
  on public.d3_attendance_corrections (attendance_id);

create index if not exists d3_attendance_corrections_reviewed_by_b2_register_id_idx
  on public.d3_attendance_corrections (reviewed_by_b2_register_id)
  where reviewed_by_b2_register_id is not null;
