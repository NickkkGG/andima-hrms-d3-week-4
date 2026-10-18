-- Attendance timestamps are stored as timestamptz (UTC internally) and shown as WIB.
-- Older correction requests were submitted without a timezone offset, so their
-- intended WIB values were previously stored as if they were UTC. Normalize them.

update public.d3_attendance_corrections
set proposed_clock_in = proposed_clock_in - interval '7 hours'
where proposed_clock_in is not null;

update public.d3_attendance_corrections
set proposed_clock_out = proposed_clock_out - interval '7 hours'
where proposed_clock_out is not null;

with latest_approved as (
  select distinct on (attendance_id)
    attendance_id,
    correction_type,
    proposed_clock_in,
    proposed_clock_out
  from public.d3_attendance_corrections
  where status = 'APPROVED'
  order by attendance_id, created_at desc
)
update public.d3_attendances as attendance
set
  clock_in = case
    when latest.correction_type in ('CLOCK_IN', 'FULL_DAY')
      and latest.proposed_clock_in is not null
      then latest.proposed_clock_in
    else attendance.clock_in
  end,
  clock_out = case
    when latest.correction_type in ('CLOCK_OUT', 'FULL_DAY')
      and latest.proposed_clock_out is not null
      then latest.proposed_clock_out
    else attendance.clock_out
  end
from latest_approved as latest
where attendance.id = latest.attendance_id
  and (
    (latest.correction_type in ('CLOCK_IN', 'FULL_DAY') and latest.proposed_clock_in is not null)
    or (latest.correction_type in ('CLOCK_OUT', 'FULL_DAY') and latest.proposed_clock_out is not null)
  );
