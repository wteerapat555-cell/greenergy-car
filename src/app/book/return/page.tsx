"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatThaiDate } from "@/lib/utils";
import type { Booking } from "@/types";

export default function ReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    booking_id: "",
    mileage_out: "",
    mileage_in: "",
    parking_floor: "",
    return_image_url: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedBooking = bookings.find((b) => b.id === form.booking_id);

  useEffect(() => {
    fetch("/api/bookings?status=confirmed,pending")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setBookings(data.bookings || []))
      .catch(() => toast.error("โหลดข้อมูลการจองไม่สำเร็จ"))
      .finally(() => setLoadingBookings(false));
  }, []);

  // Auto-fill mileage_out and parking_floor from selected booking when available
  useEffect(() => {
    if (!selectedBooking) return;
    setForm((f) => ({
      ...f,
      mileage_out: selectedBooking.mileage_out != null ? String(selectedBooking.mileage_out) : f.mileage_out,
      parking_floor: selectedBooking.parking_floor || f.parking_floor,
    }));
  }, [selectedBooking]);

  async function handleImageUpload(file: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((e) => ({ ...e, image: "รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, image: "ขนาดไฟล์ต้องไม่เกิน 5MB" }));
      return;
    }
    setErrors((e) => ({ ...e, image: "" }));
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error("อัปโหลดภาพไม่สำเร็จ");
        setPreview(null);
        return;
      }
      setForm((f) => ({ ...f, return_image_url: data.url }));
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.booking_id) errs.booking_id = "กรุณาเลือกทะเบียนรถ";
    if (!form.mileage_out) errs.mileage_out = "กรุณากรอกเลขไมล์ขาไป";
    if (!form.mileage_in) errs.mileage_in = "กรุณากรอกเลขไมล์ขากลับ";
    else if (Number(form.mileage_in) <= Number(form.mileage_out))
      errs.mileage_in = "เลขไมล์ขากลับต้องมากกว่าขาไป";
    if (!form.parking_floor.trim()) errs.parking_floor = "กรุณากรอกชั้นที่จอดรถ";
    if (!form.return_image_url) errs.image = "กรุณาถ่าย/อัปโหลดภาพรถ";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${form.booking_id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mileage_out: Number(form.mileage_out),
          mileage_in: Number(form.mileage_in),
          parking_floor: form.parking_floor,
          return_image_url: form.return_image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      toast.success("คืนรถสำเร็จ!");
      router.push("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "คืนรถไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  const mileageDiff =
    form.mileage_out && form.mileage_in && Number(form.mileage_in) > Number(form.mileage_out)
      ? Number(form.mileage_in) - Number(form.mileage_out)
      : null;

  return (
    <main className="min-h-screen bg-linen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-neutral-gray hover:text-forest-green transition-colors">
            ← กลับ
          </Link>
          <h1 className="text-h1 font-semibold text-forest-green">คืนรถขากลับ</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* 1. ทะเบียนรถ */}
          <div>
            <label className="label">ทะเบียนรถที่คืน</label>
            {loadingBookings ? (
              <div className="flex items-center gap-2 text-neutral-gray">
                <LoadingSpinner size={16} /> กำลังโหลด...
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-caption text-yellow-800">
                ไม่มีรถที่รอคืน — กรุณาตรวจสอบว่ามีการจองที่ได้รับการยืนยันแล้ว
              </div>
            ) : (
              <select
                className="input-field font-dm-sans"
                value={form.booking_id}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    booking_id: e.target.value,
                    mileage_out: "",
                    mileage_in: "",
                    parking_floor: "",
                  }));
                }}
              >
                <option value="">— เลือกทะเบียนรถ —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.vehicles?.license_plate} — {b.booker_name} ({formatThaiDate(b.booking_date)})
                  </option>
                ))}
              </select>
            )}
            {errors.booking_id && <p className="text-red-600 text-caption mt-1">{errors.booking_id}</p>}
          </div>

          {/* Booking info card */}
          {selectedBooking && (
            <div className="bg-linen rounded-lg p-3 border border-neutral-gray/30 text-caption space-y-1">
              <div className="flex justify-between">
                <span className="text-dark-text/60">ผู้จอง</span>
                <span className="font-semibold">{selectedBooking.booker_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">วันที่จอง</span>
                <span className="font-dm-sans">{formatThaiDate(selectedBooking.booking_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">เวลา</span>
                <span className="font-dm-sans">
                  {selectedBooking.booking_time?.slice(0, 5)}
                  {selectedBooking.booking_time_end ? ` – ${selectedBooking.booking_time_end.slice(0, 5)} น.` : " น."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">สถานะ</span>
                <span className={`px-2 py-0.5 rounded-full text-caption ${
                  selectedBooking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {selectedBooking.status === "confirmed" ? "ยืนยันแล้ว" : "รอยืนยัน"}
                </span>
              </div>
            </div>
          )}

          {/* 2. เลขไมล์ขาไป */}
          <div>
            <label className="label">
              เลขไมล์ขาไป
              {selectedBooking?.mileage_out && (
                <span className="text-moss-green text-caption ml-2">(กรอกไว้: {selectedBooking.mileage_out.toLocaleString()})</span>
              )}
            </label>
            <input
              type="number"
              className="input-field font-dm-sans"
              placeholder="กรอกเลขไมล์ตอนออกเดินทาง"
              value={form.mileage_out}
              onChange={(e) => setForm((f) => ({ ...f, mileage_out: e.target.value }))}
            />
            {errors.mileage_out && <p className="text-red-600 text-caption mt-1">{errors.mileage_out}</p>}
          </div>

          {/* 3. เลขไมล์ขากลับ */}
          <div>
            <label className="label">เลขไมล์ขากลับ</label>
            <input
              type="number"
              className="input-field font-dm-sans"
              placeholder="ต้องมากกว่าขาไป"
              value={form.mileage_in}
              onChange={(e) => setForm((f) => ({ ...f, mileage_in: e.target.value }))}
            />
            {errors.mileage_in && <p className="text-red-600 text-caption mt-1">{errors.mileage_in}</p>}
            {mileageDiff !== null && (
              <p className="text-caption text-moss-green mt-1 bg-forest-green/5 rounded px-2 py-1">
                ระยะทางที่ใช้: {mileageDiff.toLocaleString()} กม.
              </p>
            )}
          </div>

          {/* 4. ชั้นที่จอด */}
          <div>
            <label className="label">ชั้นที่จอดรถ</label>
            <input
              type="text"
              className="input-field"
              placeholder="เช่น ชั้น B1, ชั้น 2"
              value={form.parking_floor}
              onChange={(e) => setForm((f) => ({ ...f, parking_floor: e.target.value }))}
            />
            {errors.parking_floor && <p className="text-red-600 text-caption mt-1">{errors.parking_floor}</p>}
          </div>

          {/* 5. ภาพรถ */}
          <div>
            <label className="label">ภาพรถ (บังคับ)</label>
            <div
              className="border-2 border-dashed border-neutral-gray rounded-lg p-6 text-center cursor-pointer hover:border-forest-green transition-colors"
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleImageUpload(file);
              }}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-neutral-gray">
                  <LoadingSpinner size={20} /> กำลังอัปโหลดภาพ...
                </div>
              ) : preview ? (
                <div>
                  <Image src={preview} alt="preview" width={320} height={200} className="mx-auto rounded-lg object-cover max-h-48" />
                  <p className="text-caption text-moss-green mt-2">คลิกเพื่อเปลี่ยนภาพ</p>
                </div>
              ) : (
                <div>
                  <p className="text-body text-neutral-gray">คลิกหรือลากไฟล์มาวางที่นี่</p>
                  <p className="text-caption text-neutral-gray mt-1">JPG / PNG สูงสุด 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            {errors.image && <p className="text-red-600 text-caption mt-1">{errors.image}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || uploading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size={20} /> กำลังบันทึก...
              </span>
            ) : uploading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size={20} /> รอการอัปโหลดภาพ...
              </span>
            ) : (
              "ยืนยันการคืนรถ"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
