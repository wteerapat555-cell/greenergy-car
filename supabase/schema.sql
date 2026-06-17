-- ============================================================
-- Greenergy Car Reservation — Supabase Schema
-- รัน script นี้ใน Supabase SQL Editor ทั้งหมดครั้งเดียว
-- ============================================================

create extension if not exists "pgcrypto";

-- vehicles
create table if not exists vehicles (
  id             uuid primary key default gen_random_uuid(),
  license_plate  text not null unique,
  image_url      text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  last_washed_at timestamptz
);

-- bookings
create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  vehicle_id       uuid not null references vehicles(id) on delete cascade,
  booker_name      text not null,
  booker_phone     text not null,
  booking_date     date not null,
  booking_time     time not null,
  booking_time_end time,
  parking_floor    text,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','returned','cancelled')),
  mileage_out       integer,
  mileage_in        integer,
  fuel_level_return integer,
  return_image_url  text,
  destination       text,
  created_at        timestamptz not null default now(),
  returned_at       timestamptz
);

create index if not exists idx_bookings_date    on bookings(booking_date);
create index if not exists idx_bookings_status  on bookings(status);
create index if not exists idx_bookings_vehicle on bookings(vehicle_id);

alter table vehicles disable row level security;
alter table bookings disable row level security;

-- Storage bucket (ถ้า Supabase Storage ยังไม่มี bucket นี้)
insert into storage.buckets (id, name, public)
values ('car-images', 'car-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read car-images" on storage.objects;
create policy "Public read car-images"
  on storage.objects for select using (bucket_id = 'car-images');

drop policy if exists "Service role upload" on storage.objects;
create policy "Service role upload"
  on storage.objects for insert with check (bucket_id = 'car-images');

drop policy if exists "Service role delete" on storage.objects;
create policy "Service role delete"
  on storage.objects for delete using (bucket_id = 'car-images');

-- Seed vehicles
insert into vehicles (license_plate) values
  ('กข-1234'), ('ขค-5678'), ('คง-9012'), ('งจ-3456'), ('2พพ-1111')
on conflict (license_plate) do nothing;
