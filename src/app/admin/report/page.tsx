"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatDate } from "@/lib/utils";
import { useLang, T } from "@/lib/lang";
import type { Booking, BookingStatus } from "@/types";

const STATUS_DOT: Record<BookingStatus, string> = {
  pending:   "bg-yellow-400",
  confirmed: "bg-blue-400",
  returned:  "bg-emerald-400",
  cancelled: "bg-red-400",
};

const STATUS_PILL: Record<BookingStatus, string> = {
  pending:   "bg-yellow-50 text-yellow-700",
  confirmed: "bg-blue-50 text-blue-700",
  returned:  "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

interface VehicleStat {
  vehicle_id: string;
  license_plate: string;
  count: number;
  returned_count: number;
  total_mileage: number;
  fuel_fills: FuelFill[];
  fuel_total_liters: number;
}

interface FuelFill {
  id: string;
  date: string;
  liters: number;
  amount: number;
  note: string;
}

type TabKey = "daily" | "monthly" | "expense";

export default function ReportPage() {
  const { lang } = useLang();
  const t = T.report[lang];

  const STATUS_LABELS: Record<BookingStatus, string> = {
    pending: t.statusPending,
    confirmed: t.statusConfirmed,
    returned: t.statusReturned,
    cancelled: t.statusCancelled,
  };

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.slice(0, 7);

  const [tab, setTab] = useState<TabKey>("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<VehicleStat[]>([]);
  const [loading, setLoading] = useState(false);

  const [fuelRate, setFuelRate] = useState("");
  const [fuelConsumption, setFuelConsumption] = useState("");
  const [tollTotal, setTollTotal] = useState("");
  const [newFill, setNewFill] = useState({ vehicle_id: "", date: today, liters: "", amount: "", note: "" });

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else loadMonthly();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedDate, selectedMonth]);

  async function loadDaily() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch { toast.error(t.loadError); }
    finally { setLoading(false); }
  }

  async function loadMonthly() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?month=${selectedMonth}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const bk: Booking[] = data.bookings || [];
      setBookings(bk);
      const map: Record<string, VehicleStat> = {};
      bk.forEach((b) => {
        if (!map[b.vehicle_id]) {
          map[b.vehicle_id] = {
            vehicle_id: b.vehicle_id,
            license_plate: b.vehicles?.license_plate || b.vehicle_id,
            count: 0, returned_count: 0, total_mileage: 0,
            fuel_fills: [], fuel_total_liters: 0,
          };
        }
        map[b.vehicle_id].count++;
        if (b.status === "returned") map[b.vehicle_id].returned_count++;
        if (b.mileage_in != null && b.mileage_out != null)
          map[b.vehicle_id].total_mileage += b.mileage_in - b.mileage_out;
      });
      setStats(Object.values(map).sort((a, b) => a.license_plate.localeCompare(b.license_plate)));
    } catch { toast.error(t.loadError); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const headers = [t.colPlate, t.colName, t.colDate, t.colTime, t.colParking, t.colStatus, t.colMileOut, t.colMileIn];
    const rows = bookings.map((b) => [
      b.vehicles?.license_plate || "", b.booker_name, b.booking_date,
      b.booking_time?.slice(0, 5) || "", b.parking_floor || "",
      STATUS_LABELS[b.status] || b.status, b.mileage_out || "", b.mileage_in || "",
    ]);
    downloadCSV([headers, ...rows], `greenergy-${selectedDate || selectedMonth}.csv`);
    toast.success(t.toastExport);
  }

  function exportMonthlySummaryCSV() {
    const headers = [t.colPlate, t.colUsage, t.colReturnedCount, t.colMileTotal, t.colFuel];
    const rows = stats.map((s) => [s.license_plate, s.count, s.returned_count, s.total_mileage, s.fuel_total_liters.toFixed(2)]);
    downloadCSV([headers, ...rows], `greenergy-monthly-${selectedMonth}.csv`);
    toast.success(t.toastExportMonthly);
  }

  function downloadCSV(data: (string | number)[][], filename: string) {
    const csv = data.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function addFuelFill() {
    if (!newFill.vehicle_id || !newFill.liters || !newFill.amount) { toast.error(t.errFuelMissing); return; }
    const liters = Number(newFill.liters), amount = Number(newFill.amount);
    if (liters <= 0 || amount <= 0) { toast.error(t.errFuelZero); return; }
    setStats((prev) => prev.map((s) => {
      if (s.vehicle_id !== newFill.vehicle_id) return s;
      const fill: FuelFill = { id: Date.now().toString(), date: newFill.date, liters, amount, note: newFill.note };
      return { ...s, fuel_fills: [...s.fuel_fills, fill], fuel_total_liters: s.fuel_total_liters + liters };
    }));
    setNewFill((f) => ({ ...f, liters: "", amount: "", note: "" }));
    toast.success(t.toastFuelAdded);
  }

  function removeFuelFill(vehicle_id: string, fill_id: string) {
    setStats((prev) => prev.map((s) => {
      if (s.vehicle_id !== vehicle_id) return s;
      const removed = s.fuel_fills.find((f) => f.id === fill_id);
      return { ...s, fuel_fills: s.fuel_fills.filter((f) => f.id !== fill_id), fuel_total_liters: s.fuel_total_liters - (removed?.liters || 0) };
    }));
  }

  const totalMileage = stats.reduce((s, v) => s + v.total_mileage, 0);
  const totalFuelLiters = stats.reduce((s, v) => s + v.fuel_total_liters, 0);
  const fuelCost = fuelRate && fuelConsumption && totalMileage ? (totalMileage / Number(fuelConsumption)) * Number(fuelRate) : 0;
  const grandTotal = fuelCost + Number(tollTotal || 0);

  const TABS: { key: TabKey; label: string }[] = [
    { key: "daily", label: t.tabDaily },
    { key: "monthly", label: t.tabMonthly },
    { key: "expense", label: t.tabExpense },
  ];

  return (
    <AdminLayout>
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-h1 font-semibold text-forest-green">{t.title}</h2>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-neutral-gray/30 mb-6 flex overflow-hidden">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-3 text-caption font-semibold transition-colors border-b-2 ${
              tab === tb.key
                ? "border-forest-green text-forest-green bg-forest-green/5"
                : "border-transparent text-neutral-gray hover:text-dark-text"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ===== Daily ===== */}
      {tab === "daily" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-neutral-gray/30 px-4 py-3 flex flex-wrap gap-2 items-center">
            <input type="date" className="input-field font-dm-sans w-auto" value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)} />
            <button className="btn-secondary py-2 px-4" onClick={loadDaily}>{t.btnReload}</button>
            <button className="btn-secondary py-2 px-4" onClick={exportCSV}>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {t.btnExportCSV}
              </span>
            </button>
          </div>

          {/* Status summary */}
          {!loading && bookings.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {(["pending","confirmed","returned","cancelled"] as BookingStatus[]).map((s) => (
                <div key={s} className="bg-white rounded-2xl border border-neutral-gray/30 py-4 text-center">
                  <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${STATUS_DOT[s]}`} />
                  <p className="text-display font-dm-sans font-bold text-dark-text leading-none">
                    {bookings.filter((b) => b.status === s).length}
                  </p>
                  <p className="text-[10px] text-neutral-gray mt-1">{STATUS_LABELS[s]}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : bookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-gray/30 text-center py-16 text-neutral-gray text-caption">{t.noDataDaily}</div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-caption">
                  <thead>
                    <tr className="border-b border-neutral-gray/20 bg-linen/60">
                      <Th>{t.colPlate}</Th><Th>{t.colName}</Th><Th>{t.colTime}</Th><Th>{t.colParking}</Th>
                      <Th>{t.colMileOut}</Th><Th>{t.colMileIn}</Th><Th>{t.colDist}</Th><Th>{t.colStatus}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-gray/10">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-linen/40 transition-colors">
                        <td className="py-3 px-3 font-dm-sans font-semibold text-dark-text">{b.vehicles?.license_plate}</td>
                        <td className="py-3 px-3">{b.booker_name}</td>
                        <td className="py-3 px-3 font-dm-sans text-neutral-gray">
                          {b.booking_time?.slice(0, 5)}{b.booking_time_end ? `–${b.booking_time_end.slice(0, 5)}` : ""}
                        </td>
                        <td className="py-3 px-3">{b.parking_floor || "—"}</td>
                        <td className="py-3 px-3 font-dm-sans">{b.mileage_out?.toLocaleString() || "—"}</td>
                        <td className="py-3 px-3 font-dm-sans">{b.mileage_in?.toLocaleString() || "—"}</td>
                        <td className="py-3 px-3 font-dm-sans text-forest-green font-medium">
                          {b.mileage_in != null && b.mileage_out != null
                            ? `${(b.mileage_in - b.mileage_out).toLocaleString()} ${t.distUnit}` : "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${STATUS_PILL[b.status]}`}>
                            {STATUS_LABELS[b.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Monthly ===== */}
      {tab === "monthly" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white rounded-2xl border border-neutral-gray/30 px-4 py-3 flex flex-wrap gap-2 items-center">
            <input type="month" className="input-field font-dm-sans w-auto" value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)} />
            <button className="btn-secondary py-2 px-4" onClick={loadMonthly}>{t.btnReload}</button>
            <button className="btn-secondary py-2 px-4" onClick={exportCSV}>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {t.exportDetailLabel}
              </span>
            </button>
            <button className="btn-secondary py-2 px-4" onClick={exportMonthlySummaryCSV}>
              <span className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {t.exportSummaryLabel}
              </span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-4">
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {t.summaryCards.map((label, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-neutral-gray/30 px-4 py-4 text-center">
                    <p className="text-h1 font-dm-sans font-bold text-forest-green">
                      {i === 0 ? bookings.length
                        : i === 1 ? bookings.filter((b) => b.status === "returned").length
                        : i === 2 ? totalMileage.toLocaleString()
                        : totalFuelLiters.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-neutral-gray mt-1 font-dm-sans">{t.summaryUnits[i]}</p>
                    <p className="text-caption text-dark-text/50 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Usage charts */}
              {stats.length > 0 && (
                <UsageChart stats={stats} totalMileage={totalMileage} lang={lang} />
              )}

              {/* Per-vehicle table */}
              <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-gray/15">
                  <h3 className="text-body font-semibold text-dark-text">{t.monthlySumTitle}</h3>
                </div>
                {stats.length === 0 ? (
                  <p className="text-neutral-gray text-caption py-10 text-center">{t.noMonthlyData}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-caption">
                      <thead>
                        <tr className="border-b border-neutral-gray/20 bg-linen/60">
                          <Th>{t.colPlate}</Th><Th>{t.colUsage}</Th><Th>{t.colReturnedCount}</Th>
                          <Th>{t.colMileTotal}</Th><Th>{t.colFuel}</Th><Th>{t.colShare}</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-gray/10">
                        {stats.map((s) => (
                          <tr key={s.vehicle_id} className="hover:bg-linen/40 transition-colors">
                            <td className="py-3 px-3 font-dm-sans font-semibold">{s.license_plate}</td>
                            <td className="py-3 px-3 font-dm-sans">{s.count} {t.usageUnit}</td>
                            <td className="py-3 px-3 font-dm-sans">{s.returned_count} {t.usageUnit}</td>
                            <td className="py-3 px-3 font-dm-sans">{s.total_mileage.toLocaleString()}</td>
                            <td className="py-3 px-3 font-dm-sans">{s.fuel_total_liters.toFixed(2)}</td>
                            <td className="py-3 px-3">
                              {totalMileage > 0 ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-neutral-gray/15 rounded-full h-1.5 min-w-[60px]">
                                    <div className="bg-forest-green h-1.5 rounded-full"
                                      style={{ width: `${Math.round((s.total_mileage / totalMileage) * 100)}%` }} />
                                  </div>
                                  <span className="font-dm-sans text-neutral-gray w-8 text-right">
                                    {Math.round((s.total_mileage / totalMileage) * 100)}%
                                  </span>
                                </div>
                              ) : "—"}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-linen/80 font-semibold border-t border-neutral-gray/20">
                          <td className="py-3 px-3">{t.totalRow}</td>
                          <td className="py-3 px-3 font-dm-sans">{bookings.length} {t.usageUnit}</td>
                          <td className="py-3 px-3 font-dm-sans">{bookings.filter((b) => b.status === "returned").length} {t.usageUnit}</td>
                          <td className="py-3 px-3 font-dm-sans">{totalMileage.toLocaleString()}</td>
                          <td className="py-3 px-3 font-dm-sans">{totalFuelLiters.toFixed(2)}</td>
                          <td className="py-3 px-3 font-dm-sans">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Fuel fill */}
              <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-gray/15">
                  <h3 className="text-body font-semibold text-dark-text">{t.fuelFillTitle}</h3>
                </div>
                <div className="p-5 space-y-4">
                  {stats.length > 0 && (
                    <div className="bg-linen rounded-xl p-4">
                      <p className="text-caption font-semibold text-dark-text/60 mb-3">{t.addFuelTitle}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="label">{t.labelVehicle}</label>
                          <select className="input-field font-dm-sans" value={newFill.vehicle_id}
                            onChange={(e) => setNewFill((f) => ({ ...f, vehicle_id: e.target.value }))}>
                            <option value="">{t.selectVehicle}</option>
                            {stats.map((s) => <option key={s.vehicle_id} value={s.vehicle_id}>{s.license_plate}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">{t.labelFillDate}</label>
                          <input type="date" className="input-field font-dm-sans" value={newFill.date}
                            onChange={(e) => setNewFill((f) => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">{t.labelLiters}</label>
                          <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderLiters}
                            value={newFill.liters} onChange={(e) => setNewFill((f) => ({ ...f, liters: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">{t.labelAmount}</label>
                          <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderAmount}
                            value={newFill.amount} onChange={(e) => setNewFill((f) => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="label">{t.labelNote}</label>
                          <input type="text" className="input-field" placeholder={t.placeholderNote}
                            value={newFill.note} onChange={(e) => setNewFill((f) => ({ ...f, note: e.target.value }))} />
                        </div>
                      </div>
                      <button className="btn-primary py-2 px-5" onClick={addFuelFill}>{t.btnAddFuel}</button>
                    </div>
                  )}

                  {stats.some((s) => s.fuel_fills.length > 0) ? (
                    <div className="space-y-4">
                      {stats.filter((s) => s.fuel_fills.length > 0).map((s) => (
                        <div key={s.vehicle_id}>
                          <p className="text-caption font-semibold font-dm-sans text-dark-text mb-2">{s.license_plate}</p>
                          <div className="overflow-x-auto rounded-xl border border-neutral-gray/20">
                            <table className="w-full text-caption">
                              <thead>
                                <tr className="border-b border-neutral-gray/20 bg-linen/60">
                                  <Th>{t.colFuelDate}</Th><Th>{t.colFuelLiters}</Th><Th>{t.colFuelAmount}</Th><Th>{t.colFuelNote}</Th><th />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-gray/10">
                                {s.fuel_fills.map((f) => (
                                  <tr key={f.id}>
                                    <td className="py-2.5 px-3 font-dm-sans">{formatDate(f.date, lang)}</td>
                                    <td className="py-2.5 px-3 font-dm-sans">{f.liters.toFixed(2)} {t.fuelUnit}</td>
                                    <td className="py-2.5 px-3 font-dm-sans">{f.amount.toLocaleString()} {t.fuelBaht}</td>
                                    <td className="py-2.5 px-3 text-neutral-gray">{f.note || "—"}</td>
                                    <td className="py-2.5 px-3">
                                      <button onClick={() => removeFuelFill(s.vehicle_id, f.id)}
                                        className="text-red-400 hover:text-red-600 transition-colors text-caption">
                                        {t.btnDeleteFuel}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-linen/60 font-semibold">
                                  <td className="py-2.5 px-3">{t.fuelTotalRow}</td>
                                  <td className="py-2.5 px-3 font-dm-sans">{s.fuel_total_liters.toFixed(2)} {t.fuelUnit}</td>
                                  <td className="py-2.5 px-3 font-dm-sans">
                                    {s.fuel_fills.reduce((sum, f) => sum + f.amount, 0).toLocaleString()} {t.fuelBaht}
                                  </td>
                                  <td colSpan={2} />
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-caption text-neutral-gray text-center py-4">{t.noFuelData}</p>
                  )}
                </div>
              </div>

              {/* All bookings table */}
              {bookings.length > 0 && (
                <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
                  <div className="px-5 py-4 border-b border-neutral-gray/15">
                    <h3 className="text-body font-semibold text-dark-text">{t.allBookingsTitle}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-caption">
                      <thead>
                        <tr className="border-b border-neutral-gray/20 bg-linen/60">
                          <Th>{t.colDate}</Th><Th>{t.colPlate}</Th><Th>{t.colName}</Th><Th>{t.colTime}</Th>
                          <Th>{t.colMileOut}</Th><Th>{t.colMileIn}</Th><Th>{t.colStatus}</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-gray/10">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-linen/40 transition-colors">
                            <td className="py-3 px-3 font-dm-sans">{formatDate(b.booking_date, lang)}</td>
                            <td className="py-3 px-3 font-dm-sans font-semibold">{b.vehicles?.license_plate}</td>
                            <td className="py-3 px-3">{b.booker_name}</td>
                            <td className="py-3 px-3 font-dm-sans text-neutral-gray">
                              {b.booking_time?.slice(0, 5)}{b.booking_time_end ? `–${b.booking_time_end.slice(0, 5)}` : ""}
                            </td>
                            <td className="py-3 px-3 font-dm-sans">{b.mileage_out?.toLocaleString() || "—"}</td>
                            <td className="py-3 px-3 font-dm-sans">{b.mileage_in?.toLocaleString() || "—"}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-caption font-medium ${STATUS_PILL[b.status]}`}>
                                {STATUS_LABELS[b.status]}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== Expense ===== */}
      {tab === "expense" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-neutral-gray/30 px-4 py-3 flex flex-wrap gap-2 items-center">
            <input type="month" className="input-field font-dm-sans w-auto" value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)} />
            <button className="btn-secondary py-2 px-4" onClick={loadMonthly}>{t.btnReload}</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input card */}
            <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-gray/15">
                <h3 className="text-body font-semibold text-dark-text">{t.expenseTitle}</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="label">{t.labelFuelRate}</label>
                  <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderFuelRate}
                    value={fuelRate} onChange={(e) => setFuelRate(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t.labelConsumption}</label>
                  <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderConsumption}
                    value={fuelConsumption} onChange={(e) => setFuelConsumption(e.target.value)} />
                </div>
                <div>
                  <label className="label">{t.labelToll}</label>
                  <input type="number" className="input-field font-dm-sans" placeholder="0"
                    value={tollTotal} onChange={(e) => setTollTotal(e.target.value)} />
                </div>

                {stats.length > 0 && (
                  <div className="border-t border-neutral-gray/20 pt-4">
                    <p className="text-caption font-semibold text-dark-text/60 mb-3">{t.addFuelTitle}</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="label">{t.labelVehicle}</label>
                        <select className="input-field font-dm-sans" value={newFill.vehicle_id}
                          onChange={(e) => setNewFill((f) => ({ ...f, vehicle_id: e.target.value }))}>
                          <option value="">{t.selectVehicle}</option>
                          {stats.map((s) => <option key={s.vehicle_id} value={s.vehicle_id}>{s.license_plate}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t.labelLiters}</label>
                        <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderLiters}
                          value={newFill.liters} onChange={(e) => setNewFill((f) => ({ ...f, liters: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">{t.labelAmount}</label>
                        <input type="number" className="input-field font-dm-sans" placeholder={t.placeholderAmount}
                          value={newFill.amount} onChange={(e) => setNewFill((f) => ({ ...f, amount: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">{t.labelFillDate}</label>
                        <input type="date" className="input-field font-dm-sans" value={newFill.date}
                          onChange={(e) => setNewFill((f) => ({ ...f, date: e.target.value }))} />
                      </div>
                    </div>
                    <button className="btn-primary py-2 px-5 text-caption" onClick={addFuelFill}>{t.btnAddFuel}</button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-gray/15">
                <h3 className="text-body font-semibold text-dark-text">{t.expenseSummaryTitle}</h3>
              </div>
              <div className="p-5">
                {loading ? <LoadingSpinner /> : (
                  <div className="space-y-2.5">
                    {stats.map((s) => (
                      <div key={s.vehicle_id} className="flex justify-between text-caption border-b border-neutral-gray/15 pb-2.5">
                        <span className="font-dm-sans font-semibold">{s.license_plate}</span>
                        <div className="text-right">
                          <span className="font-dm-sans">{s.total_mileage.toLocaleString()} {t.distUnit}</span>
                          {s.fuel_total_liters > 0 && (
                            <span className="text-forest-green ml-2">({s.fuel_total_liters.toFixed(1)} {t.fuelUnit})</span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-caption pt-1">
                      <span className="text-dark-text/60">{t.totalMileLabel}</span>
                      <span className="font-dm-sans font-semibold">{totalMileage.toLocaleString()} {t.distUnit}</span>
                    </div>
                    {totalFuelLiters > 0 && (
                      <div className="flex justify-between text-caption">
                        <span className="text-dark-text/60">{t.fuelActual}</span>
                        <span className="font-dm-sans text-forest-green">{totalFuelLiters.toFixed(2)} {t.fuelUnit}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-caption">
                      <span className="text-dark-text/60">{t.fuelEstLabel}</span>
                      <span className="font-dm-sans">{fuelCost.toFixed(2)} {t.fuelBaht}</span>
                    </div>
                    <div className="flex justify-between text-caption">
                      <span className="text-dark-text/60">{t.tollLabel}</span>
                      <span className="font-dm-sans">{Number(tollTotal || 0).toLocaleString()} {t.fuelBaht}</span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-gray/20 pt-3 mt-1">
                      <span className="text-body font-semibold">{t.grandTotal}</span>
                      <span className="font-dm-sans text-h2 font-bold text-forest-green">{grandTotal.toFixed(2)} {t.fuelBaht}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2.5 px-3 font-semibold text-dark-text/60 text-left text-caption">{children}</th>;
}

// ─── Charts ───────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#35654E", "#5A8C72", "#8BB8A0", "#B8D4C8"];

interface UsageChartProps {
  stats: VehicleStat[];
  totalMileage: number;
  lang: "th" | "en";
}

function UsageChart({ stats, totalMileage, lang }: UsageChartProps) {
  if (stats.length === 0) return null;

  const maxCount = Math.max(...stats.map((s) => s.count), 1);
  const maxMile  = Math.max(...stats.map((s) => s.total_mileage), 1);

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-gray/15 flex items-center justify-between">
        <h3 className="text-body font-semibold text-dark-text">
          {lang === "th" ? "สถิติการใช้งาน" : "Usage Statistics"}
        </h3>
        <span className="text-caption text-neutral-gray font-dm-sans">
          {lang === "th" ? `รวม ${totalMileage.toLocaleString()} กม.` : `Total ${totalMileage.toLocaleString()} km`}
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* ── Bar chart: จำนวนครั้ง ── */}
        <div>
          <p className="text-caption font-semibold text-dark-text/60 mb-4">
            {lang === "th" ? "จำนวนครั้งที่ใช้งาน" : "Number of Trips"}
          </p>
          <div className="space-y-3">
            {stats.map((s, i) => {
              const pct = Math.round((s.count / maxCount) * 100);
              return (
                <div key={s.vehicle_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-dm-sans text-caption font-semibold text-dark-text">{s.license_plate}</span>
                    <span className="font-dm-sans text-caption text-neutral-gray">{s.count} {lang === "th" ? "ครั้ง" : "trips"}</span>
                  </div>
                  <div className="h-7 bg-linen rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center pl-3 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {pct >= 30 && (
                        <span className="text-white font-dm-sans text-[11px] font-semibold">{pct}%</span>
                      )}
                    </div>
                    {pct < 30 && (
                      <span className="absolute left-[calc(${pct}%+8px)] top-1/2 -translate-y-1/2 font-dm-sans text-[11px] text-neutral-gray ml-1"
                        style={{ left: `calc(${Math.max(pct, 8)}% + 8px)` }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bar chart: ระยะทาง ── */}
        <div>
          <p className="text-caption font-semibold text-dark-text/60 mb-4">
            {lang === "th" ? "ระยะทางรวม (กม.)" : "Total Distance (km)"}
          </p>
          <div className="space-y-3">
            {stats.map((s, i) => {
              const pct = maxMile > 0 ? Math.round((s.total_mileage / maxMile) * 100) : 0;
              return (
                <div key={s.vehicle_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-dm-sans text-caption font-semibold text-dark-text">{s.license_plate}</span>
                    <span className="font-dm-sans text-caption text-neutral-gray">{s.total_mileage.toLocaleString()} {lang === "th" ? "กม." : "km"}</span>
                  </div>
                  <div className="h-7 bg-linen rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center pl-3 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 8)}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {pct >= 30 && (
                        <span className="text-white font-dm-sans text-[11px] font-semibold">{pct}%</span>
                      )}
                    </div>
                    {pct < 30 && (
                      <span className="font-dm-sans text-[11px] text-neutral-gray absolute top-1/2 -translate-y-1/2"
                        style={{ left: `calc(${Math.max(pct, 8)}% + 8px)` }}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Donut chart: สัดส่วนระยะทาง ── */}
        <div className="sm:col-span-2">
          <p className="text-caption font-semibold text-dark-text/60 mb-4">
            {lang === "th" ? "สัดส่วนการใช้งานแต่ละคัน" : "Usage Share per Vehicle"}
          </p>
          <DonutChart stats={stats} totalMileage={totalMileage} lang={lang} />
        </div>

      </div>
    </div>
  );
}

function DonutChart({ stats, totalMileage, lang }: UsageChartProps) {
  const cx = 80, cy = 80, r = 56, strokeW = 20;
  const circumference = 2 * Math.PI * r;
  const GAP = 3; // px gap between slices

  // Build slices with correct SVG strokeDashoffset
  // SVG starts drawing at 3 o'clock; rotate -90deg to start at 12 o'clock
  let cumulative = 0;
  const slices = stats.map((s, i) => {
    const share = totalMileage > 0 ? s.total_mileage / totalMileage : 1 / stats.length;
    const dashLen = Math.max(0, share * circumference - GAP);
    // dashOffset: how far to skip around the circle before this slice starts
    const dashOffset = circumference - cumulative * circumference + circumference / 4;
    cumulative += share;
    return { s, share, dashLen, dashOffset, color: CHART_COLORS[i % CHART_COLORS.length] };
  });

  const topVehicle = stats.reduce((a, b) => (a.total_mileage >= b.total_mileage ? a : b), stats[0]);
  const topShare = totalMileage > 0 ? Math.round((topVehicle.total_mileage / totalMileage) * 100) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* background ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E2E0D8" strokeWidth={strokeW} />
          {slices.map(({ s, dashLen, dashOffset, color }) => (
            <circle
              key={s.vehicle_id}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={color}
              strokeWidth={strokeW}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          ))}
        </svg>
        {/* center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-dm-sans font-bold text-[20px] leading-none text-dark-text">{topShare}%</span>
          <span className="font-dm-sans text-[10px] text-neutral-gray mt-0.5">{topVehicle.license_plate}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 flex-1">
        {slices.map(({ s, share, color }) => (
          <div key={s.vehicle_id} className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0">
              <p className="font-dm-sans font-semibold text-caption text-dark-text">{s.license_plate}</p>
              <p className="font-dm-sans text-[10px] text-neutral-gray">
                {Math.round(share * 100)}% · {s.total_mileage.toLocaleString()} {lang === "th" ? "กม." : "km"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
