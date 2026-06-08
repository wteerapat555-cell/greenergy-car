export type BookingStatus = "pending" | "confirmed" | "returned" | "cancelled";

export interface Vehicle {
  id: string;
  license_plate: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  vehicle_id: string;
  booker_name: string;
  booker_phone: string;
  booking_date: string;
  booking_time: string;
  booking_time_end: string | null;
  destination: string | null;
  parking_floor: string | null;
  status: BookingStatus;
  mileage_out: number | null;
  mileage_in: number | null;
  return_image_url: string | null;
  created_at: string;
  returned_at: string | null;
  vehicles?: Vehicle;
}

export interface BookingFormData {
  vehicle_id: string;
  booking_date: string;
  booking_time: string;
  booking_time_end: string;
  booker_name: string;
  booker_phone: string;
  destination: string;
}

export interface ReturnFormData {
  vehicle_id: string;
  mileage_out: number;
  mileage_in: number;
  parking_floor: string;
  return_image_url: string;
}
