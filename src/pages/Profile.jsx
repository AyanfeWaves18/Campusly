import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import CalendarSheet from "../components/CalendarSheet.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { XIcon } from "../components/Icons.jsx";
import { useToast } from "../components/Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { completeness, events, formatWhen, userPhotos } from "../utils/data.js";
import { checkImage, compressImage } from "../utils/files.js";
import { departments, levels, interestsList, promptQuestions } from "../utils/options.js";
import "./Inner.css";

const MAX_PHOTOS = 4;

export default function Profile() {
  const toast = useToast();
  const [user, setUser] = useState(() => getUser() || {});
  const [draft, setDraft] = useState(user);
  const [editing, setEditing] = useState(false);
  const [viewIndex, setViewIndex] = useState(null);
  const [calEvent, setCalEvent] = useState(null);

  const { pct, items } = completeness(user);
  const photos = userPhotos(user);
  const going = load("going", []);
  const myEvents = events
    .filter((e) => going.includes(e.id) && e.start > Date.now())
    .sort((a, b) => a.start - b.start);

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

  function saveProfile() {
    if (!draft.name?.trim()) {
      toast("Your name can't be empty", "err");
      return;
    }
    const updated = { ...draft, photos: userPhotos(getUser()) };
    delete updated.photo;
    save("user", updated);
    setUser(updated);
    setEditing(false);
    toast("Profile saved");
  }

  function updatePhotos(list) {
    const updated = { ...getUser(), photos: list };
    delete updated.photo;
    if (!save("user", updated)) {
      toast("Storage is full. Remove a photo and try again.", "err");
      return false;
    }
    setUser(updated);
    return true;
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const err = checkImage(file);
    if (err) {
      toast(err, "err");
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      toast(`You can add up to ${MAX_PHOTOS} photos`, "err");
      return;
    }
    try {
      const url = await compressImage(file, 600, 0.8);
      if (updatePhotos([...photos, url])) toast("Photo added");
    } catch {
      toast("Couldn't read that image", "err");
    }
  }

  function removePhoto(i) {
    if (!window.confirm("Remove this photo?")) return;
    if (updatePhotos(photos.filter((_, n) => n !== i))) {
      toast("Photo removed");
      setViewIndex(null);
    }
  }

  const answered = Object.entries(user.prompts || {}).filter(([, a]) => a);

  return (
    <AppLayout>
      <div className="in-wrap">
        <div className="in-card">
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Avatar photo={photos[0]} name={user.name} size={92} />
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
                <button className="in-btn" onClick={saveProfile}>Save changes</button>
                <button className="in-btn ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          )}
        </div>

        <div className="in-card">
          <h2>My photos</h2>
          <div className="ph-grid">
            {photos.map((src, i) => (
              <div className="ph-item" key={i}>
                <img src={src} alt={`Photo ${i + 1}`} onClick={() => setViewIndex(i)} />
                <button className="ph-x" onClick={() => removePhoto(i)} aria-label="Remove photo">
                  <XIcon size={16} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="ph-add">
                <span style={{ fontSize: "1.6rem" }}>+</span>
                Add photo
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPhoto} hidden />
              </label>
            )}
          </div>
          <p className="ph-hint">
            Up to {MAX_PHOTOS} photos. JPG, PNG, WEBP or GIF, max 5 MB each. Tap a photo to view it. The
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

      {viewIndex !== null && photos[viewIndex] && (
        <Lightbox src={photos[viewIndex]} onClose={() => setViewIndex(null)} onRemove={() => removePhoto(viewIndex)} />
      )}
      {calEvent && <CalendarSheet ev={calEvent} onClose={() => setCalEvent(null)} />}
    </AppLayout>
  );
}