# Greenergy Car Reservation — Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)

## 1. Supabase Setup

1. สร้าง project ใหม่ที่ [supabase.com](https://supabase.com)
2. ไปที่ **SQL Editor** แล้วรัน `supabase/schema.sql`
3. ไปที่ **Storage** → สร้าง bucket ชื่อ `car-images` ตั้งเป็น **Public**
4. ไปที่ **Settings → API** คัดลอก:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Environment Variables

แก้ไขไฟล์ `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-random-secret-here
CRON_SECRET=your-cron-secret-here
```

## 3. Install & Run

```bash
npm install
npm run dev
```

เปิดที่ http://localhost:3000

## 4. Admin Access
- URL: `/admin/login`
- Username: `Greenergy`
- Password: `Greenergy1`

## 5. Cron Job (ลบภาพอายุ > 60 วัน)

ตั้ง cron job ให้เรียก URL นี้ทุกวัน:
```
GET /api/cron/cleanup
Header: x-cron-secret: <CRON_SECRET จาก .env>
```

สามารถใช้ [cron-job.org](https://cron-job.org) หรือ Vercel Cron ได้

## Pages

| URL | คำอธิบาย |
|---|---|
| `/` | หน้าหลัก |
| `/book/outbound` | จองรถขาไป (4 ขั้น) |
| `/book/return` | คืนรถขากลับ |
| `/admin/login` | เข้าสู่ระบบ Admin |
| `/admin/dashboard` | แดชบอร์ดการจอง |
| `/admin/vehicles` | จัดการทะเบียนรถ |
| `/admin/report` | รายงาน + ค่าใช้จ่าย |
