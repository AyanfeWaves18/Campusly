import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import Avatar from "../components/Avatar.jsx";
import { useToast } from "../components/Toast.jsx";
import { useUnread } from "../components/Unread.jsx";
import { fetchLikedMe, fetchMyLikes, fetchMyMatchIds, likePerson } from "../lib/likes.js";
import { passPerson } from "../lib/chat.js";
import { fetchPeopleByIds } from "../lib/people.js";
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

function MatchesBody() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh: refreshBadges } = useUnread();

  const [matches, setMatches] = useState([]);
  const [likedMe, setLikedMe] = useState([]);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async (showSkeleton) => {
    if (showSkeleton) setLoading(true);
    const [likesRes, matchRes, likedRes] = await Promise.all([
      fetchMyLikes(),
      fetchMyMatchIds(),
      fetchLikedMe(),
    ]);
    if (matchRes.error || likedRes.error) {
      setError(matchRes.error || likedRes.error);
      setLoading(false);
      return;
    }
    const ids = [...new Set([...matchRes.ids, ...likedRes.rows.map((r) => r.person_id)])];
    const res = await fetchPeopleByIds(ids);
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    const byId = new Map((res.people || []).map((p) => [p.id, p]));
    setError("");
    setMatches(matchRes.ids.map((id) => byId.get(id)).filter(Boolean));
    setLikedMe(
      likedRes.rows
        .filter((r) => byId.has(r.person_id))
        .map((r) => ({ ...r, person: byId.get(r.person_id) }))
    );
    setWaiting(likesRes.ids.filter((id) => !matchRes.ids.includes(id)).length);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  async function likeBack(r) {
    setBusy(r.person_id);
    const res = await likePerson(r.person_id);
    setBusy(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(res.match ? `It's a match with ${r.person.name}!` : "Liked!", res.match ? "match" : "ok");
    await load(false);
    refreshBadges();
  }

  async function notNow(r) {
    setBusy(r.person_id);
    const res = await passPerson(r.person_id);
    setBusy(null);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    setLikedMe((list) => list.filter((x) => x.person_id !== r.person_id));
    toast("Removed from your list");
    refreshBadges();
  }

  return (
    <div className="pg">
      <h1>Matches</h1>
      <p className="pg-sub">People who liked you back.</p>

      {loading ? (
        <div className="mt-grid">
          {[1, 2].map((n) => (
            <div className="mt-card" key={n}>
              <div className="sk" style={{ height: 130, borderRadius: 0 }}></div>
              <div className="mt-body"><div className="sk sk-line w60"></div></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="empty">
          <i className="ti ti-wifi-off"></i>
          <h3>Couldn't load matches</h3>
          <p>{error}</p>
          <a href="/matches" onClick={(e) => { e.preventDefault(); load(true); }}>Try again</a>
        </div>
      ) : (
        <>
          {matches.length === 0 ? (
            <div className="empty">
              <i className="ti ti-heart-off"></i>
              <h3>No matches yet</h3>
              <p>
                {likedMe.length > 0
                  ? "Like back someone below to make your first match."
                  : "Like people on the feed. When they like you back, they'll show up here."}
              </p>
              {likedMe.length === 0 && <Link to="/feed">Go to the feed</Link>}
            </div>
          ) : (
            <div className="mt-grid">
              {matches.map((p) => {
                const [bg, fg] = colorFor(p.id);
                return (
                  <div className="mt-card" key={p.id}>
                    <div
                      className="mt-photo"
                      style={{ background: bg, color: fg, cursor: "pointer", position: "relative", overflow: "hidden" }}
                      onClick={() => navigate(`/user/${p.id}`)}
                    >
                      {p.photoUrl ? (
                        <img
                          src={p.photoUrl}
                          alt={p.name}
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        p.name?.[0]
                      )}
                    </div>
                    <div className="mt-body">
                      <b style={{ cursor: "pointer" }} onClick={() => navigate(`/user/${p.id}`)}>
                        {p.name}
                        {p.verified && <i className="ti ti-rosette-discount-check vb"></i>}
                      </b>
                      <small>{p.department}</small>
                      <button onClick={() => navigate(`/chat/${p.id}`)}>Say hi</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {likedMe.length > 0 && (
            <>
              <div className="rq-label" style={{ marginTop: 22 }}>People you haven't liked back</div>
              {likedMe.map((r) => {
                const [bg, fg] = colorFor(r.person.id);
                return (
                  <div className="rq" key={r.person_id}>
                    <button className="rq-top" onClick={() => navigate(`/user/${r.person_id}`)}>
                      <Avatar photo={r.person.photoUrl} name={r.person.name} bg={bg} fg={fg} size={44} />
                      <div className="row-main">
                        <b>{r.person.name}</b>
                        <span>
                          {r.msg_count > 0
                            ? `Sent you ${r.msg_count} ${r.msg_count === 1 ? "message" : "messages"}`
                            : `Liked you · ${r.person.department || ""}`}
                        </span>
                      </div>
                    </button>
                    <div className="rq-actions">
                      <button className="rq-like" disabled={busy === r.person_id} onClick={() => likeBack(r)}>
                        Like back
                      </button>
                      <button className="rq-pass" disabled={busy === r.person_id} onClick={() => notNow(r)}>
                        Not now
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {waiting > 0 && (
            <p className="pg-note">
              You've liked {waiting} {waiting === 1 ? "person" : "people"} who haven't liked you back yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function Matches() {
  return (
    <AppLayout>
      <MatchesBody />
    </AppLayout>
  );
}