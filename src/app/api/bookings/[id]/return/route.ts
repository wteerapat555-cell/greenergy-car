import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import * as local from "@/lib/localDb";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { mileage_out, mileage_in, parking_floor, return_image_url } = body;

  if (mileage_out == null || mileage_in == null || !parking_floor) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }
  if (Number(mileage_in) <= Number(mileage_out)) {
    return NextResponse.json({ error: "เลขไมล์ขากลับต้องมากกว่าขาไป" }, { status: 400 });
  }

  if (!isSupabaseReady()) {
    const result = local.returnBooking(id, {
      mileage_out: Number(mileage_out),
      mileage_in: Number(mileage_in),
      parking_floor,
      return_image_url,
    });
    if (result.error) {
      const status = result.error.includes("ไม่พบ") ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json({ booking: result.booking });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db.from("bookings").select("status").eq("id", id).single();
  if (!existing) return NextResponse.json({ error: "ไม่พบข้อมูลการจอง" }, { status: 404 });
  if (!["pending", "confirmed"].includes(existing.status)) {
    return NextResponse.json({ error: "ไม่สามารถคืนรถได้ เนื่องจากสถานะการจองไม่ถูกต้อง" }, { status: 409 });
  }

  const { data, error } = await db
    .from("bookings")
    .update({
      mileage_out: Number(mileage_out), mileage_in: Number(mileage_in),
      parking_floor, return_image_url, status: "returned",
      returned_at: new Date().toISOString(),
    })
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}
