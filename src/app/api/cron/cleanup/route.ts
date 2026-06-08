import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  // Find old bookings with images
  const { data: oldBookings } = await db
    .from("bookings")
    .select("id, return_image_url")
    .not("return_image_url", "is", null)
    .lt("returned_at", cutoff.toISOString());

  if (!oldBookings || oldBookings.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  // Delete images from storage
  const filenames = oldBookings
    .map((b) => {
      const url = b.return_image_url as string;
      return url.split("/").pop() || "";
    })
    .filter(Boolean);

  if (filenames.length > 0) {
    await db.storage.from("car-images").remove(filenames);
  }

  // Clear image URLs in DB
  const ids = oldBookings.map((b) => b.id);
  await db.from("bookings").update({ return_image_url: null }).in("id", ids);

  return NextResponse.json({ deleted: ids.length });
}
