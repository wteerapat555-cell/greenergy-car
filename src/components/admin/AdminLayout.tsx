"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useLang, LangToggle, T } from "@/lib/lang";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const { lang } = useLang();
  const tl = T.adminLayout[lang];

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) router.replace("/admin/login");
        else setChecking(false);
      })
      .catch(() => router.replace("/admin/login"));

    // Detect 401 from any admin API call during session
    const origFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await origFetch(...args);
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
      if (res.status === 401 && url.includes("/api/")) {
        router.replace("/admin/login");
      }
      return res;
    };
    return () => { window.fetch = origFetch; };
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(tl.toastLogout);
    router.push("/admin/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-forest-green border-t-transparent rounded-full animate-spin"/>
          <p className="text-body text-forest-green">{tl.checking}</p>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: "/admin/dashboard",
      label: tl.navDashboard,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
      ),
    },
    {
      href: "/admin/vehicles",
      label: tl.navVehicles,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l3 5v5h-2"/>
          <circle cx="7.5" cy="17.5" r="1.5"/>
          <circle cx="17.5" cy="17.5" r="1.5"/>
        </svg>
      ),
    },
    {
      href: "/admin/monthly",
      label: tl.navMonthly,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
    },
    {
      href: "/admin/report",
      label: tl.navReport,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-linen">
      <header className="bg-forest-green text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-0">
          <div className="flex items-center justify-between h-14">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h14l3 5v5h-2"/>
                    <circle cx="7.5" cy="17.5" r="1.5"/>
                    <circle cx="17.5" cy="17.5" r="1.5"/>
                  </svg>
                </div>
                <span className="text-body font-semibold font-sarabun">{tl.brand}</span>
              </Link>
              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1 ml-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption transition-colors ${
                      pathname === item.href
                        ? "bg-white/20 text-white font-semibold"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <LangToggle dark />
              <Link href="/" className="text-caption text-white/60 hover:text-white transition-colors hidden sm:block">
                {tl.home}
              </Link>
              <button
                onClick={handleLogout}
                className="text-caption text-white/70 hover:text-white transition-colors flex items-center gap-1.5 border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {tl.logout}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden bg-forest-green/90 border-t border-white/20 flex overflow-x-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-caption transition-colors ${
              pathname === item.href
                ? "text-white font-semibold border-b-2 border-white"
                : "text-white/70"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <main className="px-4 py-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
