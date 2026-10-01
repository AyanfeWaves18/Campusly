import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { ComplimentModal, ReportModal } from "../components/Modals.jsx";
import { useToast } from "../components/Toast.jsx";
import { load, save } from "../utils/storage.js";
import { profiles } from "../utils/data.js";
import "./Pages.css";

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const p = profiles.find((x) => String(x.id) === id);

  const [likes, setLikes] = useState(() => load("likes", []));
  const [report, setReport] = useState(false);
  const [compliment, setCompliment] = useState(false);

  if (!p || load("blocked", []).includes(p.id)) {
    return (
      <AppLayout>
        <div className="pg">
          <div className="empty">
            <h3>Profile not available</h3>
            <Link to="/feed">Back to the feed</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const liked = likes.includes(p.id);

  function toggleLike() {
    const next = liked ? likes.filter((x) => x !== p.id) : [...likes, p.id];
    setLikes(next);
    save("likes", next);
    if (!liked) {
      if (p.likedYou) toast(`It's a match with ${p.name}!`, "match");
      else toast("Liked!");
    }
  }

  return (
    <AppLayout>
      <div className="pg">
        <button className="up-back" onClick={() => navigate(-1)}>← Back</button>

        <div className="up-photo" style={{ background: p.bg, color: p.fg }}>{p.name[0]}</div>

        <div className="up-name">
          {p.name}, {p.age}
          {p.verified && <i className="ti ti-rosette-discount-check vb" title="Verified"></i>}
        </div>
        <div className="up-meta">{p.department} · {p.level}</div>

        <div className="up-badges">
          <span>{p.gender}</span>
          <span>Looking for: {p.lookingFor}</span>
        </div>

        <div className="up-block"><small>About</small>{p.bio}</div>
        <div className="up-block"><small>{p.prompt.q}</small>{p.prompt.a}</div>
        <div className="up-block">
          <small>Interests</small>
          <div className="up-badges" style={{ marginBottom: 0 }}>
            {p.tags.map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>

        <div className="up-actions">
          <button className={`up-like ${liked ? "on" : ""}`} onClick={toggleLike}>{liked ? "Liked" : "Like"}</button>
          <button className="up-ghost" onClick={() => navigate(`/chat/${p.id}`)}>Message</button>
          <button className="up-ghost" onClick={() => setCompliment(true)}>Compliment</button>
        </div>
        <button className="up-report" onClick={() => setReport(true)}>Block or report {p.name}</button>
      </div>

      {report && (
        <ReportModal profile={p} onClose={() => setReport(false)} onDone={(a) => a === "block" && navigate("/feed")} />
      )}
      {compliment && <ComplimentModal profile={p} onClose={() => setCompliment(false)} />}
    </AppLayout>
  );
}