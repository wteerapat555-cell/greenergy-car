import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import * as local from "@/lib/localDb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseReady()) {
    const mileage = local.getLastReturnedMileage(id);
    return NextResponse.json({ mileage });
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from("bookings")
    .select("mileage_in, returned_at")
    .eq("vehicle_id", id)
    .eq("status", "returned")
    .not("mileage_in", "is", null)
    .order("returned_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ mileage: data?.mileage_in ?? null });
}
