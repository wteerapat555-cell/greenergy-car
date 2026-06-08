# คู่มือ Deploy Greenergy Car Reservation ออนไลน์

## ภาพรวม
- **Frontend + API** → Vercel (ฟรี)
- **Database + Storage** → Supabase (ฟรี)
- ใช้เวลาประมาณ 20-30 นาที

---

## ขั้นตอนที่ 1: สร้าง Supabase Project

1. ไปที่ https://supabase.com → Sign Up / Login (ใช้ GitHub ได้)
2. คลิก **New Project**
3. ตั้งค่า:
   - Name: `greenergy-car`
   - Database Password: ตั้งรหัสผ่านแข็งแรง (จดเก็บไว้)
   - Region: **Southeast Asia (Singapore)**
4. รอสักครู่ให้ project พร้อม (~1-2 นาที)

### รัน Schema

5. ไปที่ **SQL Editor** (เมนูซ้าย)
6. คลิก **New query**
7. Copy ทั้งหมดจากไฟล์ `supabase/schema.sql` วางแล้วกด **Run**

### เก็บ Credentials

8. ไปที่ **Project Settings → API**
9. จด:
   - `Project URL` (รูปแบบ https://xxxx.supabase.co)
   - `anon public` key
   - `service_role` key (secret — ห้ามเผยแพร่)

---

## ขั้นตอนที่ 2: Push Code ขึ้น GitHub

```bash
# เปิด Git Bash หรือ Terminal ที่โฟลเดอร์ greenergy-car
git init
git add .
git commit -m "initial commit"
```

จากนั้น:
1. ไปที่ https://github.com → New repository
2. ตั้งชื่อ `greenergy-car` → Create repository
3. Copy คำสั่ง push ที่ GitHub ให้แล้วรัน เช่น:
```bash
git remote add origin https://github.com/USERNAME/greenergy-car.git
git branch -M main
git push -u origin main
```

---

## ขั้นตอนที่ 3: Deploy บน Vercel

1. ไปที่ https://vercel.com → Sign Up / Login (ใช้ GitHub)
2. คลิก **Add New → Project**
3. เลือก repository `greenergy-car` จาก GitHub → **Import**
4. Framework Preset: **Next.js** (ตรวจจับอัตโนมัติ)

### ตั้งค่า Environment Variables

5. กดที่ **Environment Variables** แล้วเพิ่มทีละตัว:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGci... (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGci... (service_role key) |
| `JWT_SECRET` | ใส่ตัวอักษรสุ่มอย่างน้อย 32 ตัว เช่น greenergy-prod-secret-2026-xk9mq |
| `CRON_SECRET` | ใส่ตัวอักษรสุ่ม เช่น cron-secret-abc123 |

6. คลิก **Deploy** → รอ 2-3 นาที

7. เมื่อ build สำเร็จ จะได้ URL เช่น `https://greenergy-car.vercel.app`

---

## ขั้นตอนที่ 4: ทดสอบระบบ

เปิด URL ที่ได้จาก Vercel แล้วทดสอบ:
- [ ] หน้าแรกโหลดได้ แสดง Dashboard Status
- [ ] จองรถ (ขาไป) ได้สำเร็จ
- [ ] Admin login ด้วย `Greenergy` / `Greenergy1`
- [ ] Admin Dashboard แสดงข้อมูล
- [ ] เพิ่มรถใหม่ได้
- [ ] คืนรถพร้อมอัปโหลดภาพ

---

## หมายเหตุสำคัญ

### Admin Credentials
- Username: `Greenergy`
- Password: `Greenergy1`
- **แนะนำให้เปลี่ยนรหัสผ่านหลัง deploy** (แก้ใน `src/app/api/auth/login/route.ts`)

### Supabase Free Tier Limits
- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 5 GB/month
- เพียงพอสำหรับการใช้งานในองค์กรขนาดเล็ก

### อัปเดต Code ในอนาคต
```bash
git add .
git commit -m "update"
git push
```
Vercel จะ deploy ใหม่อัตโนมัติ

---

## แก้ปัญหาที่พบบ่อย

### Build Error: "Cannot find module fs"
ไม่มี — localDb ถูก wrap ด้วย isSupabaseReady() แล้ว

### Upload ภาพไม่ได้
ตรวจสอบว่า Storage bucket `car-images` ถูกสร้างแล้ว (รัน schema.sql ครบ)

### หน้าว่างหลัง login
ตรวจสอบ JWT_SECRET ใน Vercel environment variables

### ข้อมูลเก่าหายไป
ข้อมูล local (data/db.json) ไม่ sync กับ Supabase — ต้องกรอกข้อมูลใหม่ใน Supabase
