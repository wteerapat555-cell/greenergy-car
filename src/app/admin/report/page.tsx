"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatThaiDate } from "@/lib/utils";
import { useLang, T } from "@/lib/lang";
import type { Booking, BookingStatus } from "@/types";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  returned: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
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

  const [tab, setTab] = useState<"daily" | "monthly" | "expense">("daily");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<VehicleStat[]>([]);
  const [loading, setLoading] = useState(false);

  // Expense inputs
  const [fuelRate, setFuelRate] = useState("");
  const [fuelConsumption, setFuelConsumption] = useState("");
  const [tollTotal, setTollTotal] = useState("");

  const [newFill, setNewFill] = useState({ vehicle_id: "", date: today, liters: "", amount: "", note: "" });

  useEffect(() => {
    if (tab === "daily") loadDaily();
    else if (tab === "monthly" || tab === "expense") loadMonthly();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedDate, selectedMonth]);

  async function loadDaily() {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings?date=${selectedDate}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
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
        const key = b.vehicle_id;
        if (!map[key]) {
          map[key] = {
            vehicle_id: key,
            license_plate: b.vehicles?.license_plate || key,
            count: 0,
            returned_count: 0,
            total_mileage: 0,
            fuel_fills: [],
            fuel_total_liters: 0,
          };
        }
        map[key].count++;
        if (b.status === "returned") map[key].returned_count++;
        if (b.mileage_in && b.mileage_out) {
          map[key].total_mileage += b.mileage_in - b.mileage_out;
        }
      });
      setStats(Object.values(map).sort((a, b) => a.license_plate.localeCompare(b.license_plate)));
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    const headers = [t.colPlate, t.colName, t.colDate, t.colTime, t.colParking, t.colStatus, t.colMileOut, t.colMileIn];
    const rows = bookings.map((b) => [
      b.vehicles?.license_plate || "",
      b.booker_name,
      b.booking_date,
      b.booking_time?.slice(0, 5) || "",
      b.parking_floor || "",
      STATUS_LABELS[b.status] || b.status,
      b.mileage_out || "",
      b.mileage_in || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenergy-${selectedDate || selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.toastExport);
  }

  function exportMonthlySummaryCSV() {
    const headers = [t.colPlate, t.colUsage, t.colReturnedCount, t.colMileTotal, t.colFuel];
    const rows = stats.map((s) => [
      s.license_plate,
      s.count,
      s.returned_count,
      s.total_mileage,
      s.fuel_total_liters.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `greenergy-monthly-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.toastExportMonthly);
  }

  function addFuelFill() {
    if (!newFill.vehicle_id || !newFill.liters || !newFill.amount) {
      toast.error(t.errFuelMissing);
      return;
    }
    const liters = Number(newFill.liters);
    const amount = Number(newFill.amount);
    if (liters <= 0 || amount <= 0) {
      toast.error(t.errFuelZero);
      return;
    }
    setStats((prev) =>
      prev.map((s) => {
        if (s.vehicle_id !== newFill.vehicle_id) return s;
        const fill: FuelFill = {
          id: Date.now().toString(),
          date: newFill.date,
          liters,
          amount,
          note: newFill.note,
        };
        return {
          ...s,
          fuel_fills: [...s.fuel_fills, fill],
          fuel_total_liters: s.fuel_total_liters + liters,
        };
      })
    );
    setNewFill((f) => ({ ...f, liters: "", amount: "", note: "" }));
    toast.success(t.toastFuelAdded);
  }

  function removeFuelFill(vehicle_id: string, fill_id: string) {
    setStats((prev) =>
      prev.map((s) => {
        if (s.vehicle_id !== vehicle_id) return s;
        const removed = s.fuel_fills.find((f) => f.id === fill_id);
        return {
          ...s,
          fuel_fills: s.fuel_fills.filter((f) => f.id !== fill_id),
          fuel_total_liters: s.fuel_total_liters - (removed?.liters || 0),
        };
      })
    );
  }

  const totalMileage = stats.reduce((s, v) => s + v.total_mileage, 0);
  const totalFuelLiters = stats.reduce((s, v) => s + v.fuel_total_liters, 0);
  const fuelCost = fuelRate && fuelConsumption && totalMileage
    ? (totalMileage / Number(fuelConsumption)) * Number(fuelRate)
    : 0;
  const grandTotal = fuelCost + Number(tollTotal || 0);

  const TAB_LABELS = { daily: t.tabDaily, monthly: t.tabMonthly, expense: t.tabExpense };

  return (
    <AdminLayout>
      <h2 className="text-h1 font-semibold text-forest-green mb-6">{t.title}</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-neutral-gray pb-0">
        {(["daily", "monthly", "expense"] as const).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-body font-semibold border-b-2 transition-colors -mb-px ${
              tab === tb
                ? "border-forest-green text-forest-green"
                : "border-transparent text-neutral-gray hover:text-dark-text"
            }`}
          >
            {TAB_LABELS[tb]}
          </button>
        ))}
      </div>

      {/* ===== Daily ===== */}
      {tab === "daily" && (
        <div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              type="date"
              className="input-field font-dm-sans w-auto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button className="btn-secondary py-2 px-4" onClick={loadDaily}>{t.btnReload}</button>
            <button className="btn-secondary py-2 px-4" onClick={exportCSV}>{t.btnExportCSV}</button>
          </div>

          {!loading && bookings.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {(["pending","confirmed","returned","cancelled"] as BookingStatus[]).map((s) => (
                <div key={s} className="card text-center py-3">
                  <p className="text-display font-dm-sans font-semibold text-forest-green">
                    {bookings.filter((b) => b.status === s).length}
                  </p>
                  <p className="text-caption text-dark-text/60">{STATUS_LABELS[s]}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : bookings.length === 0 ? (
            <div className="card text-center py-12 text-neutral-gray">{t.noDataDaily}</div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-caption">
                <thead>
                  <tr className="border-b border-neutral-gray">
                    <Th>{t.colPlate}</Th><Th>{t.colName}</Th><Th>{t.colTime}</Th><Th>{t.colParking}</Th>
                    <Th>{t.colMileOut}</Th><Th>{t.colMileIn}</Th><Th>{t.colDist}</Th><Th>{t.colStatus}</Th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-neutral-gray/40 hover:bg-linen/50">
                      <td className="py-2 px-2 font-dm-sans font-semibold">{b.vehicles?.license_plate}</td>
                      <td className="py-2 px-2">{b.booker_name}</td>
                      <td className="py-2 px-2 font-dm-sans">
                        {b.booking_time?.slice(0, 5)}
                        {b.booking_time_end ? ` – ${b.booking_time_end.slice(0, 5)}` : ""}
                      </td>
                      <td className="py-2 px-2">{b.parking_floor || "—"}</td>
                      <td className="py-2 px-2 font-dm-sans">{b.mileage_out?.toLocaleString() || "—"}</td>
                      <td className="py-2 px-2 font-dm-sans">{b.mileage_in?.toLocaleString() || "—"}</td>
                      <td className="py-2 px-2 font-dm-sans">
                        {b.mileage_in && b.mileage_out
                          ? `${(b.mileage_in - b.mileage_out).toLocaleString()} ${t.distUnit}`
                          : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full text-caption ${STATUS_COLORS[b.status]}`}>
                          {STATUS_LABELS[b.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== Monthly ===== */}
      {tab === "monthly" && (
        <div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              type="month"
              className="input-field font-dm-sans w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button className="btn-secondary py-2 px-4" onClick={loadMonthly}>{t.btnReload}</button>
            <button className="btn-secondary py-2 px-4" onClick={exportCSV}>{t.exportDetailLabel}</button>
            <button className="btn-secondary py-2 px-4" onClick={exportMonthlySummaryCSV}>{t.exportSummaryLabel}</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {t.summaryCards.map((label, i) => (
                  <SummaryCard key={i} label={label} value={`${
                    i === 0 ? bookings.length
                    : i === 1 ? bookings.filter((b) => b.status === "returned").length
                    : i === 2 ? totalMileage.toLocaleString()
                    : totalFuelLiters.toFixed(1)
                  } ${t.summaryUnits[i]}`} />
                ))}
              </div>

              {/* Per-vehicle detail table */}
              <div className="card overflow-x-auto">
                <h3 className="text-h2 font-semibold mb-3">{t.monthlySumTitle}</h3>
                {stats.length === 0 ? (
                  <p className="text-neutral-gray text-caption py-4 text-center">{t.noMonthlyData}</p>
                ) : (
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="border-b border-neutral-gray">
                        <Th>{t.colPlate}</Th>
                        <Th>{t.colUsage}</Th>
                        <Th>{t.colReturnedCount}</Th>
                        <Th>{t.colMileTotal}</Th>
                        <Th>{t.colFuel}</Th>
                        <Th>{t.colShare}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((s) => (
                        <tr key={s.vehicle_id} className="border-b border-neutral-gray/40 hover:bg-linen/50">
                          <td className="py-2.5 px-2 font-dm-sans font-semibold">{s.license_plate}</td>
                          <td className="py-2.5 px-2 font-dm-sans">{s.count} {t.usageUnit}</td>
                          <td className="py-2.5 px-2 font-dm-sans">{s.returned_count} {t.usageUnit}</td>
                          <td className="py-2.5 px-2 font-dm-sans">{s.total_mileage.toLocaleString()}</td>
                          <td className="py-2.5 px-2 font-dm-sans">{s.fuel_total_liters.toFixed(2)}</td>
                          <td className="py-2.5 px-2">
                            {totalMileage > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-neutral-gray/20 rounded-full h-2 min-w-[60px]">
                                  <div
                                    className="bg-forest-green h-2 rounded-full"
                                    style={{ width: `${Math.round((s.total_mileage / totalMileage) * 100)}%` }}
                                  />
                                </div>
                                <span className="font-dm-sans text-dark-text/60 w-8 text-right">
                                  {Math.round((s.total_mileage / totalMileage) * 100)}%
                                </span>
                              </div>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-linen font-semibold">
                        <td className="py-2.5 px-2">{t.totalRow}</td>
                        <td className="py-2.5 px-2 font-dm-sans">{bookings.length} {t.usageUnit}</td>
                        <td className="py-2.5 px-2 font-dm-sans">
                          {bookings.filter((b) => b.status === "returned").length} {t.usageUnit}
                        </td>
                        <td className="py-2.5 px-2 font-dm-sans">{totalMileage.toLocaleString()}</td>
                        <td className="py-2.5 px-2 font-dm-sans">{totalFuelLiters.toFixed(2)}</td>
                        <td className="py-2.5 px-2">100%</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Fuel fill section */}
              <div className="card">
                <h3 className="text-h2 font-semibold mb-4">{t.fuelFillTitle}</h3>

                {stats.length > 0 && (
                  <div className="bg-linen rounded-lg p-4 mb-4">
                    <p className="text-caption font-semibold text-dark-text/70 mb-3">{t.addFuelTitle}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="label">{t.labelVehicle}</label>
                        <select
                          className="input-field font-dm-sans"
                          value={newFill.vehicle_id}
                          onChange={(e) => setNewFill((f) => ({ ...f, vehicle_id: e.target.value }))}
                        >
                          <option value="">{t.selectVehicle}</option>
                          {stats.map((s) => (
                            <option key={s.vehicle_id} value={s.vehicle_id}>{s.license_plate}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t.labelFillDate}</label>
                        <input
                          type="date"
                          className="input-field font-dm-sans"
                          value={newFill.date}
                          onChange={(e) => setNewFill((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">{t.labelLiters}</label>
                        <input
                          type="number"
                          className="input-field font-dm-sans"
                          placeholder={t.placeholderLiters}
                          value={newFill.liters}
                          onChange={(e) => setNewFill((f) => ({ ...f, liters: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">{t.labelAmount}</label>
                        <input
                          type="number"
                          className="input-field font-dm-sans"
                          placeholder={t.placeholderAmount}
                          value={newFill.amount}
                          onChange={(e) => setNewFill((f) => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">{t.labelNote}</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder={t.placeholderNote}
                          value={newFill.note}
                          onChange={(e) => setNewFill((f) => ({ ...f, note: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button className="btn-primary py-2 px-5" onClick={addFuelFill}>
                      {t.btnAddFuel}
                    </button>
                  </div>
                )}

                {stats.some((s) => s.fuel_fills.length > 0) ? (
                  <div className="space-y-4">
                    {stats.filter((s) => s.fuel_fills.length > 0).map((s) => (
                      <div key={s.vehicle_id}>
                        <p className="text-body font-semibold font-dm-sans mb-2">{s.license_plate}</p>
                        <table className="w-full text-caption">
                          <thead>
                            <tr className="border-b border-neutral-gray">
                              <Th>{t.colFuelDate}</Th><Th>{t.colFuelLiters}</Th><Th>{t.colFuelAmount}</Th><Th>{t.colFuelNote}</Th><th className="py-2 px-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {s.fuel_fills.map((f) => (
                              <tr key={f.id} className="border-b border-neutral-gray/40">
                                <td className="py-2 px-2 font-dm-sans">{formatThaiDate(f.date)}</td>
                                <td className="py-2 px-2 font-dm-sans">{f.liters.toFixed(2)} {t.fuelUnit}</td>
                                <td className="py-2 px-2 font-dm-sans">{f.amount.toLocaleString()} {t.fuelBaht}</td>
                                <td className="py-2 px-2">{f.note || "—"}</td>
                                <td className="py-2 px-2">
                                  <button
                                    onClick={() => removeFuelFill(s.vehicle_id, f.id)}
                                    className="text-red-500 hover:text-red-700 text-caption"
                                  >
                                    {t.btnDeleteFuel}
                                  </button>
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-linen font-semibold">
                              <td className="py-2 px-2">{t.fuelTotalRow}</td>
                              <td className="py-2 px-2 font-dm-sans">{s.fuel_total_liters.toFixed(2)} {t.fuelUnit}</td>
                              <td className="py-2 px-2 font-dm-sans">
                                {s.fuel_fills.reduce((sum, f) => sum + f.amount, 0).toLocaleString()} {t.fuelBaht}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-caption text-neutral-gray text-center py-4">
                    {t.noFuelData}
                  </p>
                )}
              </div>

              {bookings.length > 0 && (
                <div className="card overflow-x-auto">
                  <h3 className="text-h2 font-semibold mb-3">{t.allBookingsTitle}</h3>
                  <table className="w-full text-caption">
                    <thead>
                      <tr className="border-b border-neutral-gray">
                        <Th>{t.colDate}</Th><Th>{t.colPlate}</Th><Th>{t.colName}</Th><Th>{t.colTime}</Th>
                        <Th>{t.colMileOut}</Th><Th>{t.colMileIn}</Th><Th>{t.colStatus}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className="border-b border-neutral-gray/40 hover:bg-linen/50">
                          <td className="py-2 px-2 font-dm-sans">{formatThaiDate(b.booking_date)}</td>
                          <td className="py-2 px-2 font-dm-sans font-semibold">{b.vehicles?.license_plate}</td>
                          <td className="py-2 px-2">{b.booker_name}</td>
                          <td className="py-2 px-2 font-dm-sans">
                            {b.booking_time?.slice(0, 5)}
                            {b.booking_time_end ? ` – ${b.booking_time_end.slice(0, 5)}` : ""}
                          </td>
                          <td className="py-2 px-2 font-dm-sans">{b.mileage_out?.toLocaleString() || "—"}</td>
                          <td className="py-2 px-2 font-dm-sans">{b.mileage_in?.toLocaleString() || "—"}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-caption ${STATUS_COLORS[b.status]}`}>
                              {STATUS_LABELS[b.status]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== Expense ===== */}
      {tab === "expense" && (
        <div>
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <input
              type="month"
              className="input-field font-dm-sans w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button className="btn-secondary py-2 px-4" onClick={loadMonthly}>{t.btnReload}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="card">
              <h3 className="text-h2 font-semibold mb-4">{t.expenseTitle}</h3>
              <div className="space-y-4">
                <div>
                  <label className="label">{t.labelFuelRate}</label>
                  <input
                    type="number"
                    className="input-field font-dm-sans"
                    placeholder={t.placeholderFuelRate}
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t.labelConsumption}</label>
                  <input
                    type="number"
                    className="input-field font-dm-sans"
                    placeholder={t.placeholderConsumption}
                    value={fuelConsumption}
                    onChange={(e) => setFuelConsumption(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">{t.labelToll}</label>
                  <input
                    type="number"
                    className="input-field font-dm-sans"
                    placeholder="0"
                    value={tollTotal}
                    onChange={(e) => setTollTotal(e.target.value)}
                  />
                </div>

                {stats.length > 0 && (
                  <div className="border-t border-neutral-gray pt-4">
                    <p className="label mb-3">{t.addFuelTitle}</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="label">{t.labelVehicle}</label>
                        <select
                          className="input-field font-dm-sans"
                          value={newFill.vehicle_id}
                          onChange={(e) => setNewFill((f) => ({ ...f, vehicle_id: e.target.value }))}
                        >
                          <option value="">{t.selectVehicle}</option>
                          {stats.map((s) => (
                            <option key={s.vehicle_id} value={s.vehicle_id}>{s.license_plate}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t.labelLiters}</label>
                        <input
                          type="number"
                          className="input-field font-dm-sans"
                          placeholder={t.placeholderLiters}
                          value={newFill.liters}
                          onChange={(e) => setNewFill((f) => ({ ...f, liters: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">{t.labelAmount}</label>
                        <input
                          type="number"
                          className="input-field font-dm-sans"
                          placeholder={t.placeholderAmount}
                          value={newFill.amount}
                          onChange={(e) => setNewFill((f) => ({ ...f, amount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="label">{t.labelFillDate}</label>
                        <input
                          type="date"
                          className="input-field font-dm-sans"
                          value={newFill.date}
                          onChange={(e) => setNewFill((f) => ({ ...f, date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <button className="btn-primary py-1.5 px-4 text-caption" onClick={addFuelFill}>
                      {t.btnAddFuel}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-h2 font-semibold mb-4">{t.expenseSummaryTitle}</h3>
              {loading ? <LoadingSpinner /> : (
                <div className="space-y-3">
                  {stats.map((s) => (
                    <div key={s.vehicle_id} className="flex justify-between text-caption border-b border-neutral-gray/40 pb-2">
                      <span className="font-dm-sans font-semibold">{s.license_plate}</span>
                      <div className="text-right">
                        <span className="font-dm-sans">{s.total_mileage.toLocaleString()} {t.distUnit}</span>
                        {s.fuel_total_liters > 0 && (
                          <span className="text-moss-green ml-2">({s.fuel_total_liters.toFixed(1)} {t.fuelUnit})</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-body font-semibold pt-2">
                    <span>{t.totalMileLabel}</span>
                    <span className="font-dm-sans">{totalMileage.toLocaleString()} {t.distUnit}</span>
                  </div>
                  {totalFuelLiters > 0 && (
                    <div className="flex justify-between text-caption">
                      <span>{t.fuelActual}</span>
                      <span className="font-dm-sans text-moss-green">{totalFuelLiters.toFixed(2)} {t.fuelUnit}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-caption">
                    <span>{t.fuelEstLabel}</span>
                    <span className="font-dm-sans">{fuelCost.toFixed(2)} {t.fuelBaht}</span>
                  </div>
                  <div className="flex justify-between text-caption">
                    <span>{t.tollLabel}</span>
                    <span className="font-dm-sans">{Number(tollTotal || 0).toLocaleString()} {t.fuelBaht}</span>
                  </div>
                  <div className="flex justify-between text-h2 font-semibold border-t border-neutral-gray pt-3">
                    <span>{t.grandTotal}</span>
                    <span className="font-dm-sans text-forest-green">{grandTotal.toFixed(2)} {t.fuelBaht}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-2 px-2 font-semibold text-dark-text/70 text-left">{children}</th>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center py-4">
      <p className="text-h2 font-dm-sans font-semibold text-forest-green">{value}</p>
      <p className="text-caption text-dark-text/60 mt-1">{label}</p>
    </div>
  );
}
