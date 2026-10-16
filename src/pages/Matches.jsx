import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { useToast } from "../components/Toast.jsx";
import { fetchMyLikes, fetchMyMatchIds } from "../lib/likes.js";
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

export default function Matches() {
  const navigate = useNavigate();
  const toast = useToast();
  const [matches, setMatches] = useState([]);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [likesRes, matchRes] = await Promise.all([fetchMyLikes(), fetchMyMatchIds()]);
      if (cancelled) return;
      if (matchRes.error) {
        setError(matchRes.error);
        setLoading(false);
        return;
      }
      const peopleRes = await fetchPeopleByIds(matchRes.ids);
      if (cancelled) return;
      if (peopleRes.error) setError(peopleRes.error);
      else setMatches(peopleRes.people);
      setWaiting(likesRes.ids.filter((id) => !matchRes.ids.includes(id)).length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppLayout>
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
          </div>
        ) : matches.length === 0 ? (
          <div className="empty">
            <i className="ti ti-heart-off"></i>
            <h3>No matches yet</h3>
            <p>Like people on the feed. When they like you back, they'll show up here.</p>
            <Link to="/feed">Go to the feed</Link>
          </div>
        ) : (
          <div className="mt-grid">
            {matches.map((p) => {
              const [bg, fg] = colorFor(p.id);
              return (
                <div className="mt-card" key={p.id}>
                  <div
                    className="mt-photo"
                    style={{
                      background: bg,
                      color: fg,
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                    }}
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

        {waiting > 0 && (
          <p className="pg-note">
            You've liked {waiting} {waiting === 1 ? "person" : "people"} who haven't liked you back yet.
          </p>
        )}
      </div>
    </AppLayout>
  );
}