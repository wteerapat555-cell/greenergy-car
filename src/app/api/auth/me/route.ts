import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const err = await requireAdmin(req);
  if (err) return err;
  return NextResponse.json({ ok: true });
}
