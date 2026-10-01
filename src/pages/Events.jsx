import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import CalendarSheet from "../components/CalendarSheet.jsx";
import { useToast } from "../components/Toast.jsx";
import { load, save } from "../utils/storage.js";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { events, formatWhen, profiles } from "../utils/data.js";
import { eventTypes } from "../utils/options.js";
import { checkReminders } from "../utils/reminders.js";
import "../components/Modals.css";
import "./Pages.css";

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();
  const [type, setType] = useState("All");
  const [going, setGoing] = useState(() => load("going", []));
  const [inviting, setInviting] = useState(null);
  const [sheet, setSheet] = useState(null);

  const likes = load("likes", []);
  const blocked = load("blocked", []);
  const matches = profiles.filter((p) => likes.includes(p.id) && p.likedYou && !blocked.includes(p.id));
  const shown = events
    .filter((e) => e.start > Date.now() && (type === "All" || e.type === type))
    .sort((a, b) => a.start - b.start);

  function toggleGoing(ev) {
    if (going.includes(ev.id)) {
      const next = going.filter((x) => x !== ev.id);
      setGoing(next);
      save("going", next);
      save("reminded", load("reminded", []).filter((x) => x !== ev.id));
      toast("Removed from your events");
      return;
    }
    const next = [...going, ev.id];
    setGoing(next);
    save("going", next);
    setSheet({ ev, joined: true });
    checkReminders(toast);
  }

  function openInvite(ev) {
    if (matches.length === 0) {
      toast("Match with someone first, then invite them", "err");
      return;
    }
    setInviting(ev);
  }

  function invite(p) {
    const chats = load("chats", {});
    const msg = {
      from: "me",
      text: `Want to go to ${inviting.title} together? (${formatWhen(inviting.start)}, ${inviting.where})`,
      t: Date.now(),
    };
    save("chats", { ...chats, [p.id]: [...(chats[p.id] || []), msg] });
    toast(`Invite sent to ${p.name}`);
    setInviting(null);
    navigate(`/chat/${p.id}`);
  }

  return (
    <AppLayout>
      <div className="pg">
        <h1>Campus events</h1>
        <p className="pg-sub">Go together with a match, or meet people there.</p>

        <div className="pg-tabs">
          {eventTypes.map((t) => (
            <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="empty">
            <i className="ti ti-calendar-off"></i>
            <h3>No events here yet</h3>
            <p>Check back soon.</p>
          </div>
        )}

        {shown.map((ev) => (
          <div className="ev-card" key={ev.id}>
            <span className="ev-type">{ev.type}</span>
            <h3>{ev.title}</h3>
            <div className="ev-meta">{formatWhen(ev.start)} · {ev.where}</div>
            <p>{ev.desc}</p>
            <div className="ev-actions">
              <button className={going.includes(ev.id) ? "on" : ""} onClick={() => toggleGoing(ev)}>
                {going.includes(ev.id) ? "Going ✓" : "I'm going"}
              </button>
              <button onClick={() => openInvite(ev)}>Invite a match</button>
            </div>
            {going.includes(ev.id) && (
              <button className="ev-cal" onClick={() => setSheet({ ev, joined: false })}>
                Add to calendar and set alerts
              </button>
            )}
          </div>
        ))}
      </div>

      {sheet && <CalendarSheet ev={sheet.ev} justJoined={sheet.joined} onClose={() => setSheet(null)} />}

      {inviting && (
        <div className="md-overlay" onClick={() => setInviting(null)}>
          <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Invite to {inviting.title}</h2>
            {matches.map((p) => (
              <button className="row" key={p.id} onClick={() => invite(p)}>
                <Avatar name={p.name} bg={p.bg} fg={p.fg} />
                <div className="row-main">
                  <b>{p.name}</b>
                  <span>{p.department}</span>
                </div>
              </button>
            ))}
            <button className="md-btn ghost" onClick={() => setInviting(null)}>Cancel</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}