"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import Stepper from "@/components/ui/Stepper";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { generateTimeSlots, validatePhone, formatDate } from "@/lib/utils";
import { useLang, LangToggle, T } from "@/lib/lang";
import type { Vehicle } from "@/types";

export default function OutboundBookingPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = T.outbound[lang];

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
    purpose: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);

  useEffect(() => {
    fetch("/api/vehicles?available=true")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setVehicles(data.vehicles || []))
      .catch(() => toast.error(t.loadError))
      .finally(() => setLoadingVehicles(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getCurrentThaiTime(): string {
    const nowUTC = new Date();
    const thaiOffset = 7 * 60;
    const thaiTime = new Date(nowUTC.getTime() + thaiOffset * 60 * 1000);
    const h = thaiTime.getUTCHours();
    const m = thaiTime.getUTCMinutes();
    const roundedM = m >= 30 ? 30 : 0;
    return String(h).padStart(2, "0") + ":" + String(roundedM).padStart(2, "0");
  }

  function validateStep1() {
    if (!form.vehicle_id) { setErrors({ vehicle_id: t.errSelectVehicle }); return false; }
    setErrors({});
    return true;
  }

  function validateStep2() {
    const errs: Record<string, string> = {};
    if (!form.booking_date) errs.booking_date = t.errDate;
    else if (form.booking_date < today) errs.booking_date = t.errDatePast;
    if (!form.booking_time) errs.booking_time = t.errTimeStart;
    if (!form.booking_time_end) errs.booking_time_end = t.errTimeEnd;
    else if (form.booking_time_end <= form.booking_time) errs.booking_time_end = t.errTimeEndInvalid;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3() {
    const errs: Record<string, string> = {};
    if (!form.booker_name.trim()) errs.booker_name = t.errName;
    if (!form.booker_phone.trim()) errs.booker_phone = t.errPhone;
    else if (!validatePhone(form.booker_phone)) errs.booker_phone = t.errPhoneInvalid;
    if (!form.purpose.trim()) errs.purpose = t.errDest;
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
      if (!res.ok) throw new Error(data.error || t.toastError);
      toast.success(t.toastSuccess);
      router.push("/");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.toastError);
    } finally {
      setLoading(false);
    }
  }

  const allTimeSlots = generateTimeSlots();
  const currentThaiTime = getCurrentThaiTime();
  const timeSlots = form.booking_date === today
    ? allTimeSlots.filter((slot) => slot >= currentThaiTime)
    : allTimeSlots;
  const endTimeSlots = allTimeSlots.filter((slot) => slot > form.booking_time);

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
        <Stepper steps={[...t.steps]} currentStep={step} />
        <div className="card">
          {step === 1 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">{t.step1Title}</h2>
              {loadingVehicles ? <LoadingSpinner /> : vehicles.length === 0 ? (
                <p className="text-neutral-gray text-center py-8">{t.noVehicle}</p>
              ) : (
                <div className="space-y-3">
                  {vehicles.map((v) => (
                    <button key={v.id} onClick={() => setForm((f) => ({ ...f, vehicle_id: v.id }))}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${form.vehicle_id === v.id ? "border-forest-green bg-forest-green/5" : "border-gray-200 hover:border-forest-green/50"}`}>
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {v.image_url ? <Image src={v.image_url} alt={v.license_plate} width={64} height={64} className="object-cover w-full h-full" /> : <span className="text-xs text-gray-400">{t.noImage}</span>}
                      </div>
                      <span className="font-semibold text-dark-text">{v.license_plate}</span>
                      {form.vehicle_id === v.id && <span className="ml-auto text-forest-green">✓</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.vehicle_id && <p className="text-red-500 text-sm mt-2">{errors.vehicle_id}</p>}
              <div className="flex justify-end mt-6"><button onClick={nextStep} className="btn-primary">{t.btnNext}</button></div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">{t.step2Title}</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">{t.labelDate}</label>
                  <input type="date" min={today} value={form.booking_date}
                    onChange={(e) => { setForm((f) => ({ ...f, booking_date: e.target.value })); setErrors((err) => ({ ...err, booking_date: "" })); }}
                    className="input" />
                  {errors.booking_date && <p className="text-red-500 text-sm mt-1">{errors.booking_date}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">{t.labelStart}</label>
                    <select value={form.booking_time}
                      onChange={(e) => { const s = e.target.value; const end = allTimeSlots.find((x) => x > s) || ""; setForm((f) => ({ ...f, booking_time: s, booking_time_end: end })); setErrors((err) => ({ ...err, booking_time: "", booking_time_end: "" })); }}
                      className="input">
                      {timeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                    {errors.booking_time && <p className="text-red-500 text-sm mt-1">{errors.booking_time}</p>}
                  </div>
                  <div>
                    <label className="label">{t.labelEnd}</label>
                    <select value={form.booking_time_end}
                      onChange={(e) => { setForm((f) => ({ ...f, booking_time_end: e.target.value })); setErrors((err) => ({ ...err, booking_time_end: "" })); }}
                      className="input">
                      {endTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                    {errors.booking_time_end && <p className="text-red-500 text-sm mt-1">{errors.booking_time_end}</p>}
                  </div>
                </div>
                {form.booking_time && form.booking_time_end && form.booking_time_end > form.booking_time && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-neutral-gray">{t.duration}: {form.booking_time} – {form.booking_time_end} {t.durationUnit}</div>
                )}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(1)} className="btn-secondary">{t.btnBack}</button>
                <button onClick={nextStep} className="btn-primary">{t.btnNext}</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">{t.step3Title}</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">{t.labelName}</label>
                  <input type="text" placeholder={t.placeholderName} value={form.booker_name}
                    onChange={(e) => { setForm((f) => ({ ...f, booker_name: e.target.value })); setErrors((err) => ({ ...err, booker_name: "" })); }}
                    className="input" />
                  {errors.booker_name && <p className="text-red-500 text-sm mt-1">{errors.booker_name}</p>}
                </div>
                <div>
                  <label className="label">{t.labelPhone}</label>
                  <input type="tel" placeholder="0812345678" value={form.booker_phone}
                    onChange={(e) => { setForm((f) => ({ ...f, booker_phone: e.target.value })); setErrors((err) => ({ ...err, booker_phone: "" })); }}
                    className="input" />
                  {errors.booker_phone && <p className="text-red-500 text-sm mt-1">{errors.booker_phone}</p>}
                </div>
                <div>
                  <label className="label">{t.labelDest}</label>
                  <input type="text" placeholder={t.placeholderDest} value={form.purpose}
                    onChange={(e) => { setForm((f) => ({ ...f, purpose: e.target.value })); setErrors((err) => ({ ...err, purpose: "" })); }}
                    className="input" />
                  {errors.purpose && <p className="text-red-500 text-sm mt-1">{errors.purpose}</p>}
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setStep(2)} className="btn-secondary">{t.btnBack}</button>
                <button onClick={nextStep} className="btn-primary">{t.btnNext}</button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h2 className="text-h2 font-semibold mb-4">{t.step4Title}</h2>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowPlate}</span><span className="font-semibold">{selectedVehicle?.license_plate}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowDate}</span><span className="font-semibold">{formatDate(form.booking_date, lang)}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowTime}</span><span className="font-semibold">{form.booking_time} – {form.booking_time_end} {t.timeUnit}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowName}</span><span className="font-semibold">{form.booker_name}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowPhone}</span><span className="font-semibold">{form.booker_phone}</span></div>
                <div className="flex justify-between px-4 py-3"><span className="text-neutral-gray">{t.rowDest}</span><span className="font-semibold">{form.purpose}</span></div>
              </div>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full mt-6">
                {loading ? t.btnSaving : t.btnConfirm}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
                                       }
