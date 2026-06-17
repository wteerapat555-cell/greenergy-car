import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import * as local from "@/lib/localDb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (body.action === "washed") {
    const washedAt = body.date ? new Date(body.date).toISOString() : new Date().toISOString();
    if (!isSupabaseReady()) {
      const ok = local.markVehicleWashed(id, washedAt);
      if (!ok) return NextResponse.json({ error: "ไม่พบรถ" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    const db = supabaseAdmin();
    const { error } = await db.from("vehicles")
      .update({ last_washed_at: washedAt }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const { id } = await params;

  if (!isSupabaseReady()) {
    // Check for active bookings before deactivating
    const activeBookings = local.getBookings({ status: ["pending", "confirmed"] })
      .filter((b) => b.vehicle_id === id);
    if (activeBookings.length > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบรถได้ เนื่องจากมีการจองที่ยังค้างอยู่ ${activeBookings.length} รายการ` },
        { status: 409 }
      );
    }
    const ok = local.deleteVehicle(id);
    if (!ok) return NextResponse.json({ error: "ไม่พบรถ" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const db = supabaseAdmin();
  // Check for active bookings before deactivating
  const { data: activeBookings } = await db
    .from("bookings").select("id")
    .eq("vehicle_id", id).in("status", ["pending", "confirmed"]);
  if (activeBookings && activeBookings.length > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบรถได้ เนื่องจากมีการจองที่ยังค้างอยู่ ${activeBookings.length} รายการ` },
      { status: 409 }
    );
  }
  const { error } = await db.from("vehicles").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
