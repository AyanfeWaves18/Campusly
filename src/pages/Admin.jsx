import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser } from "../utils/storage.js";
import { formatWhen } from "../utils/data.js";
import { eventTypes } from "../utils/options.js";
import {
  checkAdmin,
  fetchAdminEvents,
  fetchAdminReports,
  fetchAdminStats,
  removeEvent,
  saveEvent,
  setReportStatus,
} from "../lib/admin.js";
import "./Inner.css";
import "./Pages.css";

const CAMPUSES = ["Crawford University"];
const TYPES = eventTypes.filter((t) => t !== "All");

const toLocalInput = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const emptyForm = (uni) => ({
  id: null,
  uni: uni || CAMPUSES[0],
  title: "",
  type: TYPES[0],
  startsLocal: "",
  place: "",
  description: "",
});

export default function Admin() {
  const toast = useToast();
  const me = getUser() || {};

  const [status, setStatus] = useState("checking"); // checking | yes | no
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm] = useState(emptyForm(me.uni));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(null); // report whose messages are showing

  const load = useCallback(async () => {
    const [s, e, r] = await Promise.all([
      fetchAdminStats(),
      fetchAdminEvents(me.uni),
      fetchAdminReports(),
    ]);
    if (s.stats) setStats(s.stats);
    setEvents(e.events || []);
    setReports(r.reports || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await checkAdmin();
      if (cancelled) return;
      setStatus(ok ? "yes" : "no");
      if (ok) load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submitEvent(e) {
    e.preventDefault();
    setSaving(true);
    const res = await saveEvent(form);
    setSaving(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(form.id ? "Event updated" : "Event added");
    setForm(emptyForm(me.uni));
    load();
  }

  function editEvent(ev) {
    setForm({
      id: ev.id,
      uni: ev.uni,
      title: ev.title,
      type: ev.type,
      startsLocal: toLocalInput(ev.start),
      place: ev.where,
      description: ev.desc,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteEvent(ev) {
    if (!window.confirm(`Delete "${ev.title}"? People who marked "I'm going" will lose it.`)) return;
    const res = await removeEvent(ev.id);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Event deleted");
    if (form.id === ev.id) setForm(emptyForm(me.uni));
    load();
  }

  async function changeStatus(r, next) {
    const res = await setReportStatus(r.id, next);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setReports((list) => list.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
    fetchAdminStats().then((s) => s.stats && setStats(s.stats));
  }

  if (status === "checking") {
    return (
      <AppLayout>
        <div className="pg"><p className="pg-sub">Checking access...</p></div>
      </AppLayout>
    );
  }

  if (status === "no") {
    return (
      <AppLayout>
        <div className="pg">
          <div className="empty">
            <h3>Not available</h3>
            <p>This page is only for Campusly admins.</p>
            <Link to="/feed">Back to the feed</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const openCount = reports.filter((r) => r.status === "open").length;

  return (
    <AppLayout>
      <div className="pg">
        <h1>Admin</h1>
        <p className="pg-sub">Events, reports, and sign-up numbers.</p>

        <div className="pg-tabs">
          <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button className={tab === "events" ? "on" : ""} onClick={() => setTab("events")}>Events</button>
          <button className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
            Reports
            {openCount > 0 && <span className="tab-count">{openCount}</span>}
          </button>
        </div>

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="ad-stats">
            <div className="ad-stat"><b>{stats?.total_registered ?? "-"}</b><span>Ever registered</span></div>
            <div className="ad-stat"><b>{stats?.active ?? "-"}</b><span>Active accounts</span></div>
            <div className="ad-stat"><b>{stats?.deleted ?? "-"}</b><span>Deleted accounts</span></div>
            <div className="ad-stat"><b>{stats?.open_reports ?? "-"}</b><span>Open reports</span></div>
          </div>
        )}

        {/* EVENTS */}
        {tab === "events" && (
          <>
            <form className="in-card" onSubmit={submitEvent} style={{ marginBottom: 18 }}>
              <h2>{form.id ? "Edit event" : "Add an event"}</h2>

              <label>Title</label>
              <input name="title" maxLength="80" placeholder="Freshers' Night" value={form.title} onChange={change} />

              <label>Type</label>
              <select name="type" value={form.type} onChange={change}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>

              <label>Date and time</label>
              <input name="startsLocal" type="datetime-local" value={form.startsLocal} onChange={change} />

              <label>Place</label>
              <input name="place" maxLength="80" placeholder="Main Auditorium" value={form.place} onChange={change} />

              <label>Campus</label>
              <select name="uni" value={form.uni} onChange={change}>
                {CAMPUSES.map((c) => <option key={c}>{c}</option>)}
              </select>

              <label>Description (optional)</label>
              <textarea
                name="description"
                rows="3"
                maxLength="300"
                placeholder="What should people know?"
                value={form.description}
                onChange={change}
              />

              <div className="in-btns">
                <button type="submit" className="in-btn" disabled={saving}>
                  {saving ? "Saving..." : form.id ? "Save changes" : "Add event"}
                </button>
                {form.id && (
                  <button type="button" className="in-btn ghost" onClick={() => setForm(emptyForm(me.uni))}>
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {events.length === 0 ? (
              <div className="empty">
                <i className="ti ti-calendar-off"></i>
                <h3>No events yet</h3>
                <p>Add your first one above.</p>
              </div>
            ) : (
              events.map((ev) => (
                <div className="ev-card" key={ev.id}>
                  <span className="ev-type">{ev.type}</span>
                  {ev.start < Date.now() && <span className="ad-pill" style={{ marginLeft: 8 }}>Past</span>}
                  <h3>{ev.title}</h3>
                  <div className="ev-meta">{formatWhen(ev.start)} · {ev.where}</div>
                  {ev.desc && <p>{ev.desc}</p>}
                  <div className="ad-row-actions">
                    <button className="ad-small" onClick={() => editEvent(ev)}>Edit</button>
                    <button className="ad-small danger" onClick={() => deleteEvent(ev)}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* REPORTS */}
        {tab === "reports" &&
          (reports.length === 0 ? (
            <div className="empty">
              <i className="ti ti-flag-off"></i>
              <h3>No reports</h3>
              <p>When someone reports a profile, it shows up here.</p>
            </div>
          ) : (
            reports.map((r) => (
              <div className="ev-card" key={r.id}>
                <span className={`ad-pill ${r.status === "open" ? "open" : ""}`}>{r.status}</span>
                <h3 style={{ marginTop: 8 }}>{r.reason}</h3>
                <div className="ev-meta">
                  {r.reporter_name || "A deleted account"} reported {r.reported_name || "a deleted account"} ·{" "}
                  {formatWhen(new Date(r.created_at).getTime())}
                </div>
                {r.note && <p>"{r.note}"</p>}

                <div className="ad-row-actions">
                  <button className="ad-small" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    {open === r.id ? "Hide messages" : "Show recent messages"}
                  </button>
                  {r.status !== "reviewed" && (
                    <button className="ad-small" onClick={() => changeStatus(r, "reviewed")}>Mark reviewed</button>
                  )}
                  {r.status !== "resolved" && (
                    <button className="ad-small" onClick={() => changeStatus(r, "resolved")}>Mark resolved</button>
                  )}
                  {r.status !== "open" && (
                    <button className="ad-small" onClick={() => changeStatus(r, "open")}>Reopen</button>
                  )}
                </div>

                {open === r.id && (
                  <div className="ad-ctx">
                    {!r.context || r.context.length === 0 ? (
                      <small>No messages between them.</small>
                    ) : (
                      r.context.map((m, i) => (
                        <div key={i}>
                          <b>{m.from === r.reporter_id ? r.reporter_name || "Reporter" : r.reported_name || "Reported"}:</b>{" "}
                          {m.audio ? "(voice note)" : m.text}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          ))}
      </div>
    </AppLayout>
  );
}