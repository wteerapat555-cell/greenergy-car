import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (username !== "Greenergy" || password !== "Greenergy1") {
    return NextResponse.json({ error: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
  }

  const token = await signToken({ username, role: "admin" });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return res;
}
