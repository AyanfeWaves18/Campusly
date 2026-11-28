import "./DayDivider.css";

const day = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Same calendar day? (in the person's own time zone)
export const sameDay = (a, b) => day(a).getTime() === day(b).getTime();

// "Today", "Yesterday", "Monday", then "24 Nov" (with the year when it's not this year)
export function dayLabel(t) {
  const d = day(t);
  const now = day(Date.now());
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: "long" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString([], sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

export default function DayDivider({ ts }) {
  return (
    <div className="dd" role="separator">
      <span>{dayLabel(ts)}</span>
    </div>
  );
}