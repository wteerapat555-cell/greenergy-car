import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "data", "db.json");

interface Vehicle {
  id: string;
  license_plate: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface Booking {
  id: string;
  vehicle_id: string;
  booker_name: string;
  booker_phone: string;
  booking_date: string;
  booking_time: string;
  booking_time_end: string | null;
  destination: string | null;
  parking_floor: string | null;
  status: string;
  mileage_out: number | null;
  mileage_in: number | null;
  return_image_url: string | null;
  created_at: string;
  returned_at: string | null;
}

interface DB {
  vehicles: Vehicle[];
  bookings: Booking[];
}

function read(): DB {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return { vehicles: [], bookings: [] };
  }
}

function write(db: DB) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url.startsWith("http://") || url.startsWith("https://");
}

// ---- Vehicles ----

export function getVehicles(onlyActive = true): (Vehicle & { vehicles?: undefined })[] {
  const db = read();
  let list = db.vehicles;
  if (onlyActive) list = list.filter((v) => v.is_active);
  return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function getAvailableVehicles(date: string): Vehicle[] {
  const db = read();
  const busyIds = db.bookings
    .filter((b) => b.booking_date === date && ["pending", "confirmed"].includes(b.status))
    .map((b) => b.vehicle_id);
  return db.vehicles.filter((v) => v.is_active && !busyIds.includes(v.id));
}

export function addVehicle(license_plate: string, image_url: string | null): Vehicle {
  const db = read();
  const v: Vehicle = {
    id: randomUUID(),
    license_plate,
    image_url,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  db.vehicles.push(v);
  write(db);
  return v;
}

export function deleteVehicle(id: string): boolean {
  const db = read();
  const v = db.vehicles.find((v) => v.id === id);
  if (!v) return false;
  v.is_active = false;
  write(db);
  return true;
}

// ---- Bookings ----

type BookingWithVehicle = Booking & { vehicles: Pick<Vehicle, "id" | "license_plate" | "image_url"> | null };

function attachVehicle(b: Booking, vehicles: Vehicle[]): BookingWithVehicle {
  const v = vehicles.find((v) => v.id === b.vehicle_id) || null;
  return { ...b, vehicles: v ? { id: v.id, license_plate: v.license_plate, image_url: v.image_url } : null };
}

export function getBookings(filters: {
  date?: string; month?: string; from?: string; to?: string; status?: string[];
}): BookingWithVehicle[] {
  const db = read();
  let list = db.bookings;
  if (filters.date) list = list.filter((b) => b.booking_date === filters.date);
  if (filters.month) list = list.filter((b) => b.booking_date.startsWith(filters.month!));
  if (filters.from) list = list.filter((b) => b.booking_date >= filters.from!);
  if (filters.to) list = list.filter((b) => b.booking_date <= filters.to!);
  if (filters.status?.length) list = list.filter((b) => filters.status!.includes(b.status));
  list = [...list].sort((a, b) =>
    b.booking_date.localeCompare(a.booking_date) || a.booking_time.localeCompare(b.booking_time)
  );
  return list.map((b) => attachVehicle(b, db.vehicles));
}

export function getBookingById(id: string): BookingWithVehicle | null {
  const db = read();
  const b = db.bookings.find((b) => b.id === id);
  if (!b) return null;
  return attachVehicle(b, db.vehicles);
}

export function checkDoubleBooking(
  vehicle_id: string,
  booking_date: string,
  booking_time: string,
  booking_time_end?: string
): boolean {
  const db = read();
  const newStart = booking_time;
  const newEnd = booking_time_end || "23:59";
  return db.bookings.some((b) => {
    if (b.vehicle_id !== vehicle_id || b.booking_date !== booking_date) return false;
    if (!["pending", "confirmed"].includes(b.status)) return false;
    const existStart = b.booking_time;
    const existEnd = b.booking_time_end || "23:59";
    // overlap: newStart < existEnd AND newEnd > existStart
    return newStart < existEnd && newEnd > existStart;
  });
}

export function addBooking(data: {
  vehicle_id: string; booking_date: string; booking_time: string;
  booking_time_end?: string; booker_name: string; booker_phone: string;
  destination?: string;
}): BookingWithVehicle {
  const db = read();
  const b: Booking = {
    id: randomUUID(),
    ...data,
    booking_time_end: data.booking_time_end || null,
    destination: data.destination || null,
    parking_floor: null,
    status: "pending",
    mileage_out: null,
    mileage_in: null,
    return_image_url: null,
    created_at: new Date().toISOString(),
    returned_at: null,
  };
  db.bookings.push(b);
  write(db);
  return attachVehicle(b, db.vehicles);
}

export function deleteBooking(id: string): boolean {
  const db = read();
  const idx = db.bookings.findIndex((b) => b.id === id);
  if (idx === -1) return false;
  db.bookings.splice(idx, 1);
  write(db);
  return true;
}

export function updateBookingStatus(id: string, status: string): BookingWithVehicle | null {
  const db = read();
  const b = db.bookings.find((b) => b.id === id);
  if (!b) return null;
  b.status = status;
  write(db);
  return attachVehicle(b, db.vehicles);
}

export function returnBooking(id: string, data: {
  mileage_out: number; mileage_in: number; parking_floor: string; return_image_url: string;
}): { booking: BookingWithVehicle | null; error?: string } {
  const db = read();
  const b = db.bookings.find((b) => b.id === id);
  if (!b) return { booking: null, error: "ไม่พบข้อมูลการจอง" };
  if (!["pending", "confirmed"].includes(b.status)) {
    return { booking: null, error: "ไม่สามารถคืนรถได้ เนื่องจากสถานะการจองไม่ถูกต้อง" };
  }
  Object.assign(b, { ...data, status: "returned", returned_at: new Date().toISOString() });
  write(db);
  return { booking: attachVehicle(b, db.vehicles) };
}
