"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.username) errs.username = "กรุณากรอก Username";
    if (!form.password) errs.password = "กรุณากรอก Password";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ");
      toast.success("เข้าสู่ระบบสำเร็จ");
      router.push("/admin/dashboard");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Username หรือ Password ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-linen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-h1 font-semibold text-forest-green">Greenergy</h1>
          <p className="text-caption text-moss-green font-dm-sans">Admin Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              type="text"
              className="input-field font-dm-sans"
              placeholder="Username"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            />
            {errors.username && <p className="text-red-600 text-caption mt-1">{errors.username}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input-field font-dm-sans"
              placeholder="Password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            {errors.password && <p className="text-red-600 text-caption mt-1">{errors.password}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size={20} /> กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
