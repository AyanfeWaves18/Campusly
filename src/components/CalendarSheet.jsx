import { useToast } from "./Toast.jsx";
import { askNotify, downloadIcs, googleCalUrl } from "../utils/reminders.js";
import { formatWhen } from "../utils/data.js";
import "./Modals.css";

export default function CalendarSheet({ ev, onClose, justJoined }) {
  const toast = useToast();

  async function turnOnNotifications() {
    const r = await askNotify();
    if (r === "granted") toast("Reminder notifications are on");
    else if (r === "unsupported") toast("This browser doesn't support notifications", "err");
    else toast("Notifications are blocked. Turn them on in your browser settings.", "err");
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{justJoined ? `You're going to ${ev.title}` : `Add ${ev.title}`}</h2>
        <p className="md-text">
          {formatWhen(ev.start)} · {ev.where}. We'll remind you a day before. Add it to your
          calendar to get alerts and alarms on your phone too.
        </p>
        <div className="md-list">
          <a href={googleCalUrl(ev)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
          <button onClick={() => { downloadIcs(ev); toast("Calendar file downloaded"); }}>
            Apple / Outlook calendar (.ics)
          </button>
          <button onClick={turnOnNotifications}>Turn on reminder notifications</button>
          <button className="ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}