"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface DashboardStats {
  total_vehicles: number;
  available: number;
  in_use: number;
  pending: number;
  today_bookings: number;
  returned_today: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
      );
    }
    updateTime();
    const t = setInterval(updateTime, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const [vehiclesRes, bookingsRes] = await Promise.all([
          fetch("/api/vehicles"),
          fetch(`/api/bookings?date=${today}`),
        ]);
        if (!vehiclesRes.ok || !bookingsRes.ok) return;
        const [vData, bData] = await Promise.all([vehiclesRes.json(), bookingsRes.json()]);
        const vehicles = vData.vehicles || [];
        const bookings = bData.bookings || [];
        const in_use = bookings.filter((b: { status: string }) => b.status === "confirmed").length;
        const pending = bookings.filter((b: { status: string }) => b.status === "pending").length;
        const returned_today = bookings.filter((b: { status: string }) => b.status === "returned").length;
        setStats({
          total_vehicles: vehicles.length,
          available: Math.max(0, vehicles.length - in_use - pending),
          in_use,
          pending,
          today_bookings: bookings.length,
          returned_today,
        });
      } catch {
        // silent
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  const todayStr = new Date().toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="min-h-screen bg-linen flex flex-col">
      {/* Hero section with subtle gradient */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">

          {/* Logo block */}
          <div className="text-center mb-8">
            {/* Car icon */}
            <div className="w-16 h-16 bg-forest-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l3 5v5h-2"/>
                <circle cx="7.5" cy="17.5" r="1.5"/>
                <circle cx="17.5" cy="17.5" r="1.5"/>
                <path d="M3 9h11l2 4H3V9z"/>
              </svg>
            </div>
            <h1 className="text-display font-sarabun font-semibold text-forest-green tracking-tight">
              Greenergy
            </h1>
            <p className="text-body text-moss-green font-dm-sans mt-1">Car Reservation</p>
            {currentTime && (
              <p className="text-caption text-neutral-gray mt-2 font-dm-sans">{currentTime} · {todayStr}</p>
            )}
          </div>

          {/* Dashboard Status Card */}
          <div className="bg-white rounded-2xl border border-neutral-gray/40 p-5 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-forest-green animate-pulse"/>
                <span className="text-body font-semibold text-dark-text">สถานะวันนี้</span>
              </div>
              <Link
                href="/admin/login"
                className="text-caption text-moss-green hover:text-forest-green transition-colors flex items-center gap-1"
              >
                จัดการ
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>

            {loadingStats ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size={24} />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <StatBox
                    label="รถว่าง"
                    value={stats.available}
                    color="text-forest-green"
                    bg="bg-forest-green/8"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                        <path d="M16 3H8l-2 4h12l-2-4z"/>
                      </svg>
                    }
                  />
                  <StatBox
                    label="กำลังใช้"
                    value={stats.in_use}
                    color="text-moss-green"
                    bg="bg-moss-green/10"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                      </svg>
                    }
                  />
                  <StatBox
                    label="รอยืนยัน"
                    value={stats.pending}
                    color="text-desert-brown"
                    bg="bg-desert-brown/10"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                        <path d="M12 8v4M12 16h.01"/>
                      </svg>
                    }
                  />
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-gray/30">
                  <div className="flex items-center gap-1.5 text-caption text-neutral-gray">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>จองวันนี้ <strong className="text-dark-text font-dm-sans">{stats.today_bookings}</strong> รายการ</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-neutral-gray">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>คืนแล้ว <strong className="text-dark-text font-dm-sans">{stats.returned_today}</strong> คัน</span>
                  </div>
                  <div className="text-caption text-neutral-gray">
                    รถ <strong className="text-dark-text font-dm-sans">{stats.total_vehicles}</strong> คัน
                  </div>
                </div>
              </>
            ) : (
              <p className="text-caption text-neutral-gray text-center py-2">ไม่สามารถโหลดข้อมูลได้</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link href="/book/outbound" className="block">
              <button className="w-full bg-forest-green text-white px-6 py-4 rounded-xl font-sarabun font-semibold text-h2 hover:bg-moss-green transition-all duration-200 flex items-center justify-center gap-3 shadow-sm">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                จองรถ (ขาไป)
              </button>
            </Link>
            <Link href="/book/return" className="block">
              <button className="w-full bg-white text-forest-green px-6 py-4 rounded-xl font-sarabun font-semibold text-h2 border-2 border-forest-green hover:bg-linen transition-all duration-200 flex items-center justify-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                คืนรถ (ขากลับ)
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-6 text-center space-y-1">
        <p className="text-caption text-neutral-gray">© 2026 Greenergy Car Reservation</p>
        <Link
          href="/admin/login"
          className="text-caption text-neutral-gray hover:text-moss-green transition-colors"
        >
          เข้าสู่ระบบผู้ดูแลระบบ
        </Link>
      </footer>
    </main>
  );
}

function StatBox({
  label, value, color, bg, icon,
}: {
  label: string; value: number; color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <div className={`${bg} rounded-xl p-3 text-center`}>
      <div className={`flex items-center justify-center mb-1 ${color}`}>{icon}</div>
      <p className={`text-h1 font-dm-sans font-semibold ${color}`}>{value}</p>
      <p className="text-caption text-dark-text/50 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}
