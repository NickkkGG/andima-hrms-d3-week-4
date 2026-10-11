-- Lokasi hanya diambil saat pegawai menekan tombol clock-in atau clock-out.
-- Kolom nullable agar riwayat presensi lama tetap valid dan tidak diubah.
alter table public.d3_attendances
  add column if not exists clock_in_latitude numeric(9, 6),
  add column if not exists clock_in_longitude numeric(9, 6),
  add column if not exists clock_in_accuracy_meters numeric(8, 2),
  add column if not exists clock_out_latitude numeric(9, 6),
  add column if not exists clock_out_longitude numeric(9, 6),
  add column if not exists clock_out_accuracy_meters numeric(8, 2);

alter table public.d3_attendances
  drop constraint if exists d3_attendances_clock_in_coordinate_pair,
  drop constraint if exists d3_attendances_clock_out_coordinate_pair,
  drop constraint if exists d3_attendances_clock_in_coordinate_range,
  drop constraint if exists d3_attendances_clock_out_coordinate_range;

alter table public.d3_attendances
  add constraint d3_attendances_clock_in_coordinate_pair
    check (
      (clock_in_latitude is null and clock_in_longitude is null)
      or (clock_in_latitude is not null and clock_in_longitude is not null)
    ),
  add constraint d3_attendances_clock_out_coordinate_pair
    check (
      (clock_out_latitude is null and clock_out_longitude is null)
      or (clock_out_latitude is not null and clock_out_longitude is not null)
    ),
  add constraint d3_attendances_clock_in_coordinate_range
    check (
      (clock_in_latitude is null or clock_in_latitude between -90 and 90)
      and (clock_in_longitude is null or clock_in_longitude between -180 and 180)
      and (clock_in_accuracy_meters is null or clock_in_accuracy_meters >= 0)
    ),
  add constraint d3_attendances_clock_out_coordinate_range
    check (
      (clock_out_latitude is null or clock_out_latitude between -90 and 90)
      and (clock_out_longitude is null or clock_out_longitude between -180 and 180)
      and (clock_out_accuracy_meters is null or clock_out_accuracy_meters >= 0)
    );

comment on column public.d3_attendances.clock_in_latitude is
  'Latitude yang diberikan perangkat saat employee menekan clock-in.';
comment on column public.d3_attendances.clock_in_longitude is
  'Longitude yang diberikan perangkat saat employee menekan clock-in.';
comment on column public.d3_attendances.clock_out_latitude is
  'Latitude yang diberikan perangkat saat employee menekan clock-out.';
comment on column public.d3_attendances.clock_out_longitude is
  'Longitude yang diberikan perangkat saat employee menekan clock-out.';
