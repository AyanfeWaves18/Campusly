import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import CalendarSheet from "../components/CalendarSheet.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { formatWhen } from "../utils/data.js";
import { eventTypes } from "../utils/options.js";
import { checkReminders } from "../utils/reminders.js";
import { fetchEvents, fetchGoingIds, setGoing as saveGoing } from "../lib/events.js";
import { fetchMyMatchIds } from "../lib/likes.js";
import { fetchPeopleByIds } from "../lib/people.js";
import { sendEventInvite } from "../lib/invites.js";
import "../components/Modals.css";
import "./Pages.css";

const COLORS = [
  ["#F4C0D1", "#72243E"],
  ["#CECBF6", "#3C3489"],
  ["#F5C4B3", "#712B13"],
  ["#9FE1CB", "#085041"],
  ["#FAC775", "#633806"],
  ["#C0DD97", "#27500A"],
  ["#B5D4F4", "#0C447C"],
];
const colorFor = (id) => COLORS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();
  const me = getUser() || {};

  const [type, setType] = useState("All");
  const [events, setEvents] = useState([]);
  const [going, setGoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [matches, setMatches] = useState(null); // null = not loaded yet
  const [busy, setBusy] = useState(null);

  const load_ = useCallback(async () => {
    const [e, g] = await Promise.all([fetchEvents(me.uni), fetchGoingIds()]);
    if (e.error) {
      setError(e.error);
    } else {
      setError("");
      setEvents(e.events);
    }
    if (!g.error) setGoing(g.ids);
    setLoading(false);
  }, [me.uni]);

  useEffect(() => {
    load_();
  }, [load_]);

  const shown = useMemo(
    () => events.filter((e) => type === "All" || e.type === type),
    [events, type]
  );

  async function toggleGoing(ev) {
    if (busy) return;
    const was = going.includes(ev.id);
    setBusy(ev.id);
    setGoing((g) => (was ? g.filter((x) => x !== ev.id) : [...g, ev.id]));
    const res = await saveGoing(ev.id, !was);
    setBusy(null);

    if (res.error) {
      setGoing((g) => (was ? [...g, ev.id] : g.filter((x) => x !== ev.id)));
      toast(res.error, "err");
      return;
    }
    if (was) {
      save("reminded", load("reminded", []).filter((x) => x !== ev.id));
      toast("Removed from your events");
      return;
    }
    setSheet({ ev, joined: true });
    const ids = [...going, ev.id];
    checkReminders(toast, events.filter((e) => ids.includes(e.id)));
  }

  async function openInvite(ev) {
    let list = matches;
    if (list === null) {
      setBusy(`inv-${ev.id}`);
      const m = await fetchMyMatchIds();
      const p = m.error ? m : await fetchPeopleByIds(m.ids);
      setBusy(null);
      if (p.error) {
        toast(p.error, "err");
        return;
      }
      list = p.people || [];
      setMatches(list);
    }
    if (list.length === 0) {
      toast("Match with someone first, then invite them", "err");
      return;
    }
    setInviting(ev);
  }

    async function invite(p) {
    setBusy(`to-${p.id}`);
    const res = await sendEventInvite(inviting.id, p.id);
    setBusy(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
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

        {loading && (
          <>
            {[1, 2].map((n) => (
              <div className="ev-card" key={n}>
                <div className="sk sk-line w40"></div>
                <div className="sk sk-line w60"></div>
                <div className="sk sk-line w90"></div>
              </div>
            ))}
          </>
        )}

        {!loading && error && (
          <div className="empty">
            <i className="ti ti-wifi-off"></i>
            <h3>Couldn't load events</h3>
            <p>{error}</p>
            <a href="/events" onClick={(e) => { e.preventDefault(); setLoading(true); load_(); }}>Try again</a>
          </div>
        )}

        {!loading && !error && shown.length === 0 && (
          <div className="empty">
            <i className="ti ti-calendar-off"></i>
            <h3>{events.length === 0 ? "No events yet" : "No events here"}</h3>
            <p>
              {events.length === 0
                ? "New campus events will show up here. Check back soon."
                : "Try another type."}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          shown.map((ev) => {
            const isGoing = going.includes(ev.id);
            return (
              <div className="ev-card" key={ev.id}>
                <span className="ev-type">{ev.type}</span>
                <h3>{ev.title}</h3>
                <div className="ev-meta">{formatWhen(ev.start)} · {ev.where}</div>
                {ev.desc && <p>{ev.desc}</p>}
                <div className="ev-actions">
                  <button
                    className={isGoing ? "on" : ""}
                    onClick={() => toggleGoing(ev)}
                    disabled={busy === ev.id}
                  >
                    {isGoing ? "Going ✓" : "I'm going"}
                  </button>
                  <button onClick={() => openInvite(ev)} disabled={busy === `inv-${ev.id}`}>
                    {busy === `inv-${ev.id}` ? "..." : "Invite a match"}
                  </button>
                </div>
                {isGoing && (
                  <button className="ev-cal" onClick={() => setSheet({ ev, joined: false })}>
                    Add to calendar and set alerts
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {sheet && <CalendarSheet ev={sheet.ev} justJoined={sheet.joined} onClose={() => setSheet(null)} />}

      {inviting && (
        <div className="md-overlay" onClick={() => setInviting(null)}>
          <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Invite to {inviting.title}</h2>
            {matches.map((p) => {
              const [bg, fg] = colorFor(p.id);
              return (
                <button className="row" key={p.id} onClick={() => invite(p)} disabled={busy === `to-${p.id}`}>
                  <Avatar photo={p.photoUrl} name={p.name} bg={bg} fg={fg} />
                  <div className="row-main">
                    <b>{p.name}</b>
                    <span>{p.department}</span>
                  </div>
                </button>
              );
            })}
            <button className="md-btn ghost" onClick={() => setInviting(null)}>Cancel</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}