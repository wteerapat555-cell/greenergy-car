"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDate } from "@/lib/utils";
import { useLang, LangToggle } from "@/lib/lang";
import type { Booking, Vehicle } from "@/types";

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <div className="absolute inset-0 rounded-[18px] bg-forest-green/10" />
        <div className="absolute inset-[5px] rounded-[13px] bg-forest-green flex items-center justify-center shadow-md">
          <svg width="30" height="30" viewBox="0 0 48 48" fill="none">
            <path d="M10 30 L10 34 Q10 36 12 36 L14 36 M34 36 L36 36 Q38 36 38 34 L38 30" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M8 30 L40 30 L40 26 L36 18 Q35 16 33 16 L15 16 Q13 16 12 18 L8 26 Z" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="2.2" strokeLinejoin="round"/>
            <path d="M16 16 L13.5 24 L34.5 24 L32 16 Z" fill="white" fillOpacity="0.3"/>
            <circle cx="15" cy="34" r="4" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2.2"/>
            <circle cx="15" cy="34" r="1.5" fill="white"/>
            <circle cx="33" cy="34" r="4" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2.2"/>
            <circle cx="33" cy="34" r="1.5" fill="white"/>
            <path d="M27 10 C27 10 31 8 32 12 C33 16 29 17 27 15 C25 13 27 10 27 10Z" fill="white" fillOpacity="0.9"/>
            <path d="M27 10 L28.5 15" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div>
        <p className="font-sarabun font-bold text-forest-green leading-none text-[22px] tracking-tight">Greenergy</p>
        <p className="font-dm-sans text-moss-green tracking-[0.18em] uppercase text-[9px] mt-1">Car Reservation</p>
      </div>
    </div>
  );
}

type BookingStatus = "pending" | "confirmed" | "returned" | "cancelled";
type TabKey = "today" | "upcoming" | "all";

const STATUS_LABELS: Record<BookingStatus, { th: string; en: string; dot: string }> = {
  pending:   { th: "รอยืนยัน",    en: "Pending",   dot: "bg-yellow-400" },
  confirmed: { th: "กำลังใช้งาน", en: "In Use",    dot: "bg-blue-400" },
  returned:  { th: "คืนแล้ว",     en: "Returned",  dot: "bg-emerald-400" },
  cancelled: { th: "ยกเลิก",      en: "Cancelled", dot: "bg-red-400" },
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function FuelDots({ level }: { level: number }) {
  const filled = Math.round(level / 20); // 0–5 dots
  const color = level < 25 ? "bg-red-400" : level < 50 ? "bg-yellow-400" : "bg-forest-green";
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < filled ? color : "bg-neutral-gray/20"}`} />
      ))}
      <span className={`text-caption font-dm-sans ml-1 ${level < 25 ? "text-red-500" : level < 50 ? "text-yellow-600" : "text-forest-green"}`}>
        {level}%
      </span>
    </div>
  );
}

export default function StatusPage() {
  const { lang } = useLang();
  const [tab, setTab] = useState<TabKey>("today");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allReturned, setAllReturned] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [washingId, setWashingId] = useState<string | null>(null);

  // Stable date string — recalculate only on mount, not every render
  const today = useState(() => new Date().toISOString().split("T")[0])[0];
  const yearStart = today.slice(0, 4) + "-01-01";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/bookings?";
      if (tab === "today") url += `date=${today}`;
      else if (tab === "upcoming") url += `from=${today}&status=pending,confirmed`;
      else url += `from=${yearStart}`;

      const [bRes, vRes, retRes] = await Promise.all([
        fetch(url), fetch("/api/vehicles"),
        fetch(`/api/bookings?status=returned&from=${yearStart}`),
      ]);
      const [bData, vData, retData] = await Promise.all([bRes.json(), vRes.json(), retRes.json()]);
      setBookings(bData.bookings || []);
      setAllReturned(retData.bookings || []);
      setVehicles((vData.vehicles || []).filter((v: Vehicle) => v.is_active));
    } catch { /* silent */ } finally { setLoading(false); }
  }, [tab, today, yearStart]);

  useEffect(() => { load(); }, [load]);

  const vehicleLastReturn = new Map<string, Booking>();
  allReturned.forEach((b) => {
    const prev = vehicleLastReturn.get(b.vehicle_id);
    if (!prev || (b.returned_at ?? "") > (prev.returned_at ?? "")) vehicleLastReturn.set(b.vehicle_id, b);
  });

  const todayBookings = tab === "today" ? bookings : bookings.filter((b) => b.booking_date === today);
  const vehicleActiveBooking = new Map<string, Booking>();
  vehicles.forEach((v) => {
    const active = todayBookings.find((b) => b.vehicle_id === v.id && (b.status === "confirmed" || b.status === "pending"));
    if (active) vehicleActiveBooking.set(v.id, active);
  });

  async function markWashed(vehicleId: string) {
    setWashingId(vehicleId);
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "washed" }),
      });
      if (!res.ok) throw new Error();
      setVehicles((vs) => vs.map((v) => v.id === vehicleId ? { ...v, last_washed_at: new Date().toISOString() } : v));
      toast.success(lang === "th" ? "บันทึกการล้างรถแล้ว" : "Car wash recorded");
    } catch {
      toast.error(lang === "th" ? "บันทึกไม่สำเร็จ" : "Failed to record");
    } finally { setWashingId(null); }
  }

  const TABS: { key: TabKey; th: string; en: string }[] = [
    { key: "today", th: "วันนี้", en: "Today" },
    { key: "upcoming", th: "ที่กำลังมา", en: "Upcoming" },
    { key: "all", th: "ทั้งหมด", en: "All" },
  ];

  return (
    <main className="min-h-screen bg-linen px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-caption text-neutral-gray hover:text-forest-green transition-colors">
              {lang === "th" ? "← กลับ" : "← Back"}
            </Link>
            <LangToggle />
          </div>
        </div>

        <h1 className="text-h1 font-semibold text-forest-green">
          {lang === "th" ? "สถานะรถ" : "Fleet Status"}
        </h1>

        {/* Vehicle Cards */}
        <div className="space-y-3">
          {vehicles.map((v) => {
            const activeBooking = vehicleActiveBooking.get(v.id);
            const lastReturn = vehicleLastReturn.get(v.id);
            const isAvailable = !activeBooking;
            const washDays = daysSince(v.last_washed_at);
            const washAlert = washDays === null || washDays >= 15;
            const fuelLevel = lastReturn?.fuel_level_return ?? null;
            const parkingFloor = activeBooking?.parking_floor || lastReturn?.parking_floor || null;

            return (
              <div key={v.id} className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
                {/* Top strip */}
                <div className={`h-1 w-full ${isAvailable ? "bg-emerald-400" : "bg-blue-400"}`} />

                <div className="p-4 flex gap-4">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    {v.image_url ? (
                      <Image src={v.image_url} alt={v.license_plate} width={64} height={64}
                        className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-forest-green/10 flex items-center justify-center">
                        <svg width="36" height="28" viewBox="0 0 48 38" fill="none">
                          <path d="M6 26L6 31Q6 33 8 33L11 33M37 33L40 33Q42 33 42 31L42 26" stroke="#35654E" strokeWidth="2.2" strokeLinecap="round"/>
                          <path d="M4 26L44 26L44 21L39 12Q38 10 36 10L12 10Q10 10 9 12L4 21Z" fill="#35654E" fillOpacity="0.12" stroke="#35654E" strokeWidth="2.2" strokeLinejoin="round"/>
                          <path d="M14 10 L11 20 L37 20 L34 10 Z" fill="#35654E" fillOpacity="0.15"/>
                          <circle cx="13" cy="31" r="4.5" fill="#35654E" fillOpacity="0.15" stroke="#35654E" strokeWidth="2"/>
                          <circle cx="13" cy="31" r="2" fill="#35654E" fillOpacity="0.5"/>
                          <circle cx="35" cy="31" r="4.5" fill="#35654E" fillOpacity="0.15" stroke="#35654E" strokeWidth="2"/>
                          <circle cx="35" cy="31" r="2" fill="#35654E" fillOpacity="0.5"/>
                          <path d="M30 5 C30 5 35 3 36 7 C37 11 32 12 30 10 C28 8 30 5 30 5Z" fill="#35654E" fillOpacity="0.6"/>
                          <path d="M30 5 L31.5 10" stroke="#35654E" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name + status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-dm-sans font-bold text-body text-dark-text">{v.license_plate}</span>
                        <span className={`text-caption font-medium px-2 py-0.5 rounded-full ${
                          isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {isAvailable ? (lang === "th" ? "ว่าง" : "Available") : (lang === "th" ? "ใช้งานอยู่" : "In Use")}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Parking */}
                      <div className="bg-linen rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-neutral-gray mb-0.5">{lang === "th" ? "จอดรถ" : "Parked"}</p>
                        <p className="font-dm-sans font-semibold text-caption text-dark-text">{parkingFloor || "—"}</p>
                      </div>

                      {/* Fuel */}
                      <div className="bg-linen rounded-lg px-2 py-1.5 text-center">
                        <p className="text-[10px] text-neutral-gray mb-0.5">{lang === "th" ? "น้ำมัน" : "Fuel"}</p>
                        {fuelLevel != null ? (
                          <div className="flex justify-center">
                            <FuelDots level={fuelLevel} />
                          </div>
                        ) : (
                          <p className="font-dm-sans text-caption text-neutral-gray">—</p>
                        )}
                      </div>

                      {/* Wash */}
                      <div className={`rounded-lg px-2 py-1.5 text-center ${washAlert ? "bg-orange-50" : "bg-linen"}`}>
                        <p className="text-[10px] text-neutral-gray mb-0.5">{lang === "th" ? "ล้างรถ" : "Washed"}</p>
                        <p className={`font-dm-sans font-semibold text-caption ${washAlert ? "text-orange-500" : "text-dark-text"}`}>
                          {washDays === null ? (lang === "th" ? "ไม่มีข้อมูล" : "No data") :
                           washDays === 0 ? (lang === "th" ? "วันนี้" : "Today") :
                           `${washDays}${lang === "th" ? " วัน" : "d"}`}
                          {washAlert && washDays !== 0 && " ⚠"}
                        </p>
                      </div>
                    </div>

                    {/* Wash button */}
                    <div className="mt-2.5 flex justify-end">
                      <button
                        onClick={() => markWashed(v.id)}
                        disabled={washingId === v.id}
                        className="text-caption px-3 py-1 rounded-lg border border-forest-green/50 text-forest-green hover:bg-forest-green hover:text-white transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {washingId === v.id ? <LoadingSpinner size={12} /> : (
                          <>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/><path d="M8 12l3 3 5-5"/>
                            </svg>
                            {lang === "th" ? "บันทึกล้างแล้ว" : "Mark washed"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parking photo — only show if url is a real non-empty string */}
                {lastReturn?.return_image_url?.startsWith("/") || lastReturn?.return_image_url?.startsWith("http") ? (
                  <div className="px-4 pb-4">
                    <div className="border-t border-neutral-gray/15 pt-3">
                      <p className="text-[10px] text-neutral-gray mb-2">
                        {lang === "th" ? "ภาพที่จอดล่าสุด" : "Last parking photo"}
                        {lastReturn.returned_at && (
                          <span className="font-dm-sans ml-1.5 text-neutral-gray/70">
                            · {formatDate(lastReturn.returned_at.slice(0, 10), lang)}
                          </span>
                        )}
                      </p>
                      <a href={lastReturn.return_image_url} target="_blank" rel="noopener noreferrer">
                        <Image
                          src={lastReturn.return_image_url}
                          alt={lang === "th" ? "ภาพที่จอดรถ" : "Parking photo"}
                          width={400} height={200}
                          className="w-full h-36 object-cover rounded-xl hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Bookings */}
        <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
          {/* Tabs */}
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3 text-caption font-semibold transition-colors border-b-2 ${
                  tab === t.key
                    ? "border-forest-green text-forest-green"
                    : "border-transparent text-neutral-gray hover:text-dark-text"
                }`}
              >
                {lang === "th" ? t.th : t.en}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : bookings.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-neutral-gray text-caption">{lang === "th" ? "ไม่มีข้อมูลการจอง" : "No bookings found"}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-gray/10">
              {bookings.map((b) => {
                const s = STATUS_LABELS[b.status as BookingStatus] ?? STATUS_LABELS.confirmed;
                return (
                  <div key={b.id} className="px-4 py-3.5 hover:bg-linen/50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-dm-sans font-semibold text-caption text-dark-text">
                              {b.vehicles?.license_plate ?? "—"}
                              <span className="font-normal text-neutral-gray ml-2">{lang === "th" ? s.th : s.en}</span>
                            </p>
                            <p className="text-caption text-dark-text/70 mt-0.5 truncate">{b.booker_name}</p>
                            {b.destination && (
                              <p className="text-caption text-neutral-gray truncate">{b.destination}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-caption font-dm-sans text-dark-text">{formatDate(b.booking_date, lang)}</p>
                            <p className="text-caption font-dm-sans text-neutral-gray">
                              {b.booking_time?.slice(0, 5)}{b.booking_time_end ? `–${b.booking_time_end.slice(0, 5)}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
