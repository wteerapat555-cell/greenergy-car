"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { formatThaiDate } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/types";

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  returned: "คืนแล้ว",
  cancelled: "ยกเลิก",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-green-100 text-green-800",
  returned: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

type FilterType = "today" | "month" | "range";

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confirm, setConfirm] = useState<{ open: boolean; id: string; action: BookingStatus }>({
    open: false, id: "", action: "confirmed",
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/bookings?";
      if (filter === "today") url += `date=${today}`;
      else if (filter === "month") {
        const m = today.slice(0, 7);
        url += `month=${m}`;
      } else {
        if (dateFrom) url += `from=${dateFrom}`;
        if (dateTo) url += `&to=${dateTo}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch {
      toast.error("โหลดข้อมูลการจองไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filter, today, dateFrom, dateTo]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function updateStatus(id: string, status: BookingStatus) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`อัปเดตสถานะเป็น "${STATUS_LABELS[status]}" แล้ว`);
      loadBookings();
    } catch {
      toast.error("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setActionLoading(null);
    }
  }

  const summary = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    returned: bookings.filter((b) => b.status === "returned").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <AdminLayout>
      <h2 className="text-h1 font-semibold text-forest-green mb-6">แดชบอร์ด</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label={filter === "today" ? "จองวันนี้" : "จองทั้งหมด"} value={summary.total} color="text-forest-green" />
        <StatCard label="กำลังใช้งาน" value={summary.confirmed} color="text-moss-green" />
        <StatCard label="คืนแล้ว" value={summary.returned} color="text-desert-brown" />
        <StatCard label="ยกเลิก" value={summary.cancelled} color="text-red-500" />
      </div>

      {/* Filters */}
      <div className="card mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-2">
          {(["today", "month", "range"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-caption font-semibold border transition-colors ${
                filter === f
                  ? "bg-forest-green text-white border-forest-green"
                  : "border-neutral-gray text-dark-text hover:border-forest-green"
              }`}
            >
              {f === "today" ? "วันนี้" : f === "month" ? "เดือนนี้" : "ช่วงวันที่"}
            </button>
          ))}
        </div>
        {filter === "range" && (
          <div className="flex gap-2 items-center">
            <input type="date" className="input-field font-dm-sans w-auto" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span className="text-caption">ถึง</span>
            <input type="date" className="input-field font-dm-sans w-auto" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button className="btn-primary py-2 px-4" onClick={loadBookings}>ค้นหา</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : bookings.length === 0 ? (
          <p className="text-center text-neutral-gray py-12">ไม่มีข้อมูลการจอง</p>
        ) : (
          <table className="w-full text-caption">
            <thead>
              <tr className="border-b border-neutral-gray text-left">
                <Th>ทะเบียน</Th>
                <Th>ชื่อ</Th>
                <Th>วันเวลา</Th>
                <Th>โครงการ / จุดหมาย</Th>
                <Th>ชั้นจอด</Th>
                <Th>สถานะ</Th>
                <Th>ภาพ</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-neutral-gray/40 hover:bg-linen/60">
                  <td className="py-3 px-2 font-dm-sans font-semibold">{b.vehicles?.license_plate}</td>
                  <td className="py-3 px-2">{b.booker_name}</td>
                  <td className="py-3 px-2 font-dm-sans">
                    {formatThaiDate(b.booking_date)}<br />
                    <span className="text-neutral-gray">
                      {b.booking_time?.slice(0, 5)}
                      {b.booking_time_end ? ` – ${b.booking_time_end.slice(0, 5)}` : ""}
                    </span>
                  </td>
                  <td className="py-3 px-2 max-w-[140px]">
                    <span className="line-clamp-2">{(b as {destination?: string | null}).destination || "—"}</span>
                  </td>
                  <td className="py-3 px-2">{b.parking_floor || "—"}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-0.5 rounded-full text-caption ${STATUS_COLORS[b.status]}`}>
                      {STATUS_LABELS[b.status]}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    {b.return_image_url ? (
                      <a href={b.return_image_url} target="_blank" rel="noopener noreferrer">
                        <Image src={b.return_image_url} alt="รถ" width={48} height={36} className="rounded object-cover" />
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-3 px-2">
                    {actionLoading === b.id ? (
                      <LoadingSpinner size={16} />
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {b.status === "pending" && (
                          <button
                            className="px-2 py-1 text-caption bg-forest-green text-white rounded hover:bg-moss-green transition-colors"
                            onClick={() => setConfirm({ open: true, id: b.id, action: "confirmed" })}
                          >
                            ยืนยัน
                          </button>
                        )}
                        {(b.status === "pending" || b.status === "confirmed") && (
                          <button
                            className="px-2 py-1 text-caption bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            onClick={() => setConfirm({ open: true, id: b.id, action: "cancelled" })}
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.action === "confirmed" ? "ยืนยันการจอง" : "ยกเลิกการจอง"}
        message={
          confirm.action === "confirmed"
            ? "คุณต้องการยืนยันการจองนี้ใช่หรือไม่?"
            : "คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?"
        }
        confirmLabel={confirm.action === "confirmed" ? "ยืนยัน" : "ยกเลิกการจอง"}
        danger={confirm.action === "cancelled"}
        onConfirm={() => {
          updateStatus(confirm.id, confirm.action);
          setConfirm({ open: false, id: "", action: "confirmed" });
        }}
        onCancel={() => setConfirm({ open: false, id: "", action: "confirmed" })}
      />
    </AdminLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card text-center">
      <p className={`text-display font-dm-sans font-semibold ${color}`}>{value}</p>
      <p className="text-caption text-dark-text/60 mt-1">{label}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="py-3 px-2 font-semibold text-dark-text/70">{children}</th>;
}
