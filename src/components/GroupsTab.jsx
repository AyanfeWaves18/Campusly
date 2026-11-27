import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar.jsx";
import { useToast } from "./Toast.jsx";
import { createGroup, discoverGroups, fetchMyGroups, joinGroup } from "../lib/groups.js";
import { draftPreview } from "../lib/drafts.js";
import "./Modals.css";
import "./Groups.css";
import "./Drafts.css";

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

function time(t) {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

const campuses = (n) => `${n} ${Number(n) === 1 ? "campus" : "campuses"}`;
const members = (n) => `${n} ${Number(n) === 1 ? "member" : "members"}`;

function GroupAvatar({ group }) {
  const [bg, fg] = colorFor(group.id);
  return <Avatar name={group.name} bg={bg} fg={fg} size={44} />;
}

function CreateSheet({ onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast("Give your group a name (at least 2 letters)", "err");
      return;
    }
    setBusy(true);
    const res = await createGroup(name, desc, isPublic);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    onCreated(res.id);
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet gp-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Create a group</h2>
        <form onSubmit={submit}>
          <label className="gp-field" htmlFor="gp-name">Group name</label>
          <input
            id="gp-name"
            className="gp-input"
            maxLength={50}
            placeholder="Law students across Nigeria"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="gp-field" htmlFor="gp-desc">What is it about? (optional)</label>
          <textarea
            id="gp-desc"
            className="gp-input"
            maxLength={160}
            rows={3}
            placeholder="Say who it's for"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />

          <div className="gp-field">Who can join</div>
          <div className="au-chips">
            <button type="button" className={`au-chip ${isPublic ? "on" : ""}`} onClick={() => setIsPublic(true)}>
              Public
            </button>
            <button type="button" className={`au-chip ${!isPublic ? "on" : ""}`} onClick={() => setIsPublic(false)}>
              Private
            </button>
          </div>
          <p className="gp-hint">
            {isPublic
              ? "Anyone on Campusly, from any campus, can find this group and join."
              : "Only people with your link or code can join. It won't show in the list."}
          </p>

          <div className="md-row">
            <button type="button" className="md-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="md-btn" disabled={busy}>{busy ? "Creating..." : "Create group"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GroupsTab() {
  const navigate = useNavigate();
  const toast = useToast();
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  const [searching, setSearching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(null);

  const loadMine = useCallback(async (skeleton) => {
    if (skeleton) setLoading(true);
    const res = await fetchMyGroups();
    if (res.error) setError(res.error);
    else {
      setError("");
      setMine(res.groups);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMine(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadMine(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadMine]);

  // Search other groups as you type. A slow answer for old text never replaces a newer one.
  const reqId = useRef(0);
  useEffect(() => {
    const id = ++reqId.current;
    setSearching(true);
    const t = setTimeout(
      async () => {
        const res = await discoverGroups(q.trim());
        if (id !== reqId.current) return;
        setFound(res.groups || []);
        setSearching(false);
      },
      q ? 300 : 0
    );
    return () => clearTimeout(t);
  }, [q]);

  async function join(g) {
    if (joining) return;
    setJoining(g.id);
    const res = await joinGroup({ id: g.id });
    setJoining(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    navigate(`/group/${g.id}`);
  }

  function goCode(e) {
    e.preventDefault();
    // Works with the whole link or just the code
    const raw = code.trim().split("/join/").pop().split(/[?#]/)[0];
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length < 4) {
      toast("Enter the code or paste the link", "err");
      return;
    }
    navigate(`/join/${clean}`);
  }

  return (
    <>
      <div className="gp-actions">
        <button onClick={() => setCreating(true)}>
          <i className="ti ti-plus"></i> Create group
        </button>
        <button className="ghost" onClick={() => setCodeOpen(!codeOpen)}>
          <i className="ti ti-link"></i> Join with link or code
        </button>
      </div>

      {codeOpen && (
        <form className="gp-code" onSubmit={goCode}>
          <input
            className="gp-input"
            placeholder="Paste a link or type the code"
            autoCapitalize="characters"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit">Open</button>
        </form>
      )}

      <div className="gp-label">Your groups</div>
      {loading ? (
        [1, 2].map((n) => (
          <div className="row plain" key={n}>
            <div className="sk" style={{ width: 44, height: 44, borderRadius: "50%" }}></div>
            <div className="row-main"><div className="sk sk-line w60" style={{ margin: 0 }}></div></div>
          </div>
        ))
      ) : error ? (
        <div className="empty">
          <i className="ti ti-wifi-off"></i>
          <h3>Couldn't load your groups</h3>
          <p>{error}</p>
          <a href="/messages" onClick={(e) => { e.preventDefault(); loadMine(true); }}>Try again</a>
        </div>
      ) : mine.length === 0 ? (
        <p className="gp-hint">You're not in any group yet. Create one, or join one below.</p>
      ) : (
        mine.map((g) => (
          <button
            className={`row ${g.unread > 0 ? "has-unread" : ""}`}
            key={g.id}
            onClick={() => navigate(`/group/${g.id}`)}
          >
            <GroupAvatar group={g} />
            <div className="row-main">
              <b>
                {g.name}
                {!g.is_public && <i className="ti ti-lock" style={{ marginLeft: 6, fontSize: "0.85em" }}></i>}
                {g.unread > 0 && <span className="unread-pill">{g.unread > 99 ? "99+" : g.unread}</span>}
              </b>
              <span>
                {draftPreview(`group:${g.id}`) ? (
                  <>
                    <i className="draft-tag">Draft:</i> {draftPreview(`group:${g.id}`)}
                  </>
                ) : (
                  g.last_body || `${members(g.member_count)}. Say hi!`
                )}
              </span>
            </div>
            <small>{time(g.last_at)}</small>
          </button>
        ))
      )}

      <div className="gp-label">Find groups</div>
      <input
        className="gp-input"
        type="search"
        placeholder="Search groups by name"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search groups by name"
      />
      <div style={{ marginTop: 10 }}>
        {searching ? (
          <div className="row plain">
            <div className="sk" style={{ width: 44, height: 44, borderRadius: "50%" }}></div>
            <div className="row-main"><div className="sk sk-line w60" style={{ margin: 0 }}></div></div>
          </div>
        ) : found.length === 0 ? (
          <p className="gp-hint">
            {q ? "No public group has that name." : "No public groups to join yet. Be the first to create one."}
          </p>
        ) : (
          found.map((g) => {
            const full = g.member_count >= g.max_members;
            return (
              <div className="row plain" key={g.id}>
                <GroupAvatar group={g} />
                <div className="row-main">
                  <b>{g.name}</b>
                  {g.description && <span className="gp-desc">{g.description}</span>}
                  <span className="gp-meta">
                    {members(g.member_count)} · {campuses(g.campus_count)}
                  </span>
                </div>
                <button className="gp-join" disabled={full || joining === g.id} onClick={() => join(g)}>
                  {full ? "Full" : joining === g.id ? "..." : "Join"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {creating && (
        <CreateSheet
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            toast("Group created");
            navigate(`/group/${id}`);
          }}
        />
      )}
    </>
  );
}