import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { useUnread } from "../components/Unread.jsx";
import { complimentPresets, reportReasons } from "../utils/options.js";
import { fetchConversations, fetchRequests, passPerson, subscribeToInbox } from "../lib/chat.js";
import { fetchMyCompliments, markComplimentsSeen, reportCompliment } from "../lib/compliments.js";
import { likePerson } from "../lib/likes.js";
import { fetchPeopleByIds } from "../lib/people.js";
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

function time(t) {
  const d = new Date(t);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function PersonAvatar({ person }) {
  const [bg, fg] = colorFor(person.id);
  return <Avatar photo={person.photoUrl} name={person.name} bg={bg} fg={fg} size={44} />;
}

// The wording of a ready-made compliment
const complimentText = (c) =>
  (complimentPresets[c.preset - 1] || "").replace("{dept}", c.from_dept || "your campus");

// Report a compliment, and optionally block the sender, without learning who it was
function ReportComplimentSheet({ item, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!reason) {
      toast("Pick a reason first", "err");
      return;
    }
    setBusy(true);
    const res = await reportCompliment(item.id, reason, alsoBlock);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Report sent. Thanks for keeping Campusly safe.");
    onDone(item.id);
    onClose();
  }

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Report this compliment</h2>
        <p className="md-text">
          "{complimentText(item)}" You won't find out who sent it, but we will, and we can act.
        </p>
        <div className="md-reasons">
          {reportReasons.map((r) => (
            <label key={r} className={reason === r ? "on" : ""}>
              <input type="radio" name="creason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <label className="md-check">
          <input type="checkbox" checked={alsoBlock} onChange={() => setAlsoBlock(!alsoBlock)} />
          Also block the sender
        </label>
        <div className="md-row">
          <button className="md-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="md-btn" onClick={submit} disabled={busy}>
            {busy ? "Sending..." : "Send report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessagesBody() {
  const navigate = useNavigate();
  const toast = useToast();
  const { byPartner } = useUnread();
  const [tab, setTab] = useState("chats");
  const [chats, setChats] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const [compliments, setCompliments] = useState([]);
  const [newIds, setNewIds] = useState([]);
  const [seenAll, setSeenAll] = useState(false);
  const [loadingC, setLoadingC] = useState(true);
  const [reporting, setReporting] = useState(null);

  const load = useCallback(async (showSkeleton) => {
    if (showSkeleton) setLoading(true);
    const [c, r] = await Promise.all([fetchConversations(), fetchRequests()]);
    if (c.error || r.error) {
      setError(c.error || r.error);
      setLoading(false);
      return;
    }
    const ids = [...new Set([...c.chats.map((x) => x.partner_id), ...r.requests.map((x) => x.partner_id)])];
    const res = await fetchPeopleByIds(ids);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    const byId = new Map((res.people || []).map((p) => [p.id, p]));
    setError("");
    setChats(
      c.chats
        .filter((x) => byId.has(x.partner_id))
        .map((x) => ({ ...x, person: byId.get(x.partner_id) }))
        .sort((a, b) => new Date(b.last_at) - new Date(a.last_at))
    );
    setRequests(
      r.requests.filter((x) => byId.has(x.partner_id)).map((x) => ({ ...x, person: byId.get(x.partner_id) }))
    );
    setLoading(false);
  }, []);

  const loadCompliments = useCallback(async () => {
    const res = await fetchMyCompliments();
    if (!res.error) {
      setCompliments(res.rows);
      setNewIds(res.rows.filter((c) => !c.seen).map((c) => c.id));
    }
    setLoadingC(false);
  }, []);

  // Load now, and again whenever someone sends you a message
  useEffect(() => {
    load(true);
    loadCompliments();
    const stop = subscribeToInbox(() => load(false));
    return stop;
  }, [load, loadCompliments]);

  // Opening the Compliments tab marks them as seen. The "New" tags stay until you leave the page.
  useEffect(() => {
    if (tab === "compliments") {
      markComplimentsSeen();
      setSeenAll(true);
    }
  }, [tab]);

  async function likeBack(r) {
    setBusy(r.partner_id);
    const res = await likePerson(r.partner_id);
    setBusy(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    if (res.match) {
      toast(`It's a match with ${r.person.name}!`, "match");
      navigate(`/chat/${r.partner_id}`);
    } else {
      toast("Liked!");
      load(false);
    }
  }

  async function notNow(r) {
    setBusy(r.partner_id);
    const res = await passPerson(r.partner_id);
    setBusy(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setRequests((list) => list.filter((x) => x.partner_id !== r.partner_id));
    toast("Removed from your requests");
  }

  const newCount = seenAll ? 0 : newIds.length;

  return (
    <div className="pg">
      <h1>Messages</h1>
      <p className="pg-sub">Your chats, requests, and anonymous compliments.</p>

      <div className="pg-tabs">
        <button className={tab === "chats" ? "on" : ""} onClick={() => setTab("chats")}>Chats</button>
        <button className={tab === "requests" ? "on" : ""} onClick={() => setTab("requests")}>
          Requests
          {requests.length > 0 && <span className="tab-count">{requests.length}</span>}
        </button>
        <button className={tab === "compliments" ? "on" : ""} onClick={() => setTab("compliments")}>
          Compliments
          {newCount > 0 && <span className="tab-count">{newCount}</span>}
        </button>
      </div>

      {tab !== "compliments" && loading && (
        <>
          {[1, 2, 3].map((n) => (
            <div className="row plain" key={n}>
              <div className="sk" style={{ width: 44, height: 44, borderRadius: "50%" }}></div>
              <div className="row-main"><div className="sk sk-line w60" style={{ margin: 0 }}></div></div>
            </div>
          ))}
        </>
      )}

      {tab !== "compliments" && !loading && error && (
        <div className="empty">
          <i className="ti ti-wifi-off"></i>
          <h3>Couldn't load your messages</h3>
          <p>{error}</p>
          <a href="/messages" onClick={(e) => { e.preventDefault(); load(true); }}>Try again</a>
        </div>
      )}

      {/* CHATS */}
      {tab === "chats" && !loading && !error && (
        chats.length === 0 ? (
          <div className="empty">
            <i className="ti ti-message-off"></i>
            <h3>No chats yet</h3>
            <p>Like someone on the feed, then send them a message. Anyone who writes to you first appears under Requests.</p>
            <Link to="/feed">Go to the feed</Link>
          </div>
        ) : (
          chats.map((c) => {
            const n = byPartner[c.partner_id] || 0;
            return (
              <button
                className={`row ${n > 0 ? "has-unread" : ""}`}
                key={c.partner_id}
                onClick={() => navigate(`/chat/${c.partner_id}`)}
              >
                <PersonAvatar person={c.person} />
                <div className="row-main">
                  <b>
                    {c.person.name}
                    {n > 0 && <span className="unread-pill">{n > 99 ? "99+" : n}</span>}
                  </b>
                  <span>
                    {c.last_body
                      ? `${c.last_from_me ? "You: " : ""}${c.last_body}`
                      : "It's a match. Say hi!"}
                  </span>
                </div>
                <small>{time(c.last_at)}</small>
              </button>
            );
          })
        )
      )}

      {/* REQUESTS: only people who wrote to you */}
      {tab === "requests" && !loading && !error && (
        requests.length === 0 ? (
          <div className="empty">
            <i className="ti ti-mail-opened"></i>
            <h3>No requests</h3>
            <p>When someone writes to you before you've liked each other, their message shows up here. People who only liked you are under Matches.</p>
            <Link to="/matches">Go to Matches</Link>
          </div>
        ) : (
          <>
            <div className="rq-label">Wants to chat with you</div>
            {requests.map((r) => (
              <div className="rq" key={r.partner_id}>
                <button className="rq-top" onClick={() => navigate(`/chat/${r.partner_id}`)}>
                  <PersonAvatar person={r.person} />
                  <div className="row-main">
                    <b>{r.person.name}</b>
                    <span>{r.last_msg}</span>
                  </div>
                  {r.msg_count > 0 && <span className="rq-badge">{r.msg_count}</span>}
                </button>
                <div className="rq-actions">
                  <button className="rq-like" disabled={busy === r.partner_id} onClick={() => likeBack(r)}>
                    Like back
                  </button>
                  <button className="rq-pass" disabled={busy === r.partner_id} onClick={() => notNow(r)}>
                    Not now
                  </button>
                </div>
              </div>
            ))}
          </>
        )
      )}

      {/* COMPLIMENTS */}
      {tab === "compliments" &&
        (loadingC ? (
          <div className="row plain">
            <div className="sk" style={{ width: 44, height: 44, borderRadius: "50%" }}></div>
            <div className="row-main"><div className="sk sk-line w60" style={{ margin: 0 }}></div></div>
          </div>
        ) : compliments.length === 0 ? (
          <div className="empty">
            <i className="ti ti-sparkles"></i>
            <h3>No compliments yet</h3>
            <p>When someone sends you an anonymous compliment, it appears here.</p>
          </div>
        ) : (
          compliments.map((c) => (
            <div className="row plain" key={c.id}>
              <Avatar name="?" bg="#CECBF6" fg="#3C3489" />
              <div className="row-main">
                <b>
                  Anonymous
                  {newIds.includes(c.id) && <span className="unread-pill">New</span>}
                </b>
                <span style={{ whiteSpace: "normal" }}>{complimentText(c)}</span>
              </div>
              <div className="comp-side">
                <small>{time(c.created_at)}</small>
                <button className="ad-small" onClick={() => setReporting(c)}>Report</button>
              </div>
            </div>
          ))
        ))}

      {reporting && (
        <ReportComplimentSheet
          item={reporting}
          onClose={() => setReporting(null)}
          onDone={(id) => setCompliments((list) => list.filter((x) => x.id !== id))}
        />
      )}
    </div>
  );
}

export default function Messages() {
  return (
    <AppLayout>
      <MessagesBody />
    </AppLayout>
  );
}