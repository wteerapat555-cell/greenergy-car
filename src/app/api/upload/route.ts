import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseReady } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 });
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ JPG และ PNG" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "ไฟล์ต้องไม่เกิน 5MB" }, { status: 400 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  if (!isSupabaseReady()) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  }

  const db = supabaseAdmin();
  const buffer = await file.arrayBuffer();
  const { error } = await db.storage
    .from("car-images")
    .upload(filename, buffer, { contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = db.storage.from("car-images").getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl });
}
