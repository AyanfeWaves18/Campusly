import { events, formatWhen } from "./data.js";
import { load, save } from "./storage.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const stamp = (t) => new Date(t).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
const esc = (s) => String(s).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export function googleCalUrl(ev) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${stamp(ev.start)}/${stamp(ev.start + 2 * HOUR)}`,
    details: ev.desc,
    location: ev.where,
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// .ics file with two alerts: 1 day before and 1 hour before
export function downloadIcs(ev) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campusly//Events//EN",
    "BEGIN:VEVENT",
    `UID:campusly-${ev.id}@campusly.app`,
    `DTSTAMP:${stamp(Date.now())}`,
    `DTSTART:${stamp(ev.start)}`,
    `DTEND:${stamp(ev.start + 2 * HOUR)}`,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(ev.where)}`,
    `DESCRIPTION:${esc(ev.desc)}`,
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(ev.title)} is tomorrow`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(ev.title)} starts in 1 hour`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.title.replace(/[^\w]+/g, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function askNotify() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") return await Notification.requestPermission();
  return Notification.permission;
}

async function showNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, { body, icon: "/favicon-192.png" });
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body, icon: "/favicon-192.png" });
  } catch {
    /* ignore */
  }
}

// Fires once per event, from 24 hours before it starts
export function checkReminders(toast) {
  const going = load("going", []);
  const reminded = load("reminded", []);
  const now = Date.now();
  let changed = false;

  going.forEach((id) => {
    const ev = events.find((e) => e.id === id);
    if (!ev || reminded.includes(id)) return;
    if (now >= ev.start - DAY && now < ev.start) {
      reminded.push(id);
      changed = true;
      const body = `${formatWhen(ev.start)} at ${ev.where}`;
      toast(`Reminder: ${ev.title} is coming up. ${body}`, "match", 8000);
      showNotification(`${ev.title} is coming up`, body);
    }
  });

  if (changed) save("reminded", reminded);
}