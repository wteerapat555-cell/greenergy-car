"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import Stepper from "@/components/ui/Stepper";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { generateTimeSlots, validatePhone, formatThaiDate } from "@/lib/utils";
import type { Vehicle } from "@/types";

const STEPS = ["เลือกรถ", "วัน-เวลา", "ข้อมูลผู้จอง", "ยืนยัน"];

export default function OutboundBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    vehicle_id: "",
    booking_date: today,
    booking_time: "08:00",
    booking_time_end: "09:00",
    booker_name: "",
    booker_phone: "",
    destination: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);

  useEffect(() => {
    fetch("/api/vehicles?available=true")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setVehicles(data.vehicles || []))
      .catch(() => toast.error("โหลดข้อมูลรถไม่สำเร็จ"))
      .finally(() => setLoadingVehicles(false));
  }, []);

  function validateStep1() {
    if (!form.vehicle_id) { setErrors({ vehicle_id: "กรุณาเลือกรถ" }); return false; }
    setErrors({});
    return true;
  }

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!form.booking_date) errs.booking_date = "กรุณาเลือกวันที่";
    else if (form.booking_date < today) errs.booking_date = "ไม่สามารถเลือกวันในอดีตได้";
    if (!form.booking_time) errs.booking_time = "กรุณาเลือกเวลาเริ่มต้น";
    if (!form.booking_time_end) errs.booking_time_end = "กรุณาเลือกเวลาสิ้นสุด";
    else if (form.booking_time_end <= form.booking_time)
      errs.booking_time_end = "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3() {
    const errs: Record<string, string> = {};
    if (!form.booker_name.trim()) errs.booker_name = "กรุณากรอกชื่อ-นามสกุล";
    if (!form.booker_phone.trim()) errs.booker_phone = "กรุณากรอกเบอร์โทรศัพท์";
    else if (!validatePhone(form.booker_phone)) errs.booker_phone = "รูปแบบเบอร์โทรไม่ถูกต้อง";
    if (!form.destination.trim()) errs.destination = "กรุณากรอกชื่อโครงการ/จุดหมาย";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function nextStep() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เกิดข้อผิดพลาด");
      toast.success("จองรถสำเร็จ!");
      router.push("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "จองรถไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  }

  const timeSlots = generateTimeSlots();

  // กรอง end time ให้มากกว่า start time เท่านั้น
  const endTimeSlots = timeSlots.filter((t) => t > form.booking_time);

  return (
    <main className="min-h-screen bg-linen px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-neutral-gray hover:text-forest-green transition-colors">
            ← กลับ
          </Link>
          <h1 className="text-h1 font-semibold text-forest-green">จองรถขาไป</h1>
        </div>

        <Stepper steps={STEPS} currentStep={step} />

        <div className="card">
          {/* Step 1: Select Vehicle */}
          {step === 1 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">เลือกรถ</h2>
              {loadingVehicles ? (
                <div className="flex justify-center py-8"><LoadingSpinner /></div>
              ) : vehicles.length === 0 ? (
                <p className="text-body text-neutral-gray text-center py-8">ไม่มีรถว่างในขณะนี้</p>
              ) : (
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setForm((f) => ({ ...f, vehicle_id: v.id }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors text-left
                        ${form.vehicle_id === v.id
                          ? "border-forest-green bg-forest-green/5"
                          : "border-neutral-gray hover:border-moss-green"
                        }`}
                    >
                      {v.image_url ? (
                        <Image src={v.image_url} alt={v.license_plate} width={64} height={48} className="rounded object-cover" />
                      ) : (
                        <div className="w-16 h-12 bg-linen rounded flex items-center justify-center">
                          <span className="text-neutral-gray text-caption">ไม่มีภาพ</span>
                        </div>
                      )}
                      <span className="text-body font-semibold font-dm-sans">{v.license_plate}</span>
                      {form.vehicle_id === v.id && <span className="ml-auto text-forest-green">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.vehicle_id && <p className="text-red-600 text-caption mt-2">{errors.vehicle_id}</p>}
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">เลือกวันและเวลา</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">วันที่</label>
                  <input
                    type="date"
                    className="input-field font-dm-sans"
                    min={today}
                    value={form.booking_date}
                    onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))}
                  />
                  {errors.booking_date && <p className="text-red-600 text-caption mt-1">{errors.booking_date}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">เวลาเริ่มต้น</label>
                    <select
                      className="input-field font-dm-sans"
                      value={form.booking_time}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const newEnd = timeSlots.find((t) => t > newStart) || "";
                        setForm((f) => ({ ...f, booking_time: newStart, booking_time_end: newEnd }));
                      }}
                    >
                      {timeSlots.slice(0, -1).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.booking_time && <p className="text-red-600 text-caption mt-1">{errors.booking_time}</p>}
                  </div>
                  <div>
                    <label className="label">เวลาสิ้นสุด</label>
                    <select
                      className="input-field font-dm-sans"
                      value={form.booking_time_end}
                      onChange={(e) => setForm((f) => ({ ...f, booking_time_end: e.target.value }))}
                    >
                      {endTimeSlots.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    {errors.booking_time_end && <p className="text-red-600 text-caption mt-1">{errors.booking_time_end}</p>}
                  </div>
                </div>
                {form.booking_time && form.booking_time_end && (
                  <p className="text-caption text-moss-green bg-forest-green/5 rounded-lg px-3 py-2">
                    ระยะเวลา: {form.booking_time} – {form.booking_time_end} น.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Booker Info */}
          {step === 3 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">ข้อมูลผู้จอง</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="กรอกชื่อ-นามสกุล"
                    value={form.booker_name}
                    onChange={(e) => setForm((f) => ({ ...f, booker_name: e.target.value }))}
                  />
                  {errors.booker_name && <p className="text-red-600 text-caption mt-1">{errors.booker_name}</p>}
                </div>
                <div>
                  <label className="label">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    className="input-field font-dm-sans"
                    placeholder="0812345678"
                    value={form.booker_phone}
                    onChange={(e) => setForm((f) => ({ ...f, booker_phone: e.target.value }))}
                  />
                  {errors.booker_phone && <p className="text-red-600 text-caption mt-1">{errors.booker_phone}</p>}
                </div>
                <div>
                  <label className="label">ชื่อโครงการ / จุดหมาย</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="เช่น โครงการ ABC, ประชุมสำนักงานใหญ่"
                    value={form.destination}
                    onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  />
                  {errors.destination && <p className="text-red-600 text-caption mt-1">{errors.destination}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">ยืนยันการจอง</h2>
              <div className="space-y-3 bg-linen rounded-lg p-4 mb-6">
                {selectedVehicle?.image_url && (
                  <Image
                    src={selectedVehicle.image_url}
                    alt={selectedVehicle.license_plate}
                    width={320} height={200}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}
                <Row label="ทะเบียนรถ" value={selectedVehicle?.license_plate || "-"} mono />
                <Row label="วันที่" value={formatThaiDate(form.booking_date)} />
                <Row label="เวลา" value={`${form.booking_time} – ${form.booking_time_end} น.`} mono />
                <Row label="ชื่อผู้จอง" value={form.booker_name} />
                <Row label="เบอร์โทรศัพท์" value={form.booker_phone} mono />
                <Row label="โครงการ / จุดหมาย" value={form.destination} />
              </div>
              <button className="btn-primary w-full" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size={20} /> กำลังบันทึก...
                  </span>
                ) : "ยืนยันการจอง"}
              </button>
            </div>
          )}

          {step < 4 && (
            <div className="flex justify-between mt-6">
              {step > 1 ? (
                <button className="btn-secondary" onClick={() => setStep((s) => s - 1)}>ย้อนกลับ</button>
              ) : <div />}
              <button className="btn-primary" onClick={nextStep}>ถัดไป</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-neutral-gray/50 last:border-0">
      <span className="text-caption text-dark-text/60">{label}</span>
      <span className={`text-body font-semibold ${mono ? "font-dm-sans" : ""}`}>{value}</span>
    </div>
  );
}
