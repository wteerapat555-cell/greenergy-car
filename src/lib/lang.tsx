"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "th" | "en";

interface LangCtx {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangCtx>({ lang: "th", toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "th";
    const saved = localStorage.getItem("lang") as Lang | null;
    return saved === "th" || saved === "en" ? saved : "th";
  });

  function toggle() {
    setLang((prev) => {
      const next: Lang = prev === "th" ? "en" : "th";
      localStorage.setItem("lang", next);
      return next;
    });
  }

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/* ─── LangToggle button (shared UI) ─── */
export function LangToggle({ dark }: { dark?: boolean } = {}) {
  const { lang, toggle } = useLang();
  const cls = dark
    ? "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/30 bg-white/10 text-caption text-white hover:bg-white/20 hover:border-white/60 transition-colors font-dm-sans"
    : "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-gray/50 bg-white text-caption text-dark-text hover:border-forest-green hover:text-forest-green transition-colors font-dm-sans";
  return (
    <button
      onClick={toggle}
      className={cls}
      aria-label="Switch language"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      {lang === "th" ? "EN" : "ไทย"}
    </button>
  );
}

/* ─── Translation tables ─── */
export const T = {
  /* ── home ── */
  home: {
    th: {
      statusToday: "สถานะวันนี้", manage: "จัดการ",
      available: "รถว่าง", inUse: "กำลังใช้", pending: "รอยืนยัน",
      bookingsToday: "จองวันนี้", bookingsUnit: "รายการ",
      returned: "คืนแล้ว", vehicleUnit: "คัน", totalVehicles: "รถ",
      loadError: "ไม่สามารถโหลดข้อมูลได้",
      bookOutbound: "จองรถ (ขาไป)", bookReturn: "คืนรถ (ขากลับ)",
      footer: "© 2026 Greenergy Car Reservation",
      adminLogin: "เข้าสู่ระบบผู้ดูแลระบบ",
    },
    en: {
      statusToday: "Today's Status", manage: "Manage",
      available: "Available", inUse: "In Use", pending: "Pending",
      bookingsToday: "Today's bookings", bookingsUnit: "",
      returned: "Returned", vehicleUnit: "", totalVehicles: "Total",
      loadError: "Unable to load data",
      bookOutbound: "Book a Car (Outbound)", bookReturn: "Return a Car (Inbound)",
      footer: "© 2026 Greenergy Car Reservation",
      adminLogin: "Admin Login",
    },
  },
  /* ── outbound ── */
  outbound: {
    th: {
      title: "จองรถขาไป", back: "← กลับ",
      steps: ["เลือกรถ", "วัน-เวลา", "ข้อมูลผู้จอง", "ยืนยัน"],
      step1Title: "เลือกรถ", noVehicle: "ไม่มีรถว่างในขณะนี้", noImage: "ไม่มีภาพ",
      errSelectVehicle: "กรุณาเลือกรถ",
      step2Title: "เลือกวันและเวลา",
      labelDate: "วันที่", labelStart: "เวลาเริ่มต้น", labelEnd: "เวลาสิ้นสุด",
      errDate: "กรุณาเลือกวันที่", errDatePast: "ไม่สามารถเลือกวันในอดีตได้",
      errTimeStart: "กรุณาเลือกเวลาเริ่มต้น", errTimeEnd: "กรุณาเลือกเวลาสิ้นสุด",
      errTimeEndInvalid: "เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น",
      duration: "ระยะเวลา", durationUnit: "น.",
      step3Title: "ข้อมูลผู้จอง",
      labelName: "ชื่อ-นามสกุล", placeholderName: "กรอกชื่อ-นามสกุล",
      labelPhone: "เบอร์โทรศัพท์",
      labelDest: "ชื่อโครงการ / จุดหมาย", placeholderDest: "เช่น โครงการ ABC, ประชุมสำนักงานใหญ่",
      errName: "กรุณากรอกชื่อ-นามสกุล", errPhone: "กรุณากรอกเบอร์โทรศัพท์",
      errPhoneInvalid: "รูปแบบเบอร์โทรไม่ถูกต้อง", errDest: "กรุณากรอกชื่อโครงการ/จุดหมาย",
      step4Title: "ยืนยันการจอง",
      rowPlate: "ทะเบียนรถ", rowDate: "วันที่", rowTime: "เวลา",
      rowName: "ชื่อผู้จอง", rowPhone: "เบอร์โทรศัพท์", rowDest: "โครงการ / จุดหมาย",
      btnConfirm: "ยืนยันการจอง", btnSaving: "กำลังบันทึก...",
      btnNext: "ถัดไป", btnBack: "ย้อนกลับ",
      toastSuccess: "จองรถสำเร็จ!", toastError: "จองรถไม่สำเร็จ กรุณาลองใหม่",
      loadError: "โหลดข้อมูลรถไม่สำเร็จ",
      timeUnit: "น.",
    },
    en: {
      title: "Book a Car (Outbound)", back: "← Back",
      steps: ["Select Car", "Date & Time", "Booker Info", "Confirm"],
      step1Title: "Select a Car", noVehicle: "No cars available at the moment", noImage: "No image",
      errSelectVehicle: "Please select a car",
      step2Title: "Select Date & Time",
      labelDate: "Date", labelStart: "Start Time", labelEnd: "End Time",
      errDate: "Please select a date", errDatePast: "Cannot select a past date",
      errTimeStart: "Please select a start time", errTimeEnd: "Please select an end time",
      errTimeEndInvalid: "End time must be later than start time",
      duration: "Duration", durationUnit: "",
      step3Title: "Booker Information",
      labelName: "Full Name", placeholderName: "Enter full name",
      labelPhone: "Phone Number",
      labelDest: "Project / Destination", placeholderDest: "e.g. Project ABC, Head office meeting",
      errName: "Please enter your full name", errPhone: "Please enter your phone number",
      errPhoneInvalid: "Invalid phone number format", errDest: "Please enter project / destination",
      step4Title: "Confirm Booking",
      rowPlate: "License Plate", rowDate: "Date", rowTime: "Time",
      rowName: "Booker Name", rowPhone: "Phone Number", rowDest: "Project / Destination",
      btnConfirm: "Confirm Booking", btnSaving: "Saving...",
      btnNext: "Next", btnBack: "Back",
      toastSuccess: "Car booked successfully!", toastError: "Booking failed. Please try again.",
      loadError: "Failed to load vehicles",
      timeUnit: "",
    },
  },
  /* ── return ── */
  return: {
    th: {
      title: "คืนรถขากลับ", back: "← กลับ",
      labelPlate: "ทะเบียนรถที่คืน", selectPlate: "— เลือกทะเบียนรถ —",
      noBookings: "ไม่มีรถที่รอคืน — กรุณาตรวจสอบว่ามีการจองที่ได้รับการยืนยันแล้ว",
      loading: "กำลังโหลด...",
      infoBooker: "ผู้จอง", infoDate: "วันที่จอง", infoTime: "เวลา", infoStatus: "สถานะ",
      statusConfirmed: "ยืนยันแล้ว", statusPending: "รอยืนยัน",
      labelMileOut: "เลขไมล์ขาไป", placeholderMileOut: "กรอกเลขไมล์ตอนออกเดินทาง",
      labelMileIn: "เลขไมล์ขากลับ", placeholderMileIn: "ต้องมากกว่าขาไป",
      mileUsed: "ระยะทางที่ใช้", mileUnit: "กม.",
      labelParking: "ชั้นที่จอดรถ", placeholderParking: "เช่น ชั้น B1, ชั้น 2",
      labelImage: "ภาพรถ (บังคับ)",
      uploadClick: "คลิกหรือลากไฟล์มาวางที่นี่", uploadHint: "JPG / PNG สูงสุด 5MB",
      uploading: "กำลังอัปโหลดภาพ...", changeImage: "คลิกเพื่อเปลี่ยนภาพ",
      btnSubmit: "ยืนยันการคืนรถ", btnSaving: "กำลังบันทึก...", btnWaitUpload: "รอการอัปโหลดภาพ...",
      errBooking: "กรุณาเลือกทะเบียนรถ", errMileOut: "กรุณากรอกเลขไมล์ขาไป",
      errMileIn: "กรุณากรอกเลขไมล์ขากลับ", errMileInLow: "เลขไมล์ขากลับต้องมากกว่าขาไป",
      errParking: "กรุณากรอกชั้นที่จอดรถ", errImage: "กรุณาถ่าย/อัปโหลดภาพรถ",
      errImageType: "รองรับเฉพาะไฟล์ JPG และ PNG เท่านั้น", errImageSize: "ขนาดไฟล์ต้องไม่เกิน 5MB",
      toastSuccess: "คืนรถสำเร็จ!", toastError: "คืนรถไม่สำเร็จ กรุณาลองใหม่",
      loadError: "โหลดข้อมูลการจองไม่สำเร็จ", uploadError: "อัปโหลดภาพไม่สำเร็จ",
      mileOutSaved: "กรอกไว้:",
      timeUnit: "น.",
    },
    en: {
      title: "Return a Car (Inbound)", back: "← Back",
      labelPlate: "Vehicle to Return", selectPlate: "— Select license plate —",
      noBookings: "No cars pending return — please check that a booking has been confirmed.",
      loading: "Loading...",
      infoBooker: "Booker", infoDate: "Booking Date", infoTime: "Time", infoStatus: "Status",
      statusConfirmed: "Confirmed", statusPending: "Pending",
      labelMileOut: "Outbound Mileage", placeholderMileOut: "Mileage when departing",
      labelMileIn: "Return Mileage", placeholderMileIn: "Must be greater than outbound",
      mileUsed: "Distance used", mileUnit: "km",
      labelParking: "Parking Floor", placeholderParking: "e.g. B1, Floor 2",
      labelImage: "Vehicle Photo (required)",
      uploadClick: "Click or drag & drop a file here", uploadHint: "JPG / PNG up to 5 MB",
      uploading: "Uploading photo...", changeImage: "Click to change photo",
      btnSubmit: "Confirm Return", btnSaving: "Saving...", btnWaitUpload: "Waiting for upload...",
      errBooking: "Please select a vehicle", errMileOut: "Please enter the outbound mileage",
      errMileIn: "Please enter the return mileage", errMileInLow: "Return mileage must be greater than outbound",
      errParking: "Please enter the parking floor", errImage: "Please upload a vehicle photo",
      errImageType: "Only JPG and PNG files are supported", errImageSize: "File size must not exceed 5 MB",
      toastSuccess: "Car returned successfully!", toastError: "Return failed. Please try again.",
      loadError: "Failed to load bookings", uploadError: "Photo upload failed",
      mileOutSaved: "Recorded:",
      timeUnit: "",
    },
  },
  /* ── admin layout ── */
  adminLayout: {
    th: {
      brand: "Greenergy Admin",
      navDashboard: "แดชบอร์ด", navVehicles: "จัดการรถ",
      navMonthly: "สรุปรายเดือน", navReport: "รายงาน",
      home: "← หน้าหลัก", logout: "ออกจากระบบ",
      checking: "กำลังตรวจสอบสิทธิ์...",
      toastLogout: "ออกจากระบบแล้ว",
    },
    en: {
      brand: "Greenergy Admin",
      navDashboard: "Dashboard", navVehicles: "Vehicles",
      navMonthly: "Monthly Summary", navReport: "Reports",
      home: "← Home", logout: "Logout",
      checking: "Verifying access...",
      toastLogout: "Logged out successfully",
    },
  },
  /* ── admin dashboard ── */
  dashboard: {
    th: {
      title: "แดชบอร์ด",
      statTotal: "จองวันนี้", statTotalAll: "จองทั้งหมด",
      statInUse: "กำลังใช้งาน", statReturned: "คืนแล้ว", statCancelled: "ยกเลิก",
      filterToday: "วันนี้", filterMonth: "เดือนนี้", filterRange: "ช่วงวันที่",
      filterTo: "ถึง", btnSearch: "ค้นหา",
      colPlate: "ทะเบียน", colName: "ชื่อ", colDateTime: "วันเวลา",
      colDest: "โครงการ / จุดหมาย", colParking: "ชั้นจอด",
      colStatus: "สถานะ", colImage: "ภาพ", colAction: "Action",
      noData: "ไม่มีข้อมูลการจอง",
      statusPending: "รอยืนยัน", statusConfirmed: "ยืนยันแล้ว",
      statusReturned: "คืนแล้ว", statusCancelled: "ยกเลิก",
      btnConfirm: "ยืนยัน", btnCancel: "ยกเลิก", btnDelete: "ลบ",
      dialogConfirmTitle: "ยืนยันการจอง", dialogConfirmMsg: "คุณต้องการยืนยันการจองนี้ใช่หรือไม่?",
      dialogConfirmLabel: "ยืนยัน",
      dialogCancelTitle: "ยกเลิกการจอง", dialogCancelMsg: "คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?",
      dialogCancelLabel: "ยกเลิกการจอง",
      dialogDeleteTitle: "ลบการจอง", dialogDeleteMsg: "คุณต้องการลบการจองนี้ออกจากระบบถาวรใช่หรือไม่?",
      dialogDeleteLabel: "ลบถาวร",
      toastUpdated: "อัปเดตสถานะเป็น", toastUpdatedSuffix: "แล้ว",
      toastUpdateErr: "อัปเดตสถานะไม่สำเร็จ",
      toastDeleted: "ลบการจองสำเร็จ", toastDeleteErr: "ลบการจองไม่สำเร็จ",
      loadError: "โหลดข้อมูลการจองไม่สำเร็จ",
    },
    en: {
      title: "Dashboard",
      statTotal: "Today's Bookings", statTotalAll: "Total Bookings",
      statInUse: "In Use", statReturned: "Returned", statCancelled: "Cancelled",
      filterToday: "Today", filterMonth: "This Month", filterRange: "Date Range",
      filterTo: "to", btnSearch: "Search",
      colPlate: "Plate", colName: "Name", colDateTime: "Date & Time",
      colDest: "Project / Destination", colParking: "Parking",
      colStatus: "Status", colImage: "Photo", colAction: "Action",
      noData: "No bookings found",
      statusPending: "Pending", statusConfirmed: "Confirmed",
      statusReturned: "Returned", statusCancelled: "Cancelled",
      btnConfirm: "Confirm", btnCancel: "Cancel", btnDelete: "Delete",
      dialogConfirmTitle: "Confirm Booking", dialogConfirmMsg: "Do you want to confirm this booking?",
      dialogConfirmLabel: "Confirm",
      dialogCancelTitle: "Cancel Booking", dialogCancelMsg: "Do you want to cancel this booking?",
      dialogCancelLabel: "Cancel Booking",
      dialogDeleteTitle: "Delete Booking", dialogDeleteMsg: "Permanently delete this booking from the system?",
      dialogDeleteLabel: "Delete Permanently",
      toastUpdated: "Status updated to", toastUpdatedSuffix: "",
      toastUpdateErr: "Failed to update status",
      toastDeleted: "Booking deleted", toastDeleteErr: "Failed to delete booking",
      loadError: "Failed to load bookings",
    },
  },
  /* ── admin vehicles ── */
  vehicles: {
    th: {
      title: "จัดการรถ", btnAdd: "+ เพิ่มทะเบียนรถ",
      noVehicle: "ยังไม่มีรถในระบบ",
      active: "ใช้งานได้", inactive: "ไม่ใช้งาน",
      btnDelete: "ลบ",
      modalTitle: "เพิ่มทะเบียนรถ",
      labelPlate: "ทะเบียนรถ", placeholderPlate: "เช่น กข 1234",
      labelImage: "ภาพรถ (ไม่บังคับ)", uploadHint: "คลิกเพื่ออัปโหลดภาพ",
      btnCancel: "ยกเลิก", btnAddConfirm: "เพิ่ม",
      errPlate: "กรุณากรอกทะเบียนรถ",
      confirmDeleteTitle: "ลบทะเบียนรถ", confirmDeleteMsg: "คุณต้องการลบทะเบียนรถนี้ออกจากระบบใช่หรือไม่?",
      confirmDeleteLabel: "ลบ",
      toastAdded: "เพิ่มทะเบียนรถสำเร็จ", toastDeleted: "ลบทะเบียนรถสำเร็จ",
      toastAddErr: "เพิ่มทะเบียนรถไม่สำเร็จ", toastDeleteErr: "ลบทะเบียนรถไม่สำเร็จ",
      loadError: "โหลดข้อมูลรถไม่สำเร็จ",
      noImage: "ไม่มีภาพ",
    },
    en: {
      title: "Manage Vehicles", btnAdd: "+ Add Vehicle",
      noVehicle: "No vehicles in the system",
      active: "Available", inactive: "Inactive",
      btnDelete: "Delete",
      modalTitle: "Add Vehicle",
      labelPlate: "License Plate", placeholderPlate: "e.g. ABC 1234",
      labelImage: "Vehicle Photo (optional)", uploadHint: "Click to upload photo",
      btnCancel: "Cancel", btnAddConfirm: "Add",
      errPlate: "Please enter the license plate",
      confirmDeleteTitle: "Delete Vehicle", confirmDeleteMsg: "Are you sure you want to remove this vehicle from the system?",
      confirmDeleteLabel: "Delete",
      toastAdded: "Vehicle added successfully", toastDeleted: "Vehicle deleted successfully",
      toastAddErr: "Failed to add vehicle", toastDeleteErr: "Failed to delete vehicle",
      loadError: "Failed to load vehicles",
      noImage: "No photo",
    },
  },
  /* ── admin monthly ── */
  monthly: {
    th: {
      title: "สรุปรายเดือน", btnExport: "Export CSV",
      noData: "ไม่มีข้อมูลการจองในเดือนนี้",
      kpiTotal: "การจองทั้งหมด", kpiUnit: "ครั้ง",
      kpiReturned: "คืนรถสำเร็จ",
      kpiMileage: "ไมล์รวม", kpiMileUnit: "กม.",
      kpiCancelled: "ยกเลิก", kpiPendingPre: "รอดำเนินการ",
      tollTitle: "ค่าทางด่วนประจำเดือน",
      tollLabel: "ค่าทางด่วนรวม (บาท)", tollPlaceholder: "เช่น 850",
      tollTotal: "รวมค่าทางด่วน", tollBaht: "บาท",
      tollPerKm: "เฉลี่ยต่อ กม.", tollPerTrip: "เฉลี่ยต่อเที่ยว",
      vehicleTitle: "การใช้งานแยกตามรถ",
      mileUnit: "กม.", tripsUnit: "ครั้ง", returnedLabel: "คืนแล้ว", cancelledLabel: "ยกเลิก",
      userTitle: "ผู้ใช้รถบ่อยที่สุด", userUnit: "ครั้ง",
      busiestTitle: "วันที่มีการจองมากสุด",
      donutTitle: "สัดส่วนสถานะการจอง", donutCenter: "สำเร็จ",
      listTitle: "รายการจองทั้งหมด", listUnit: "รายการ",
      colDate: "วันที่", colPlate: "ทะเบียน", colName: "ชื่อ",
      colTime: "เวลา", colMile: "ไมล์ (กม.)", colStatus: "สถานะ",
      statusPending: "รอยืนยัน", statusConfirmed: "ยืนยันแล้ว",
      statusReturned: "คืนแล้ว", statusCancelled: "ยกเลิก",
      showAll: "แสดงทั้งหมด", showLess: "แสดงน้อยลง ↑",
      recTitle: "ข้อเสนอแนะจากข้อมูลเดือนนี้",
      tollSummaryTitle: "สรุปค่าทางด่วน",
      tollSumTotal: "ค่าทางด่วนรวม", tollSumPerTrip: "เฉลี่ยต่อเที่ยว",
      tollSumPerKm: "เฉลี่ยต่อ กม.", tollSumPerDay: "เฉลี่ยต่อวัน",
      tollBahtPerTrip: "บาท/เที่ยว", tollBahtPerKm: "บาท/กม.", tollBahtPerDay: "บาท/วัน",
      toastExport: "ส่งออก CSV สำเร็จ",
      loadError: "โหลดข้อมูลไม่สำเร็จ",
    },
    en: {
      title: "Monthly Summary", btnExport: "Export CSV",
      noData: "No bookings found for this month",
      kpiTotal: "Total Bookings", kpiUnit: "trips",
      kpiReturned: "Completed Returns",
      kpiMileage: "Total Mileage", kpiMileUnit: "km",
      kpiCancelled: "Cancelled", kpiPendingPre: "Pending",
      tollTitle: "Monthly Toll Expenses",
      tollLabel: "Total Toll (THB)", tollPlaceholder: "e.g. 850",
      tollTotal: "Total Toll", tollBaht: "THB",
      tollPerKm: "Per km", tollPerTrip: "Per trip",
      vehicleTitle: "Usage by Vehicle",
      mileUnit: "km", tripsUnit: "trips", returnedLabel: "returned", cancelledLabel: "cancelled",
      userTitle: "Most Frequent Users", userUnit: "trips",
      busiestTitle: "Busiest Days",
      donutTitle: "Booking Status Breakdown", donutCenter: "Success",
      listTitle: "All Bookings", listUnit: "entries",
      colDate: "Date", colPlate: "Plate", colName: "Name",
      colTime: "Time", colMile: "Mileage (km)", colStatus: "Status",
      statusPending: "Pending", statusConfirmed: "Confirmed",
      statusReturned: "Returned", statusCancelled: "Cancelled",
      showAll: "Show all", showLess: "Show less ↑",
      recTitle: "Insights from This Month's Data",
      tollSummaryTitle: "Toll Expense Summary",
      tollSumTotal: "Total Toll", tollSumPerTrip: "Per Trip",
      tollSumPerKm: "Per km", tollSumPerDay: "Per Day",
      tollBahtPerTrip: "THB/trip", tollBahtPerKm: "THB/km", tollBahtPerDay: "THB/day",
      toastExport: "CSV exported successfully",
      loadError: "Failed to load data",
    },
  },
  /* ── admin report ── */
  report: {
    th: {
      title: "รายงาน",
      tabDaily: "รายวัน", tabMonthly: "รายเดือน", tabExpense: "ค่าใช้จ่าย",
      btnReload: "โหลดใหม่", btnExportCSV: "Export CSV",
      noDataDaily: "ไม่มีข้อมูลการจองในวันนี้",
      colPlate: "ทะเบียน", colName: "ชื่อ", colTime: "เวลา", colParking: "ชั้นจอด",
      colMileOut: "ไมล์ขาไป", colMileIn: "ไมล์ขากลับ", colDist: "ระยะ", colStatus: "สถานะ",
      colDate: "วันที่",
      statusPending: "รอยืนยัน", statusConfirmed: "ยืนยันแล้ว",
      statusReturned: "คืนแล้ว", statusCancelled: "ยกเลิก",
      distUnit: "กม.",
      monthlySumTitle: "สรุปรายคัน",
      noMonthlyData: "ไม่มีข้อมูลในเดือนนี้",
      colUsage: "จำนวนใช้งาน", colReturnedCount: "คืนรถแล้ว",
      colMileTotal: "ไมล์รวม (กม.)", colFuel: "เติมน้ำมัน (ล.)", colShare: "สัดส่วนไมล์",
      usageUnit: "ครั้ง",
      totalRow: "รวม",
      summaryCards: ["การจองทั้งหมด", "คืนรถแล้ว", "ไมล์รวม", "เติมน้ำมันรวม"],
      summaryUnits: ["ครั้ง", "ครั้ง", "กม.", "ล."],
      fuelFillTitle: "บันทึกการเติมน้ำมันต่อครั้ง",
      addFuelTitle: "เพิ่มรายการเติมน้ำมัน",
      labelVehicle: "ทะเบียนรถ", selectVehicle: "— เลือกรถ —",
      labelFillDate: "วันที่เติม", labelLiters: "จำนวน (ลิตร)", placeholderLiters: "เช่น 35.5",
      labelAmount: "ยอดเงิน (บาท)", placeholderAmount: "เช่น 1500",
      labelNote: "หมายเหตุ (ไม่บังคับ)", placeholderNote: "เช่น ปตท. สาขาลาดกระบัง",
      btnAddFuel: "+ เพิ่มรายการ", btnDeleteFuel: "ลบ",
      noFuelData: "ยังไม่มีรายการเติมน้ำมัน — เพิ่มจากแบบฟอร์มด้านบน",
      colFuelDate: "วันที่", colFuelLiters: "ลิตร", colFuelAmount: "ยอดเงิน", colFuelNote: "หมายเหตุ",
      fuelTotalRow: "รวม", fuelUnit: "ล.", fuelBaht: "บาท",
      allBookingsTitle: "รายการจองทั้งหมดในเดือนนี้",
      expenseTitle: "กรอกข้อมูลค่าใช้จ่าย",
      labelFuelRate: "ค่าน้ำมันต่อลิตร (บาท)", placeholderFuelRate: "เช่น 42.50",
      labelConsumption: "อัตราสิ้นเปลือง (กม./ลิตร)", placeholderConsumption: "เช่น 12",
      labelToll: "ค่าทางด่วนรวม (บาท)",
      expenseSummaryTitle: "สรุปค่าใช้จ่าย",
      totalMileLabel: "ไมล์รวม", fuelActual: "น้ำมันที่เติมจริง",
      fuelEstLabel: "ค่าน้ำมันโดยประมาณ", tollLabel: "ค่าทางด่วน", grandTotal: "ยอดรวม",
      exportDetailLabel: "Export CSV (รายการ)", exportSummaryLabel: "Export CSV (สรุป)",
      toastExport: "ส่งออก CSV สำเร็จ", toastExportMonthly: "ส่งออก CSV สรุปรายเดือนสำเร็จ",
      toastFuelAdded: "บันทึกการเติมน้ำมันแล้ว",
      errFuelMissing: "กรุณากรอกข้อมูลการเติมน้ำมันให้ครบ",
      errFuelZero: "จำนวนลิตรและยอดเงินต้องมากกว่า 0",
      loadError: "โหลดข้อมูลไม่สำเร็จ",
    },
    en: {
      title: "Reports",
      tabDaily: "Daily", tabMonthly: "Monthly", tabExpense: "Expenses",
      btnReload: "Reload", btnExportCSV: "Export CSV",
      noDataDaily: "No bookings for this day",
      colPlate: "Plate", colName: "Name", colTime: "Time", colParking: "Parking",
      colMileOut: "Out Mileage", colMileIn: "In Mileage", colDist: "Distance", colStatus: "Status",
      colDate: "Date",
      statusPending: "Pending", statusConfirmed: "Confirmed",
      statusReturned: "Returned", statusCancelled: "Cancelled",
      distUnit: "km",
      monthlySumTitle: "Per-Vehicle Summary",
      noMonthlyData: "No data for this month",
      colUsage: "Trips", colReturnedCount: "Returned",
      colMileTotal: "Total Mileage (km)", colFuel: "Fuel (L)", colShare: "Mileage Share",
      usageUnit: "trips",
      totalRow: "Total",
      summaryCards: ["Total Bookings", "Returned", "Total Mileage", "Total Fuel"],
      summaryUnits: ["trips", "trips", "km", "L"],
      fuelFillTitle: "Fuel Fill Log",
      addFuelTitle: "Add Fuel Fill Entry",
      labelVehicle: "Vehicle", selectVehicle: "— Select vehicle —",
      labelFillDate: "Fill Date", labelLiters: "Liters", placeholderLiters: "e.g. 35.5",
      labelAmount: "Amount (THB)", placeholderAmount: "e.g. 1500",
      labelNote: "Note (optional)", placeholderNote: "e.g. PTT Lat Krabang",
      btnAddFuel: "+ Add Entry", btnDeleteFuel: "Delete",
      noFuelData: "No fuel fill entries yet — add from the form above",
      colFuelDate: "Date", colFuelLiters: "Liters", colFuelAmount: "Amount", colFuelNote: "Note",
      fuelTotalRow: "Total", fuelUnit: "L", fuelBaht: "THB",
      allBookingsTitle: "All Bookings This Month",
      expenseTitle: "Enter Expense Data",
      labelFuelRate: "Fuel Price per Liter (THB)", placeholderFuelRate: "e.g. 42.50",
      labelConsumption: "Fuel Consumption (km/L)", placeholderConsumption: "e.g. 12",
      labelToll: "Total Toll (THB)",
      expenseSummaryTitle: "Expense Summary",
      totalMileLabel: "Total Mileage", fuelActual: "Actual Fuel Filled",
      fuelEstLabel: "Estimated Fuel Cost", tollLabel: "Toll Cost", grandTotal: "Grand Total",
      exportDetailLabel: "Export CSV (Detail)", exportSummaryLabel: "Export CSV (Summary)",
      toastExport: "CSV exported successfully", toastExportMonthly: "Monthly summary CSV exported",
      toastFuelAdded: "Fuel fill entry saved",
      errFuelMissing: "Please fill in all fuel fill details",
      errFuelZero: "Liters and amount must be greater than 0",
      loadError: "Failed to load data",
    },
  },
} as const;
