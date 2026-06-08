export function formatDate(dateStr: string, lang: "th" | "en" = "th") {
  const thMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
    "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const enMonths = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"];
  const [y, m, d] = dateStr.split("T")[0].split("-");
  const months = lang === "en" ? enMonths : thMonths;
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

export const formatThaiDate = (dateStr: string) => formatDate(dateStr, "th");

export function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

export function generateTimeSlots() {
  const slots: string[] = [];
  for (let h = 7; h <= 18; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 18 && m > 0) break;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export function validatePhone(phone: string) {
  return /^0[0-9]{9}$/.test(phone.replace(/[-\s]/g, ""));
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
