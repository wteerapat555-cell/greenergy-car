export function formatThaiDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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
  return /^0[0-9]{8,9}$/.test(phone.replace(/[-\s]/g, ""));
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
