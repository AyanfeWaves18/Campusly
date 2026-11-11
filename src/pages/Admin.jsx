import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser } from "../utils/storage.js";
import { formatWhen } from "../utils/data.js";
import { eventTypes } from "../utils/options.js";
import {
  adminFindPeople,
  adminGetProfile,
  adminRemovePhoto,
  adminSetSuspended,
  adminVoiceUrls,
  checkAdmin,
  fetchAdminEvents,
  fetchAdminLog,
  fetchAdminReports,
  fetchAdminStats,
  removeEvent,
  saveEvent,
  setReportStatus,
} from "../lib/admin.js";
import AdminInvites from "../components/AdminInvites.jsx";
import "../components/Modals.css";
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

const when = (t) =>
  new Date(t).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const ACTIONS = {
  suspend: "suspended",
  unsuspend: "unsuspended",
  remove_photo: "removed a photo from",
       create_invite: "created the invite code",
     enable_invite: "switched on the invite code",
     disable_invite: "switched off the invite code",
};

/* One person: their details, photos, and the suspend button */
function PersonSheet({ id, onClose, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await adminGetProfile(id);
    if (res.error) {
      setError(res.error);
    } else {
      setError("");
      setData(res);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const p = data?.profile;

  async function removePhoto(path) {
    if (!window.confirm("Remove this photo from their profile? This can't be undone.")) return;
    setBusy(true);
    const res = await adminRemovePhoto(id, path);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Photo removed");
    await load();
    onChanged?.();
  }

  async function toggleSuspend() {
    const suspended = !!p.suspended_at;
    const ok = window.confirm(
      suspended
        ? `Unsuspend ${p.name}? They'll be able to log in and be seen again.`
        : `Suspend ${p.name}?\n\nThey'll be logged out, can't log in, and will disappear from everyone's feed and chats. Nothing is deleted, and you can unsuspend them later.`
    );
    if (!ok) return;
    setBusy(true);
    const res = await adminSetSuspended(id, !suspended, why);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(suspended ? "Unsuspended" : "Suspended");
    setWhy("");
    await load();
    onChanged?.();
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet ad-sheet" onClick={(e) => e.stopPropagation()}>
        {!data && !error && <p className="md-text">Loading...</p>}
        {error && <p className="md-text">{error}</p>}

        {p && (
          <>
            <h2>
              {p.name}
              {p.suspended_at && <span className="ad-pill open" style={{ marginLeft: 8 }}>Suspended</span>}
              {p.is_admin && <span className="ad-pill" style={{ marginLeft: 8 }}>Admin</span>}
            </h2>

            <div className="ad-kv">
              <span>Campus</span><span>{p.uni}</span>
              <span>Department</span><span>{p.department || "-"}</span>
              <span>Level</span><span>{p.level || "-"}</span>
              <span>Gender</span><span>{p.gender || "-"}</span>
              <span>Looking for</span><span>{p.looking_for || "-"}</span>
              <span>Joined</span>
              <span>{p.created_at ? new Date(p.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
              <span>Profile</span><span>{p.hide_all ? "Hidden from everyone" : "Visible on campus"}</span>
              <span>Reports</span><span>{p.reports_total} against them ({p.reports_open} open)</span>
              <span>Invite code</span><span>{p.invite_code || "-"}</span>
              <span>Invited by</span><span>{p.invited_by || "-"}</span>
              <span>Invited</span><span>{p.invited_count} {p.invited_count === 1 ? "person" : "people"}</span>
            </div>

            {p.bio && <p className="md-text">"{p.bio}"</p>}
            {Array.isArray(p.interests) && p.interests.length > 0 && (
              <p className="md-text">Interests: {p.interests.join(", ")}</p>
            )}

            <h3 className="ad-h3">Photos</h3>
            {data.photos.length === 0 ? (
              <p className="md-text">No photos.</p>
            ) : (
              <div className="ad-photos">
                {data.photos.map((ph) => (
                  <div className="ad-photo" key={ph.path}>
                    {ph.url ? <img src={ph.url} alt="" /> : <span className="md-text">Couldn't load</span>}
                    <button className="ad-small danger" onClick={() => removePhoto(ph.path)} disabled={busy}>
                      Remove photo
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!p.is_admin && (
              <>
                <h3 className="ad-h3">{p.suspended_at ? "Unsuspend" : "Suspend this account"}</h3>
                {!p.suspended_at && (
                  <textarea
                    rows="2"
                    maxLength="300"
                    placeholder="Reason (saved in the activity log)"
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                  />
                )}
                <div className="md-row">
                  <button className="md-btn ghost" onClick={onClose} disabled={busy}>Close</button>
                  <button
                    className={`md-btn ${p.suspended_at ? "" : "danger"}`}
                    onClick={toggleSuspend}
                    disabled={busy}
                  >
                    {busy ? "Please wait..." : p.suspended_at ? "Unsuspend" : "Suspend"}
                  </button>
                </div>
              </>
            )}
            {p.is_admin && (
              <div className="md-row">
                <button className="md-btn ghost" onClick={onClose}>Close</button>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="md-row">
            <button className="md-btn ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [voice, setVoice] = useState({});

  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [personId, setPersonId] = useState(null);
  const [log, setLog] = useState(null);

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

  // The activity list loads when you open that tab
  useEffect(() => {
    if (status !== "yes" || tab !== "activity") return;
    fetchAdminLog().then((res) => setLog(res.rows));
  }, [tab, status]);

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

  // Shows or hides the recent messages in a report (and gets voice notes ready to play)
  async function toggleReport(r) {
    if (open === r.id) {
      setOpen(null);
      return;
    }
    setOpen(r.id);
    const paths = (r.context || []).map((m) => m.audio).filter(Boolean);
    if (paths.length) {
      const map = await adminVoiceUrls(paths);
      setVoice((v) => ({ ...v, ...map }));
    }
  }

  async function search(e) {
    e?.preventDefault();
    if (q.trim().length < 2) {
      toast("Type at least 2 letters", "err");
      return;
    }
    setSearching(true);
    const res = await adminFindPeople(q);
    setSearching(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setResults(res.rows);
  }

  function afterChange() {
    load();
    if (results !== null && q.trim().length >= 2) adminFindPeople(q).then((res) => setResults(res.rows));
    if (tab === "activity") fetchAdminLog().then((res) => setLog(res.rows));
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
        <p className="pg-sub">Events, reports, people, and activity.</p>

        <div className="pg-tabs">
          <button className={tab === "overview" ? "on" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button className={tab === "events" ? "on" : ""} onClick={() => setTab("events")}>Events</button>
          <button className={tab === "reports" ? "on" : ""} onClick={() => setTab("reports")}>
            Reports
            {openCount > 0 && <span className="tab-count">{openCount}</span>}
          </button>
          <button className={tab === "people" ? "on" : ""} onClick={() => setTab("people")}>People</button>
          <button className={tab === "activity" ? "on" : ""} onClick={() => setTab("activity")}>Activity</button>
          <button className={tab === "invites" ? "on" : ""} onClick={() => setTab("invites")}>Invites</button>
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
                  {r.reported_name && (
                    <button className="ad-small" onClick={() => setPersonId(r.reported_id)}>
                      View {r.reported_name}
                    </button>
                  )}
                  <button className="ad-small" onClick={() => toggleReport(r)}>
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
                          {m.audio ? (
                            voice[m.audio] ? (
                              <audio controls preload="none" src={voice[m.audio]} style={{ verticalAlign: "middle", maxWidth: "100%" }} />
                            ) : (
                              "(voice note)"
                            )
                          ) : (
                            m.text
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          ))}

        {/* PEOPLE */}
        {tab === "people" && (
          <>
            <form className="ad-find" onSubmit={search}>
              <input
                placeholder="Search by name"
                value={q}
                maxLength="60"
                onChange={(e) => setQ(e.target.value)}
              />
              <button type="submit" className="in-btn" disabled={searching}>
                {searching ? "..." : "Search"}
              </button>
            </form>

            {results === null ? (
              <p className="pg-note">Type at least two letters of a name.</p>
            ) : results.length === 0 ? (
              <div className="empty">
                <h3>No one found</h3>
                <p>Try a different spelling.</p>
              </div>
            ) : (
              results.map((p) => (
                <button className="row" key={p.id} onClick={() => setPersonId(p.id)}>
                  <div className="row-main">
                    <b>
                      {p.name}
                      {p.suspended && <span className="ad-pill open" style={{ marginLeft: 8 }}>Suspended</span>}
                    </b>
                    <span>{[p.department, p.level, p.uni].filter(Boolean).join(" · ")}</span>
                  </div>
                </button>
              ))
            )}
          </>
        )}
                   {tab === "invites" && <AdminInvites />}

        {/* ACTIVITY */}
        {tab === "activity" &&
          (log === null ? (
            <p className="pg-note">Loading...</p>
          ) : log.length === 0 ? (
            <div className="empty">
              <i className="ti ti-history"></i>
              <h3>Nothing yet</h3>
              <p>Every suspension and photo removal is recorded here.</p>
            </div>
          ) : (
            log.map((a) => (
              <div className="ev-card" key={a.id}>
                <div className="ev-meta">{when(a.created_at)}</div>
                <p style={{ margin: "4px 0" }}>
                  <b>{a.admin_name || "An admin"}</b> {ACTIONS[a.action] || a.action}{" "}
                  {a.target_id ? (
                    <b>{a.target_name || "a deleted account"}</b>
                  ) : (
                    <b>{a.detail}</b>
                  )}
                </p>
                {a.target_id && a.action !== "remove_photo" && a.detail && (
                  <p className="ev-meta">Reason: {a.detail}</p>
                )}
              </div>
            ))
          ))}
      </div>

      {personId && (
        <PersonSheet id={personId} onClose={() => setPersonId(null)} onChanged={afterChange} />
      )}
    </AppLayout>
  );
}