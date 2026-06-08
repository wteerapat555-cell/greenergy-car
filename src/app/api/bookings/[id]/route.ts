import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import * as local from "@/lib/localDb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const { id } = await params;

  if (!isSupabaseReady()) {
    const ok = local.deleteBooking(id);
    if (!ok) return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status) return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });

  if (!isSupabaseReady()) {
    const booking = local.updateBookingStatus(id, status);
    if (!booking) return NextResponse.json({ error: "ไม่พบการจอง" }, { status: 404 });
    return NextResponse.json({ booking });
  }

  const db = supabaseAdmin();
  const allowedFields = ["status", "parking_floor", "vehicle_id"];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }
  const { data, error } = await db.from("bookings").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}
