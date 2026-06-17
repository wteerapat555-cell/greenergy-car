"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDate } from "@/lib/utils";
import { useLang, LangToggle, T } from "@/lib/lang";
import type { Booking } from "@/types";

export default function ReturnPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = T.return[lang];

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
    fetch("/api/bookings?status=confirmed")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setBookings(data.bookings || []))
      .catch(() => toast.error(t.loadError))
      .finally(() => setLoadingBookings(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBooking) return;
    setForm((f) => ({
      ...f,
      mileage_out: selectedBooking.mileage_out != null ? String(selectedBooking.mileage_out) : f.mileage_out,
      parking_floor: selectedBooking.parking_floor || f.parking_floor,
    }));
    // Clear booking_id error when user selects a booking
    setErrors((e) => ({ ...e, booking_id: "" }));
  }, [selectedBooking]);

  async function handleImageUpload(file: File) {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((e) => ({ ...e, image: t.errImageType }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((e) => ({ ...e, image: t.errImageSize }));
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
      if (!res.ok) { toast.error(t.uploadError); setPreview(null); setForm((f) => ({ ...f, return_image_url: "" })); return; }
      setForm((f) => ({ ...f, return_image_url: data.url }));
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.booking_id) errs.booking_id = t.errBooking;
    if (form.mileage_out === "") errs.mileage_out = t.errMileOut;
    if (form.mileage_in === "") errs.mileage_in = t.errMileIn;
    else if (Number(form.mileage_in) <= Number(form.mileage_out)) errs.mileage_in = t.errMileInLow;
    if (!form.parking_floor.trim()) errs.parking_floor = t.errParking;
    if (!form.return_image_url) errs.image = t.errImage;
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
      if (!res.ok) throw new Error(data.error || t.toastError);
      toast.success(t.toastSuccess);
      router.push("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.toastError);
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-neutral-gray hover:text-forest-green transition-colors">{t.back}</Link>
            <h1 className="text-h1 font-semibold text-forest-green">{t.title}</h1>
          </div>
          <LangToggle />
        </div>

        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* เลือกทะเบียนรถ */}
          <div>
            <label className="label">{t.labelVehicle}</label>
            {loadingBookings ? (
              <LoadingSpinner />
            ) : (
              <select
                value={form.booking_id}
                onChange={(e) => {
                  setForm((f) => ({ ...f, booking_id: e.target.value }));
                  setErrors((err) => ({ ...err, booking_id: "" }));
                }}
                className="input"
              >
                <option value="">— {t.selectVehicle} —</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.vehicles?.license_plate} — {b.booker_name} ({formatDate(b.booking_date, lang)})
                  </option>
                ))}
              </select>
            )}
            {errors.booking_id && <p className="text-red-500 text-sm mt-1">{errors.booking_id}</p>}

            {/* แสดงข้อมูลการจอง */}
            {selectedBooking && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-neutral-gray">{t.booker}</span><span>{selectedBooking.booker_name}</span></div>
                <div className="flex justify-between"><span className="text-neutral-gray">{t.bookingDate}</span><span>{formatDate(selectedBooking.booking_date, lang)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-gray">{t.time}</span><span>{selectedBooking.booking_time?.slice(0,5)}{selectedBooking.booking_time_end ? ` – ${selectedBooking.booking_time_end.slice(0,5)}` : ""}</span></div>
                <div className="flex justify-between"><span className="text-neutral-gray">{t.status}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{t.statusConfirmed}</span>
                </div>
              </div>
            )}
          </div>

          {/* เลขไมล์ขาไป */}
          <div>
            <label className="label">{t.labelMileOut}</label>
            <input
              type="number"
              min={0}
              placeholder={t.placeholderMileOut}
              value={form.mileage_out}
              onChange={(e) => {
                setForm((f) => ({ ...f, mileage_out: e.target.value }));
                setErrors((err) => ({ ...err, mileage_out: "" }));
                // Also clear mileage_in error if it's now valid
                if (form.mileage_in && Number(form.mileage_in) > Number(e.target.value)) {
                  setErrors((err) => ({ ...err, mileage_in: "" }));
                }
              }}
              className="input"
            />
            {errors.mileage_out && <p className="text-red-500 text-sm mt-1">{errors.mileage_out}</p>}
          </div>

          {/* เลขไมล์ขากลับ */}
          <div>
            <label className="label">{t.labelMileIn}</label>
            <input
              type="number"
              min={0}
              placeholder={t.placeholderMileIn}
              value={form.mileage_in}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({ ...f, mileage_in: val }));
                // Clear error real-time when value is valid
                if (val === "" || (form.mileage_out !== "" && Number(val) > Number(form.mileage_out))) {
                  setErrors((err) => ({ ...err, mileage_in: "" }));
                } else if (val !== "" && form.mileage_out !== "" && Number(val) <= Number(form.mileage_out)) {
                  setErrors((err) => ({ ...err, mileage_in: t.errMileInLow }));
                }
              }}
              className="input"
            />
            {errors.mileage_in && <p className="text-red-500 text-sm mt-1">{errors.mileage_in}</p>}
            {mileageDiff !== null && (
              <p className="text-sm text-neutral-gray mt-1">{t.distanceUsed}: {mileageDiff} {t.kmUnit}</p>
            )}
          </div>

          {/* ชั้นที่จอดรถ */}
          <div>
            <label className="label">{t.labelParking}</label>
            <input
              type="text"
              placeholder={t.placeholderParking}
              value={form.parking_floor}
              onChange={(e) => {
                setForm((f) => ({ ...f, parking_floor: e.target.value }));
                setErrors((err) => ({ ...err, parking_floor: "" }));
              }}
              className="input"
            />
            {errors.parking_floor && <p className="text-red-500 text-sm mt-1">{errors.parking_floor}</p>}
          </div>

          {/* ภาพรถ */}
          <div>
            <label className="label">{t.labelImage}</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-forest-green transition-colors"
            >
              {preview ? (
                <div className="relative">
                  <Image src={preview} alt="preview" width={200} height={150} className="mx-auto rounded-lg object-cover max-h-40" />
                  {uploading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg"><LoadingSpinner /></div>}
                </div>
              ) : (
                <div className="text-neutral-gray">
                  <p>{t.imagePlaceholder}</p>
                  <p className="text-xs mt-1">JPG / PNG {t.maxSize}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
          </div>

          <button type="submit" disabled={loading || uploading} className="btn-primary w-full">
            {loading ? t.btnSaving : t.btnSubmit}
          </button>
        </form>
      </div>
    </main>
  );
            }
