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
    fuel_level_return: "",
    parking_floor: "",
    return_image_url: "",
    last_washed_date: "",
  });
  const [lastMileage, setLastMileage] = useState<number | null>(null);
  const [loadingMileage, setLoadingMileage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedBooking = bookings.find((b) => b.id === form.booking_id);

  useEffect(() => {
    // Fetch confirmed bookings from start of year — includes today and past confirmed (not yet returned)
    const yearStart = new Date().getFullYear() + "-01-01";
    fetch(`/api/bookings?status=confirmed&from=${yearStart}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setBookings(data.bookings || []))
      .catch(() => toast.error(t.loadError))
      .finally(() => setLoadingBookings(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedBooking) {
      setLastMileage(null);
      return;
    }
    // Fetch last returned mileage for this vehicle to pre-fill mileage_out
    const vehicleId = selectedBooking.vehicle_id;
    setLoadingMileage(true);
    fetch(`/api/vehicles/${vehicleId}/last-mileage`)
      .then((r) => r.json())
      .then((data: { mileage: number | null }) => {
        const last = data.mileage;
        setLastMileage(last);
        setForm((f) => ({
          ...f,
          mileage_out: last != null ? String(last) : (selectedBooking.mileage_out != null ? String(selectedBooking.mileage_out) : ""),
          parking_floor: selectedBooking.parking_floor || f.parking_floor,
        }));
      })
      .catch(() => {
        setLastMileage(null);
        setForm((f) => ({
          ...f,
          mileage_out: selectedBooking.mileage_out != null ? String(selectedBooking.mileage_out) : "",
          parking_floor: selectedBooking.parking_floor || f.parking_floor,
        }));
      })
      .finally(() => setLoadingMileage(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBooking?.id]);

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
          fuel_level_return: form.fuel_level_return !== "" ? Number(form.fuel_level_return) : null,
          parking_floor: form.parking_floor,
          return_image_url: form.return_image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.toastError);
      // If wash date provided, update vehicle's last_washed_at
      if (form.last_washed_date && selectedBooking?.vehicle_id) {
        await fetch(`/api/vehicles/${selectedBooking.vehicle_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "washed", date: form.last_washed_date }),
        }).catch(() => {});
      }
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

        <form onSubmit={handleSubmit} className="card space-y-5">
          {/* Vehicle select */}
          <div>
            <label className="label">{t.labelPlate}</label>
            {loadingBookings ? (
              <div className="flex items-center gap-2 text-neutral-gray">
                <LoadingSpinner size={16} /> {t.loading}
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-caption text-yellow-800">
                {t.noBookings}
              </div>
            ) : (
              <select className="input-field font-dm-sans" value={form.booking_id}
                onChange={(e) => setForm((f) => ({ ...f, booking_id: e.target.value, mileage_out: "", mileage_in: "", fuel_level_return: "", parking_floor: "", last_washed_date: "" }))}>
                <option value="">{t.selectPlate}</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.vehicles?.license_plate} — {b.booker_name} ({formatDate(b.booking_date, lang)})
                  </option>
                ))}
              </select>
            )}
            {errors.booking_id && <p className="text-red-600 text-caption mt-1">{errors.booking_id}</p>}
          </div>

          {/* Booking info */}
          {selectedBooking && (
            <div className="bg-linen rounded-lg p-3 border border-neutral-gray/30 text-caption space-y-1">
              <div className="flex justify-between">
                <span className="text-dark-text/60">{t.infoBooker}</span>
                <span className="font-semibold">{selectedBooking.booker_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">{t.infoDate}</span>
                <span className="font-dm-sans">{formatDate(selectedBooking.booking_date, lang)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">{t.infoTime}</span>
                <span className="font-dm-sans">
                  {selectedBooking.booking_time?.slice(0, 5)}
                  {selectedBooking.booking_time_end ? ` – ${selectedBooking.booking_time_end.slice(0, 5)}${t.timeUnit ? ` ${t.timeUnit}` : ""}` : (t.timeUnit ? ` ${t.timeUnit}` : "")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-text/60">{t.infoStatus}</span>
                <span className={`px-2 py-0.5 rounded-full text-caption ${
                  selectedBooking.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}>
                  {selectedBooking.status === "confirmed" ? t.statusConfirmed : t.statusPending}
                </span>
              </div>
            </div>
          )}

          {/* Mileage out — auto-filled from last return */}
          <div>
            <label className="label">{t.labelMileOut}</label>
            {loadingMileage ? (
              <div className="flex items-center gap-2 text-caption text-neutral-gray mb-1">
                <LoadingSpinner size={13} />
                {lang === "th" ? "กำลังดึงข้อมูลไมล์..." : "Loading mileage..."}
              </div>
            ) : lastMileage != null ? (
              <p className="text-caption text-moss-green bg-forest-green/5 rounded px-2 py-1 mb-1">
                {t.mileOutAuto} <span className="font-dm-sans font-semibold">{lastMileage.toLocaleString()}</span> {t.mileUnit}
              </p>
            ) : selectedBooking ? (
              <p className="text-caption text-neutral-gray mb-1">{t.mileOutNoHistory}</p>
            ) : null}
            <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderMileOut}
              value={form.mileage_out} onChange={(e) => setForm((f) => ({ ...f, mileage_out: e.target.value }))} />
            {errors.mileage_out && <p className="text-red-600 text-caption mt-1">{errors.mileage_out}</p>}
          </div>

          {/* Mileage in */}
          <div>
            <label className="label">{t.labelMileIn}</label>
            <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderMileIn}
              value={form.mileage_in} onChange={(e) => setForm((f) => ({ ...f, mileage_in: e.target.value }))} />
            {errors.mileage_in && <p className="text-red-600 text-caption mt-1">{errors.mileage_in}</p>}
            {mileageDiff !== null && (
              <p className="text-caption text-moss-green mt-1 bg-forest-green/5 rounded px-2 py-1">
                {t.mileUsed}: {mileageDiff.toLocaleString()} {t.mileUnit}
              </p>
            )}
          </div>

          {/* Fuel level */}
          <div>
            <label className="label">{t.labelFuel}</label>
            <div className="relative">
              <input
                type="number" min="0" max="100"
                className="input-field font-dm-sans pr-10"
                placeholder={t.placeholderFuel}
                value={form.fuel_level_return}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || (Number(v) >= 0 && Number(v) <= 100)) {
                    setForm((f) => ({ ...f, fuel_level_return: v }));
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-neutral-gray font-dm-sans">%</span>
            </div>
            {/* Visual fuel bar */}
            {form.fuel_level_return !== "" && Number(form.fuel_level_return) >= 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-caption text-neutral-gray mb-1">
                  <span>0%</span>
                  <span className={`font-semibold ${Number(form.fuel_level_return) < 25 ? "text-red-500" : Number(form.fuel_level_return) < 50 ? "text-yellow-600" : "text-forest-green"}`}>
                    {form.fuel_level_return}%
                  </span>
                  <span>100%</span>
                </div>
                <div className="h-3 bg-neutral-gray/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      Number(form.fuel_level_return) < 25 ? "bg-red-400" :
                      Number(form.fuel_level_return) < 50 ? "bg-yellow-400" : "bg-forest-green"
                    }`}
                    style={{ width: `${Math.min(100, Number(form.fuel_level_return))}%` }}
                  />
                </div>
                <p className="text-caption text-neutral-gray mt-1">{t.fuelHint}</p>
              </div>
            )}
          </div>

          {/* Last washed date */}
          <div>
            <label className="label">{t.labelWashed}</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="input-field font-dm-sans flex-1"
                max={new Date().toISOString().split("T")[0]}
                value={form.last_washed_date}
                onChange={(e) => setForm((f) => ({ ...f, last_washed_date: e.target.value }))}
              />
              {form.last_washed_date !== new Date().toISOString().split("T")[0] && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, last_washed_date: new Date().toISOString().split("T")[0] }))}
                  className="px-3 py-2 text-caption rounded-lg border border-forest-green text-forest-green hover:bg-forest-green hover:text-white transition-colors whitespace-nowrap"
                >
                  {t.washedToday}
                </button>
              )}
            </div>
            <p className="text-caption text-neutral-gray mt-1">{t.washedHint}</p>
          </div>

          {/* Parking */}
          <div>
            <label className="label">{t.labelParking}</label>
            <input type="text" className="input-field" placeholder={t.placeholderParking}
              value={form.parking_floor} onChange={(e) => setForm((f) => ({ ...f, parking_floor: e.target.value }))} />
            {errors.parking_floor && <p className="text-red-600 text-caption mt-1">{errors.parking_floor}</p>}
          </div>

          {/* Image upload */}
          <div>
            <label className="label">{t.labelImage}</label>
            <div
              className="border-2 border-dashed border-neutral-gray rounded-lg p-6 text-center cursor-pointer hover:border-forest-green transition-colors"
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleImageUpload(file); }}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2 text-neutral-gray">
                  <LoadingSpinner size={20} /> {t.uploading}
                </div>
              ) : preview ? (
                <div>
                  <Image src={preview} alt="preview" width={320} height={200} className="mx-auto rounded-lg object-cover max-h-48" />
                  <p className="text-caption text-moss-green mt-2">{t.changeImage}</p>
                </div>
              ) : (
                <div>
                  <p className="text-body text-neutral-gray">{t.uploadClick}</p>
                  <p className="text-caption text-neutral-gray mt-1">{t.uploadHint}</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            {errors.image && <p className="text-red-600 text-caption mt-1">{errors.image}</p>}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={loading || uploading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2"><LoadingSpinner size={20} /> {t.btnSaving}</span>
            ) : uploading ? (
              <span className="flex items-center justify-center gap-2"><LoadingSpinner size={20} /> {t.btnWaitUpload}</span>
            ) : t.btnSubmit}
          </button>
        </form>
      </div>
    </main>
  );
}
