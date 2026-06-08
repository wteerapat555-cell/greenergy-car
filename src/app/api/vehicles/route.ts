import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";
import * as local from "@/lib/localDb";

export async function GET(req: NextRequest) {
  const available = req.nextUrl.searchParams.get("available");
  const all = req.nextUrl.searchParams.get("all");
  const today = new Date().toISOString().split("T")[0];

  if (!isSupabaseReady()) {
    const vehicles = available === "true"
      ? local.getAvailableVehicles(today)
      : local.getVehicles(all !== "true");
    return NextResponse.json({ vehicles });
  }

  const db = supabaseAdmin();
  let query = db.from("vehicles").select("*").order("created_at", { ascending: true });
  if (all !== "true") query = query.eq("is_active", true);

  if (available === "true") {
    const { data: busyIds } = await db
      .from("bookings").select("vehicle_id")
      .in("status", ["pending", "confirmed"]).eq("booking_date", today);
    const ids = (busyIds || []).map((b) => b.vehicle_id);
    if (ids.length > 0) query = query.not("id", "in", `(${ids.join(",")})`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicles: data });
}

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return authErr;

  const body = await req.json();
  const { license_plate, image_url } = body;
  if (!license_plate) return NextResponse.json({ error: "กรุณากรอกทะเบียนรถ" }, { status: 400 });

  if (!isSupabaseReady()) {
    const vehicle = local.addVehicle(license_plate.trim(), image_url || null);
    return NextResponse.json({ vehicle }, { status: 201 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vehicles").insert({ license_plate: license_plate.trim(), image_url, is_active: true })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicle: data }, { status: 201 });
}
