"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Vehicle } from "@/types";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadVehicles() {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles?all=true");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch {
      toast.error("โหลดข้อมูลรถไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVehicles(); }, []);

  async function handleAdd() {
    if (!newPlate.trim()) { toast.error("กรุณากรอกทะเบียนรถ"); return; }
    setActionLoading(true);
    try {
      let image_url = null;
      if (newImageFile) {
        const fd = new FormData();
        fd.append("file", newImageFile);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok) image_url = d.url;
      }
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_plate: newPlate.trim(), image_url }),
      });
      const resData = res.headers.get("content-type")?.includes("application/json")
        ? await res.json() : {};
      if (!res.ok) throw new Error(resData.error || "เพิ่มทะเบียนรถไม่สำเร็จ");
      toast.success("เพิ่มทะเบียนรถสำเร็จ");
      setShowModal(false);
      setNewPlate("");
      setNewImageFile(null);
      setNewImagePreview(null);
      loadVehicles();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เพิ่มทะเบียนรถไม่สำเร็จ");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("ลบทะเบียนรถสำเร็จ");
      loadVehicles();
    } catch {
      toast.error("ลบทะเบียนรถไม่สำเร็จ");
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h1 font-semibold text-forest-green">จัดการรถ</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + เพิ่มทะเบียนรถ
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : vehicles.length === 0 ? (
        <div className="card text-center py-12 text-neutral-gray">ยังไม่มีรถในระบบ</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="card flex items-center gap-4">
              {v.image_url ? (
                <Image
                  src={v.image_url}
                  alt={v.license_plate}
                  width={80}
                  height={60}
                  className="rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-14 bg-linen rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-neutral-gray text-caption">ไม่มีภาพ</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold font-dm-sans truncate">{v.license_plate}</p>
                <p className="text-caption text-neutral-gray">
                  {v.is_active ? "ใช้งานได้" : "ไม่ใช้งาน"}
                </p>
              </div>
              <button
                className="text-caption text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                onClick={() => setDeleteTarget(v.id)}
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-sm">
            <h3 className="text-h2 font-semibold mb-4">เพิ่มทะเบียนรถ</h3>
            <div className="space-y-4">
              <div>
                <label className="label">ทะเบียนรถ</label>
                <input
                  type="text"
                  className="input-field font-dm-sans"
                  placeholder="เช่น กข 1234"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">ภาพรถ (ไม่บังคับ)</label>
                <div
                  className="border-2 border-dashed border-neutral-gray rounded-lg p-4 text-center cursor-pointer hover:border-forest-green transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {newImagePreview ? (
                    <Image src={newImagePreview} alt="preview" width={200} height={120} className="mx-auto rounded object-cover" />
                  ) : (
                    <p className="text-caption text-neutral-gray">คลิกเพื่ออัปโหลดภาพ</p>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setNewImageFile(f);
                      setNewImagePreview(URL.createObjectURL(f));
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                className="btn-secondary"
                onClick={() => { setShowModal(false); setNewPlate(""); setNewImageFile(null); setNewImagePreview(null); }}
              >
                ยกเลิก
              </button>
              <button className="btn-primary" onClick={handleAdd} disabled={actionLoading}>
                {actionLoading ? <LoadingSpinner size={20} /> : "เพิ่ม"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="ลบทะเบียนรถ"
        message="คุณต้องการลบทะเบียนรถนี้ออกจากระบบใช่หรือไม่?"
        confirmLabel="ลบ"
        danger
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}
