import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import * as local from "@/lib/localDb";

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const date = params.get("date") || undefined;
    const month = params.get("month") || undefined;
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;
    const status = params.get("status");

  if (!isSupabaseReady()) {
        const bookings = local.getBookings({
                date, month, from, to,
                status: status ? status.split(",") : undefined,
        });
        return NextResponse.json({ bookings });
  }

  const db = supabaseAdmin();
    let query = db
      .from("bookings")
      .select("*, vehicles(id, license_plate, image_url)")
      .order("booking_date", { ascending: false })
      .order("booking_time", { ascending: true });

  if (date) query = query.eq("booking_date", date);
    if (month) query = query.like("booking_date", `${month}%`);
    if (from) query = query.gte("booking_date", from);
    if (to) query = query.lte("booking_date", to);
    if (status) query = query.in("status", status.split(","));

  const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    // รองรับทั้ง 'purpose' (ชื่อถูกต้องใน DB) และ 'destination' (backward compat)
  const {
        vehicle_id,
        booking_date,
        booking_time,
        booking_time_end,
        booker_name,
        booker_phone,
        purpose,
        destination,
  } = body;

  // ใช้ purpose ก่อน ถ้าไม่มีใช้ destination (backward compat)
  const purposeValue = purpose ?? destination ?? "";

  if (!vehicle_id || !booking_date || !booking_time || !booking_time_end || !booker_name || !booker_phone) {
        return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }
    if (booking_time_end <= booking_time) {
          return NextResponse.json({ error: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น" }, { status: 400 });
    }

  const today = new Date().toISOString().split("T")[0];
    if (booking_date < today) {
          return NextResponse.json({ error: "ไม่สามารถจองวันที่ผ่านมาแล้วได้" }, { status: 400 });
    }

  // ตรวจสอบว่าถ้าเป็นวันนี้ เวลาต้องไม่ผ่านมาแล้ว
  if (booking_date === today) {
        const nowUTC = new Date();
        // แปลงเป็นเวลาไทย (UTC+7)
      const thaiOffset = 7 * 60;
        const thaiTime = new Date(nowUTC.getTime() + thaiOffset * 60 * 1000);
        const currentHour = thaiTime.getUTCHours();
        const currentMin = thaiTime.getUTCMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
        if (booking_time < currentTimeStr) {
                return NextResponse.json({ error: "ไม่สามารถจองเวลาที่ผ่านมาแล้วได้ในวันนี้" }, { status: 400 });
        }
  }

  if (!isSupabaseReady()) {
        if (local.checkDoubleBooking(vehicle_id, booking_date, booking_time, booking_time_end)) {
                return NextResponse.json(
                  { error: "รถคันนี้ถูกจองในวันเวลาดังกล่าวแล้ว กรุณาเลือกเวลาอื่น" },
                  { status: 409 }
                        );
        }
        const booking = local.addBooking({ vehicle_id, booking_date, booking_time, booking_time_end, booker_name, booker_phone, purpose: purposeValue });
        return NextResponse.json({ booking }, { status: 201 });
  }

  const db = supabaseAdmin();
    // ตรวจสอบ time-range overlap
  const { data: overlapping } = await db
      .from("bookings").select("id")
      .eq("vehicle_id", vehicle_id).eq("booking_date", booking_date)
      .in("status", ["pending", "confirmed"])
      .lt("booking_time", booking_time_end)
      .gt("booking_time_end", booking_time);

  if (overlapping && overlapping.length > 0) {
        return NextResponse.json(
          { error: "รถคันนี้ถูกจองในวันเวลาดังกล่าวแล้ว กรุณาเลือกเวลาอื่น" },
          { status: 409 }
              );
  }

  const { data, error } = await db
      .from("bookings")
      .insert({ vehicle_id, booking_date, booking_time, booking_time_end, booker_name, booker_phone, purpose: purposeValue, status: "pending" })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking: data }, { status: 201 });
}
