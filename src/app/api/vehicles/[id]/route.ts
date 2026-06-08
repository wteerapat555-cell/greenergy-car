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
    const ok = local.deleteVehicle(id);
    if (!ok) return NextResponse.json({ error: "ไม่พบรถ" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const db = supabaseAdmin();
  const { error } = await db.from("vehicles").update({ is_active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
