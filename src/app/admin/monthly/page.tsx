"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatThaiDate } from "@/lib/utils";
import { useLang, T } from "@/lib/lang";
import type { Booking, BookingStatus } from "@/types";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  returned: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

interface VehicleStat {
  vehicle_id: string;
  license_plate: string;
  total: number;
  returned: number;
  cancelled: number;
  total_mileage: number;
  trips: Booking[];
}

interface UserStat {
  name: string;
  phone: string;
  count: number;
  mileage: number;
}

function getMonthLabel(monthStr: string, lang: "th" | "en") {
  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const enMonths = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  const [y, m] = monthStr.split("-");
  const names = lang === "th" ? thaiMonths : enMonths;
  return `${names[parseInt(m) - 1]} ${parseInt(y)}`;
}

export default function MonthlyPage() {
  const { lang } = useLang();
  const t = T.monthly[lang];

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const STATUS_LABELS: Record<BookingStatus, string> = {
    pending: t.statusPending,
    confirmed: t.statusConfirmed,
    returned: t.statusReturned,
    cancelled: t.statusCancelled,
  };

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehicleStats, setVehicleStats] = useState<VehicleStat[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [tollTotal, setTollTotal] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?month=${selectedMonth}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const bk: Booking[] = data.bookings || [];
      setBookings(bk);
      computeStats(bk);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, lang]);

  useEffect(() => { loadData(); }, [loadData]);

  function computeStats(bk: Booking[]) {
    // Vehicle stats
    const vMap: Record<string, VehicleStat> = {};
    bk.forEach((b) => {
      if (!vMap[b.vehicle_id]) {
        vMap[b.vehicle_id] = {
          vehicle_id: b.vehicle_id,
          license_plate: b.vehicles?.license_plate || b.vehicle_id,
          total: 0, returned: 0, cancelled: 0,
          total_mileage: 0, trips: [],
        };
      }
      vMap[b.vehicle_id].total++;
      if (b.status === "returned") {
        vMap[b.vehicle_id].returned++;
        if (b.mileage_out && b.mileage_in)
          vMap[b.vehicle_id].total_mileage += b.mileage_in - b.mileage_out;
      }
      if (b.status === "cancelled") vMap[b.vehicle_id].cancelled++;
      vMap[b.vehicle_id].trips.push(b);
    });
    setVehicleStats(
      Object.values(vMap).sort((a, b) => b.total_mileage - a.total_mileage)
    );

    // User stats
    const uMap: Record<string, UserStat> = {};
    bk.forEach((b) => {
      const key = b.booker_phone;
      if (!uMap[key]) uMap[key] = { name: b.booker_name, phone: b.booker_phone, count: 0, mileage: 0 };
      uMap[key].count++;
      if (b.mileage_out && b.mileage_in) uMap[key].mileage += b.mileage_in - b.mileage_out;
    });
    setUserStats(Object.values(uMap).sort((a, b) => b.count - a.count));
  }

  function exportCSV() {
    const thHeaders = ["วันที่", "ทะเบียน", "ชื่อ", "เบอร์", "เวลาเริ่ม", "เวลาสิ้นสุด", "ชั้นจอด", "ไมล์ขาไป", "ไมล์ขากลับ", `ระยะ (${t.mileUnit})`, t.colStatus];
    const enHeaders = ["Date", "Plate", "Name", "Phone", "Start Time", "End Time", "Parking", "Mile Out", "Mile In", `Distance (${t.mileUnit})`, t.colStatus];
    const headers = lang === "th" ? thHeaders : enHeaders;
    const rows = bookings.map((b) => [
      b.booking_date,
      b.vehicles?.license_plate || "",
      b.booker_name,
      b.booker_phone,
      b.booking_time?.slice(0, 5) || "",
      b.booking_time_end?.slice(0, 5) || "",
      b.parking_floor || "",
      b.mileage_out || "",
      b.mileage_in || "",
      b.mileage_out && b.mileage_in ? b.mileage_in - b.mileage_out : "",
      STATUS_LABELS[b.status],
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenergy-summary-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.toastExport);
  }

  const totalMileage = vehicleStats.reduce((s, v) => s + v.total_mileage, 0);
  const totalReturned = bookings.filter((b) => b.status === "returned").length;
  const totalCancelled = bookings.filter((b) => b.status === "cancelled").length;
  const totalPending = bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length;
  const completionRate = bookings.length > 0 ? Math.round((totalReturned / bookings.length) * 100) : 0;
  const tollAmount = Number(tollTotal) || 0;

  // Busiest days
  const dayCount: Record<string, number> = {};
  bookings.forEach((b) => { dayCount[b.booking_date] = (dayCount[b.booking_date] || 0) + 1; });
  const busiestDays = Object.entries(dayCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const displayedBookings = showAllBookings ? bookings : bookings.slice(0, 8);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-h1 font-semibold text-forest-green">{t.title}</h2>
          <p className="text-caption text-neutral-gray mt-0.5">
            {selectedMonth ? getMonthLabel(selectedMonth, lang) : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            className="input-field font-dm-sans w-auto"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 btn-secondary py-2.5 px-4 text-caption"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {t.btnExport}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner /></div>
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <svg className="mx-auto mb-4 text-neutral-gray" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p className="text-body text-neutral-gray">{t.noData}</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ===== KPI Cards ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label={t.kpiTotal}
              value={bookings.length}
              unit={t.kpiUnit}
              color="text-forest-green"
              bg="bg-forest-green/8"
              icon={<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>}
            />
            <KpiCard
              label={t.kpiReturned}
              value={totalReturned}
              unit={t.kpiUnit}
              sub={`${completionRate}%`}
              color="text-blue-600"
              bg="bg-blue-50"
              icon={<><polyline points="20 6 9 17 4 12"/></>}
            />
            <KpiCard
              label={t.kpiMileage}
              value={totalMileage.toLocaleString()}
              unit={t.kpiMileUnit}
              color="text-moss-green"
              bg="bg-moss-green/10"
              icon={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
            />
            <KpiCard
              label={t.kpiCancelled}
              value={totalCancelled}
              unit={t.kpiUnit}
              sub={totalPending > 0 ? `${t.kpiPendingPre} ${totalPending}` : ""}
              color="text-red-500"
              bg="bg-red-50"
              icon={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}
            />
          </div>

          {/* ===== Toll / Expense Input ===== */}
          <div className="bg-white rounded-2xl border border-neutral-gray/40 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-desert-brown/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A9947A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
              </div>
              <h3 className="text-body font-semibold">{t.tollTitle}</h3>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="label">{t.tollLabel}</label>
                <input
                  type="number"
                  min="0"
                  className="input-field font-dm-sans"
                  placeholder={t.tollPlaceholder}
                  value={tollTotal}
                  onChange={(e) => setTollTotal(e.target.value)}
                />
              </div>
              {tollAmount > 0 && (
                <div className="flex gap-4 pb-1">
                  <div className="text-center">
                    <p className="text-caption text-neutral-gray">{t.tollTotal}</p>
                    <p className="text-h2 font-dm-sans font-semibold text-desert-brown">
                      {tollAmount.toLocaleString()} <span className="text-caption font-normal">{t.tollBaht}</span>
                    </p>
                  </div>
                  {totalMileage > 0 && (
                    <div className="text-center">
                      <p className="text-caption text-neutral-gray">{t.tollPerKm}</p>
                      <p className="text-h2 font-dm-sans font-semibold text-desert-brown">
                        {(tollAmount / totalMileage).toFixed(2)} <span className="text-caption font-normal">{t.tollBaht}</span>
                      </p>
                    </div>
                  )}
                  {bookings.length > 0 && (
                    <div className="text-center">
                      <p className="text-caption text-neutral-gray">{t.tollPerTrip}</p>
                      <p className="text-h2 font-dm-sans font-semibold text-desert-brown">
                        {(tollAmount / totalReturned || 0).toFixed(0)} <span className="text-caption font-normal">{t.tollBaht}</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== 2-column layout ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Vehicle Summary */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-forest-green/10 rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#35654E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l3 5v5h-2"/>
                    <circle cx="7.5" cy="17.5" r="1.5"/>
                    <circle cx="17.5" cy="17.5" r="1.5"/>
                  </svg>
                </div>
                <h3 className="text-body font-semibold">{t.vehicleTitle}</h3>
              </div>
              <div className="space-y-3">
                {vehicleStats.map((v, i) => (
                  <div key={v.vehicle_id} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-linen flex items-center justify-center text-caption font-dm-sans font-semibold text-dark-text/50 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-body font-dm-sans font-semibold text-dark-text">{v.license_plate}</span>
                        <span className="text-caption text-neutral-gray font-dm-sans">{v.total_mileage.toLocaleString()} {t.mileUnit}</span>
                      </div>
                      <div className="w-full bg-neutral-gray/20 rounded-full h-2">
                        <div
                          className="bg-forest-green h-2 rounded-full transition-all"
                          style={{ width: totalMileage > 0 ? `${(v.total_mileage / totalMileage) * 100}%` : "0%" }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-caption text-neutral-gray">{v.total} {t.tripsUnit}</span>
                        <span className="text-caption text-blue-500">{v.returned} {t.returnedLabel}</span>
                        {v.cancelled > 0 && <span className="text-caption text-red-400">{v.cancelled} {t.cancelledLabel}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column: user stats + busiest days */}
            <div className="space-y-4">
              {/* Top users */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-moss-green/10 rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#789474" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                  </div>
                  <h3 className="text-body font-semibold">{t.userTitle}</h3>
                </div>
                <div className="space-y-2.5">
                  {userStats.slice(0, 5).map((u, i) => (
                    <div key={u.phone} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-caption font-semibold ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-neutral-gray/20 text-dark-text/50" :
                          i === 2 ? "bg-desert-brown/20 text-desert-brown" :
                          "bg-linen text-dark-text/40"
                        }`}>
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-caption font-semibold leading-tight">{u.name}</p>
                          <p className="text-caption text-neutral-gray font-dm-sans">{u.phone}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-body font-dm-sans font-semibold text-forest-green">{u.count}</p>
                        <p className="text-caption text-neutral-gray">{t.userUnit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Busiest days */}
              {busiestDays.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-desert-brown/10 rounded-lg flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A9947A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                    </div>
                    <h3 className="text-body font-semibold">{t.busiestTitle}</h3>
                  </div>
                  <div className="space-y-2">
                    {busiestDays.map(([date, count], i) => (
                      <div key={date} className="flex items-center gap-3">
                        <div className={`w-1.5 h-8 rounded-full ${
                          i === 0 ? "bg-forest-green" : i === 1 ? "bg-moss-green" : "bg-neutral-gray/50"
                        }`}/>
                        <div className="flex-1">
                          <p className="text-caption font-semibold">{formatThaiDate(date)}</p>
                          <div className="w-full bg-neutral-gray/20 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full ${i === 0 ? "bg-forest-green" : "bg-moss-green"}`}
                              style={{ width: `${(count / busiestDays[0][1]) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-body font-dm-sans font-semibold text-forest-green w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== Completion ring ===== */}
          <div className="card">
            <h3 className="text-body font-semibold mb-4">{t.donutTitle}</h3>
            <div className="flex flex-wrap gap-6 items-center">
              {/* SVG Donut */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#E2E0D8" strokeWidth="3.5"/>
                  {/* returned */}
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#35654E" strokeWidth="3.5"
                    strokeDasharray={`${completionRate} ${100 - completionRate}`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-h1 font-dm-sans font-semibold text-forest-green">{completionRate}%</p>
                  <p className="text-caption text-neutral-gray leading-tight">{t.donutCenter}</p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 grid grid-cols-2 gap-3">
                {(["returned", "confirmed", "pending", "cancelled"] as BookingStatus[]).map((s) => {
                  const count = bookings.filter((b) => b.status === s).length;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-caption ${STATUS_COLORS[s]}`}>
                        {STATUS_LABELS[s]}
                      </span>
                      <span className="text-body font-dm-sans font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== Booking list ===== */}
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-body font-semibold">{t.listTitle} ({bookings.length} {t.listUnit})</h3>
              <span className="text-caption text-neutral-gray">{getMonthLabel(selectedMonth, lang)}</span>
            </div>
            <table className="w-full text-caption">
              <thead>
                <tr className="border-b border-neutral-gray">
                  <Th>{t.colDate}</Th><Th>{t.colPlate}</Th><Th>{t.colName}</Th><Th>{t.colTime}</Th>
                  <Th>{t.colMile}</Th><Th>{t.colStatus}</Th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-gray/30 hover:bg-linen/50 transition-colors">
                    <td className="py-2.5 px-2 font-dm-sans">{formatThaiDate(b.booking_date)}</td>
                    <td className="py-2.5 px-2 font-dm-sans font-semibold">{b.vehicles?.license_plate}</td>
                    <td className="py-2.5 px-2">{b.booker_name}</td>
                    <td className="py-2.5 px-2 font-dm-sans text-neutral-gray">
                      {b.booking_time?.slice(0, 5)}
                      {b.booking_time_end ? ` – ${b.booking_time_end.slice(0, 5)}` : ""}
                    </td>
                    <td className="py-2.5 px-2 font-dm-sans">
                      {b.mileage_out && b.mileage_in
                        ? <span className="text-moss-green font-semibold">{(b.mileage_in - b.mileage_out).toLocaleString()}</span>
                        : <span className="text-neutral-gray">—</span>}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-caption ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length > 8 && (
              <button
                onClick={() => setShowAllBookings((v) => !v)}
                className="mt-4 w-full py-2 text-caption text-moss-green hover:text-forest-green border border-neutral-gray/40 rounded-lg hover:border-forest-green transition-colors"
              >
                {showAllBookings ? t.showLess : `${t.showAll} ${bookings.length} ${t.listUnit} ↓`}
              </button>
            )}
          </div>

          {/* ===== Toll Summary (show only when entered) ===== */}
          {tollAmount > 0 && (
            <div className="bg-white rounded-2xl border border-desert-brown/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-desert-brown/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A9947A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                  </svg>
                </div>
                <h3 className="text-body font-semibold">{t.tollSummaryTitle}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-desert-brown/5 rounded-xl">
                  <p className="text-caption text-neutral-gray mb-1">{t.tollSumTotal}</p>
                  <p className="text-h1 font-dm-sans font-semibold text-desert-brown">{tollAmount.toLocaleString()}</p>
                  <p className="text-caption text-neutral-gray">{t.tollBaht}</p>
                </div>
                <div className="text-center p-3 bg-desert-brown/5 rounded-xl">
                  <p className="text-caption text-neutral-gray mb-1">{t.tollSumPerTrip}</p>
                  <p className="text-h1 font-dm-sans font-semibold text-desert-brown">
                    {totalReturned > 0 ? (tollAmount / totalReturned).toFixed(0) : "—"}
                  </p>
                  <p className="text-caption text-neutral-gray">{t.tollBahtPerTrip}</p>
                </div>
                <div className="text-center p-3 bg-desert-brown/5 rounded-xl">
                  <p className="text-caption text-neutral-gray mb-1">{t.tollSumPerKm}</p>
                  <p className="text-h1 font-dm-sans font-semibold text-desert-brown">
                    {totalMileage > 0 ? (tollAmount / totalMileage).toFixed(2) : "—"}
                  </p>
                  <p className="text-caption text-neutral-gray">{t.tollBahtPerKm}</p>
                </div>
                <div className="text-center p-3 bg-desert-brown/5 rounded-xl">
                  <p className="text-caption text-neutral-gray mb-1">{t.tollSumPerDay}</p>
                  <p className="text-h1 font-dm-sans font-semibold text-desert-brown">
                    {(tollAmount / 30).toFixed(0)}
                  </p>
                  <p className="text-caption text-neutral-gray">{t.tollBahtPerDay}</p>
                </div>
              </div>
            </div>
          )}

          {/* ===== Recommendations ===== */}
          <div className="card bg-forest-green/5 border-forest-green/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-forest-green/15 rounded-lg flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#35654E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <h3 className="text-body font-semibold text-forest-green">{t.recTitle}</h3>
            </div>
            <div className="space-y-2.5">
              {recommendations(bookings, vehicleStats, userStats, tollAmount, lang).map((r, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    r.type === "warning" ? "bg-yellow-100" : r.type === "good" ? "bg-emerald-100" : "bg-blue-100"
                  }`}>
                    <span className="text-caption">
                      {r.type === "warning" ? "⚠" : r.type === "good" ? "✓" : "→"}
                    </span>
                  </div>
                  <p className="text-caption text-dark-text/80">{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function recommendations(bookings: Booking[], vehicleStats: VehicleStat[], userStats: UserStat[], tollAmount = 0, lang: "th" | "en" = "th") {
  const recs: { type: "good" | "warning" | "info"; text: string }[] = [];
  const returned = bookings.filter((b) => b.status === "returned").length;
  const rate = bookings.length > 0 ? (returned / bookings.length) * 100 : 0;
  const isTh = lang === "th";

  if (rate >= 80) recs.push({ type: "good", text: isTh
    ? `อัตราการคืนรถสำเร็จ ${Math.round(rate)}% — ดีมาก ผู้ใช้งานให้ความร่วมมือดี`
    : `Return rate ${Math.round(rate)}% — excellent, users are very cooperative` });
  else if (rate < 60) recs.push({ type: "warning", text: isTh
    ? `อัตราการคืนรถสำเร็จต่ำ (${Math.round(rate)}%) — ควรติดตามการจองที่ค้างอยู่`
    : `Low return rate (${Math.round(rate)}%) — follow up on outstanding bookings` });

  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  if (cancelled > 3) recs.push({ type: "warning", text: isTh
    ? `มีการยกเลิก ${cancelled} ครั้ง — ควรสำรวจสาเหตุและปรับนโยบายการจอง`
    : `${cancelled} cancellations this month — review causes and consider policy adjustments` });

  const topVehicle = vehicleStats[0];
  if (topVehicle && vehicleStats.length > 1) {
    const lastVehicle = vehicleStats[vehicleStats.length - 1];
    if (topVehicle.total_mileage > lastVehicle.total_mileage * 3) {
      recs.push({ type: "warning", text: isTh
        ? `รถ ${topVehicle.license_plate} ถูกใช้งานมากกว่ารถอื่นๆ มาก — ควรกระจายการใช้งานให้สม่ำเสมอ`
        : `Vehicle ${topVehicle.license_plate} is used significantly more than others — consider distributing usage evenly` });
    }
  }

  if (topVehicle && topVehicle.total_mileage > 500) {
    recs.push({ type: "info", text: isTh
      ? `รถ ${topVehicle.license_plate} วิ่ง ${topVehicle.total_mileage.toLocaleString()} กม. ในเดือนนี้ — ควรตรวจสอบการบำรุงรักษาตามระยะ`
      : `Vehicle ${topVehicle.license_plate} drove ${topVehicle.total_mileage.toLocaleString()} km this month — check scheduled maintenance` });
  }

  if (userStats.length > 0 && userStats[0].count >= 5) {
    recs.push({ type: "info", text: isTh
      ? `${userStats[0].name} จองรถบ่อยที่สุด ${userStats[0].count} ครั้ง — อาจพิจารณาจัดรถประจำตัวให้`
      : `${userStats[0].name} booked most frequently (${userStats[0].count} trips) — consider assigning a dedicated vehicle` });
  }

  if (tollAmount > 0 && returned > 0) {
    const perTrip = (tollAmount / returned).toFixed(0);
    recs.push({ type: "info", text: isTh
      ? `ค่าทางด่วนเฉลี่ย ${perTrip} บาท/เที่ยว — รวมทั้งเดือน ${tollAmount.toLocaleString()} บาท`
      : `Average toll ${perTrip} THB/trip — total this month ${tollAmount.toLocaleString()} THB` });
  }

  if (bookings.length >= 25) recs.push({ type: "good", text: isTh
    ? `เดือนนี้มีการจองรวม ${bookings.length} ครั้ง — ระบบถูกใช้งานสูง`
    : `${bookings.length} total bookings this month — high system utilization` });
  else if (bookings.length < 10) recs.push({ type: "info", text: isTh
    ? "การจองน้อย — ลองประชาสัมพันธ์ระบบให้ทีมรับรู้มากขึ้น"
    : "Low booking volume — consider promoting the reservation system to the team" });

  if (recs.length === 0) recs.push({ type: "info", text: isTh
    ? "ข้อมูลปกติ ไม่พบความผิดปกติในเดือนนี้"
    : "All metrics look normal — no anomalies detected this month" });
  return recs;
}

function KpiCard({ label, value, unit, sub, color, bg, icon }: {
  label: string; value: string | number; unit: string; sub?: string;
  color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <div className={`card ${bg} border-0`}>
      <div className={`flex items-center gap-1.5 mb-2 ${color} opacity-70`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
        <p className="text-caption">{label}</p>
      </div>
      <p className={`font-dm-sans font-semibold ${color} leading-none`} style={{ fontSize: "26px" }}>{value}</p>
      <p className={`text-caption ${color} opacity-70 mt-0.5`}>{unit}</p>
      {sub && <p className="text-caption text-neutral-gray mt-1">{sub}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-2 font-semibold text-dark-text/60 text-left">{children}</th>;
}
