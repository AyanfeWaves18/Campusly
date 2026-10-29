import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import CalendarSheet from "../components/CalendarSheet.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { XIcon } from "../components/Icons.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser } from "../utils/storage.js";
import { completeness, formatWhen } from "../utils/data.js";
import { fetchMyGoingEvents } from "../lib/events.js";
import { fetchCompanions } from "../lib/invites.js";
import { departments, levels, interestsList, promptQuestions } from "../utils/options.js";
import { saveProfileToCloud } from "../lib/profile.js";
import { addPhoto, loadPhotoUrls, removePhoto as removePhotoFromCloud, MAX_PHOTOS } from "../lib/photos.js";
import "./Inner.css";

export default function Profile() {
  const toast = useToast();
  const [user, setUser] = useState(() => getUser() || {});
  const [draft, setDraft] = useState(user);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState({});
  const [viewIndex, setViewIndex] = useState(null);
  const [calEvent, setCalEvent] = useState(null);

  // Photos are stored in the cloud as file paths. Old on-device test photos are ignored.
  const paths = (user.photos || []).filter((p) => typeof p === "string" && !p.startsWith("data:"));

  const { pct, items } = completeness(user);
  const [myEvents, setMyEvents] = useState([]);
  const [withNames, setWithNames] = useState({});
  useEffect(() => {
    fetchMyGoingEvents().then((res) => setMyEvents(res.events));
    fetchCompanions().then((res) => setWithNames(res.map));
  }, []);

  // The photo bucket is private, so ask for temporary viewing links
  useEffect(() => {
    let cancelled = false;
    loadPhotoUrls(paths).then((map) => {
      if (!cancelled) setUrls(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join("|")]);

  function change(e) {
    setDraft({ ...draft, [e.target.name]: e.target.value });
  }
  function setPrompt(q, value) {
    setDraft({ ...draft, prompts: { ...draft.prompts, [q]: value } });
  }
  function toggleInterest(i) {
    const has = draft.interests?.includes(i);
    setDraft({
      ...draft,
      interests: has ? draft.interests.filter((x) => x !== i) : [...(draft.interests || []), i],
    });
  }

  async function saveProfile() {
    if (!draft.name?.trim()) {
      toast("Your name can't be empty", "err");
      return;
    }
    setSaving(true);
    const { error } = await saveProfileToCloud({
      name: draft.name,
      department: draft.department,
      level: draft.level,
      bio: draft.bio || "",
      interests: draft.interests || [],
      prompts: draft.prompts || {},
    });
    setSaving(false);
    if (error) {
      toast(error, "err");
      return;
    }
    setUser(getUser());
    setEditing(false);
    toast("Profile saved");
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    const { error } = await addPhoto(file);
    setUploading(false);
    if (error) {
      toast(error, "err");
      return;
    }
    setUser(getUser());
    toast("Photo added");
  }

  async function removePhoto(i) {
    if (!window.confirm("Remove this photo?")) return;
    const { error } = await removePhotoFromCloud(paths[i]);
    if (error) {
      toast(error, "err");
      return;
    }
    setUser(getUser());
    setViewIndex(null);
    toast("Photo removed");
  }

  const answered = Object.entries(user.prompts || {}).filter(([, a]) => a);

  return (
    <AppLayout>
      <div className="in-wrap">
        <div className="in-card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Avatar photo={urls[paths[0]]} name={user.name} size={92} />
          </div>

          {!editing ? (
            <>
              <div className="in-name">
                {user.name}
                {user.verified && <i className="ti ti-rosette-discount-check vb" title="Verified"></i>}
              </div>
              <div className="in-sub">{user.department} · {user.level}</div>

              {answered.map(([q, a]) => (
                <div className="in-row" key={q}><span>{q}</span><span>{a}</span></div>
              ))}
              <div className="in-row"><span>Campus</span><span>{user.uni}</span></div>
              <div className="in-row"><span>Gender</span><span>{user.gender}</span></div>
              <div className="in-row"><span>Interested in</span><span>{user.interestedIn}</span></div>
              <div className="in-row"><span>Looking for</span><span>{user.lookingFor}</span></div>
              <div className="in-row"><span>Meeting from</span><span>{user.deptPrefs?.join(", ")}</span></div>
              <div className="in-row">
                <span>Interests</span>
                <span className="in-tags">{user.interests?.map((i) => <span key={i}>{i}</span>)}</span>
              </div>
              {user.bio && <div className="in-row"><span>Bio</span><span>{user.bio}</span></div>}

              <div className="in-btns" style={{ marginTop: 16 }}>
                <button className="in-btn" onClick={() => { setDraft(user); setEditing(true); }}>Edit profile</button>
                <Link to="/settings" className="in-btn ghost">Account settings</Link>
              </div>
            </>
          ) : (
            <>
              <label>Full name</label>
              <input name="name" value={draft.name || ""} onChange={change} />

              <label>Department</label>
              <select name="department" value={draft.department || ""} onChange={change}>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>

              <label>Level</label>
              <select name="level" value={draft.level || ""} onChange={change}>
                {levels.map((l) => <option key={l}>{l}</option>)}
              </select>

              <label>Bio</label>
              <textarea name="bio" rows="3" maxLength="160" value={draft.bio || ""} onChange={change} />

              <label>Interests</label>
              <div className="au-chips">
                {interestsList.map((i) => (
                  <button
                    type="button"
                    key={i}
                    className={`au-chip ${draft.interests?.includes(i) ? "on" : ""}`}
                    onClick={() => toggleInterest(i)}
                  >
                    {i}
                  </button>
                ))}
              </div>

              <label>Icebreakers (answer any)</label>
              {promptQuestions.map((q) => (
                <div key={q}>
                  <small style={{ color: "var(--muted)" }}>{q}</small>
                  <input maxLength="80" value={draft.prompts?.[q] || ""} onChange={(e) => setPrompt(q, e.target.value)} />
                </div>
              ))}

              <div className="in-btns">
                <button className="in-btn" onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button className="in-btn ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              </div>
            </>
          )}
        </div>

        <div className="in-card">
          <h2>My photos</h2>
          <div className="ph-grid">
            {paths.map((p, i) => (
              <div className="ph-item" key={p}>
                {urls[p] ? (
                  <img src={urls[p]} alt={`Photo ${i + 1}`} onClick={() => setViewIndex(i)} />
                ) : (
                  <div className="sk" style={{ width: "100%", height: "100%" }}></div>
                )}
                <button className="ph-x" onClick={() => removePhoto(i)} aria-label="Remove photo">
                  <XIcon size={16} />
                </button>
              </div>
            ))}
            {paths.length < MAX_PHOTOS && (
              <label className="ph-add">
                <span style={{ fontSize: "1.6rem" }}>{uploading ? "..." : "+"}</span>
                {uploading ? "Uploading" : "Add photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={onPhoto}
                  disabled={uploading}
                  hidden
                />
              </label>
            )}
          </div>
          <p className="ph-hint">
            Up to {MAX_PHOTOS} photos. JPG, PNG, WEBP or GIF, max 20 MB each. Tap a photo to view it. The
            first photo is your main one.
          </p>
        </div>

        <div className="in-card">
          <h2>Events I'm going to</h2>
          {myEvents.length === 0 ? (
            <p>
              Nothing yet. <Link to="/events" style={{ color: "var(--pink)" }}>Browse events</Link>
            </p>
          ) : (
            myEvents.map((ev) => (
              <div className="in-row" key={ev.id}>
                <span style={{ color: "var(--text)" }}>
                  {ev.title}
                  <br />
                  <small style={{ color: "var(--muted)" }}>{formatWhen(ev.start)} · {ev.where}</small>
                                    {withNames[ev.id] && (
                    <>
                      <br />
                      <small style={{ color: "var(--pink)" }}>Going with {withNames[ev.id].join(", ")}</small>
                    </>
                  )}
                </span>
                <button className="in-btn ghost" style={{ padding: "6px 14px" }} onClick={() => setCalEvent(ev)}>
                  Calendar
                </button>
              </div>
            ))
          )}
        </div>

        <div className="in-card">
          <h2>Profile completeness: {pct}%</h2>
          <div className="pb" style={{ marginBottom: 14 }}><span style={{ width: `${pct}%` }}></span></div>
          {items.map((i) => (
            <div className="in-row" key={i.label}>
              <span style={{ color: i.done ? "var(--text)" : "var(--muted)" }}>{i.label}</span>
              {i.label === "Verify your account" && !i.done ? (
                <Link to="/verify" style={{ color: "var(--pink)" }}>Verify</Link>
              ) : (
                <i
                  className={`ti ${i.done ? "ti-circle-check" : "ti-circle"}`}
                  style={{ color: i.done ? "#1D9E75" : "var(--muted)" }}
                ></i>
              )}
            </div>
          ))}
        </div>
      </div>

      {viewIndex !== null && urls[paths[viewIndex]] && (
        <Lightbox
          src={urls[paths[viewIndex]]}
          onClose={() => setViewIndex(null)}
          onRemove={() => removePhoto(viewIndex)}
        />
      )}
      {calEvent && <CalendarSheet ev={calEvent} onClose={() => setCalEvent(null)} />}
    </AppLayout>
  );
}