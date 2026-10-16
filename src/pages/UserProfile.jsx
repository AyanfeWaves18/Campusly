import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppLayout from "../components/AppLayout.jsx";
import { ComplimentModal, ReportModal } from "../components/Modals.jsx";
import { useToast } from "../components/Toast.jsx";
import { load } from "../utils/storage.js";
import { fetchPerson } from "../lib/people.js";
import { fetchMyLikes, likePerson, unlikePerson } from "../lib/likes.js";
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

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [person, setPerson] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | missing
  const [photoIndex, setPhotoIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [report, setReport] = useState(false);
  const [compliment, setCompliment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.all([fetchPerson(id), fetchMyLikes()]).then(([res, likesRes]) => {
      if (cancelled) return;
      if (res.error || load("blocked", []).includes(id)) {
        setStatus("missing");
      } else {
        setPerson(res.person);
        setLiked(!likesRes.error && likesRes.ids.includes(id));
        setPhotoIndex(0);
        setStatus("ok");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleLike() {
    if (likeBusy) return;
    const was = liked;
    setLikeBusy(true);
    setLiked(!was);
    const res = was ? await unlikePerson(id) : await likePerson(id);
    setLikeBusy(false);
    if (res.error) {
      setLiked(was);
      toast(res.error, "err");
      return;
    }
    if (!was) {
      if (res.match) toast(`It's a match with ${person.name}!`, "match");
      else toast("Liked! You can send up to 3 free messages.");
    }
  }

  if (status === "loading") {
    return (
      <AppLayout>
        <div className="pg">
          <div className="sk" style={{ height: 300, borderRadius: 20, marginBottom: 16 }}></div>
          <div className="sk sk-line w60"></div>
          <div className="sk sk-line w40"></div>
        </div>
      </AppLayout>
    );
  }

  if (status === "missing") {
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

  const p = person;
  const [bg, fg] = colorFor(p.id);
  const answers = Object.entries(p.prompts || {}).filter(([, a]) => a);
  const bigPhoto = p.photoUrls[photoIndex];

  return (
    <AppLayout>
      <div className="pg">
        <button className="up-back" onClick={() => navigate(-1)}>← Back</button>

        {bigPhoto ? (
          <img
            src={bigPhoto}
            alt={p.name}
            style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 20, marginBottom: 12 }}
          />
        ) : (
          <div className="up-photo" style={{ background: bg, color: fg }}>{p.name?.[0]}</div>
        )}

        {p.photoUrls.length > 1 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {p.photoUrls.map((u, i) => (
              <img
                key={u}
                src={u}
                alt={`Photo ${i + 1}`}
                onClick={() => setPhotoIndex(i)}
                style={{
                  width: 56,
                  height: 56,
                  objectFit: "cover",
                  borderRadius: 10,
                  cursor: "pointer",
                  border: i === photoIndex ? "2px solid var(--purple)" : "2px solid transparent",
                }}
              />
            ))}
          </div>
        )}

        <div className="up-name">
          {p.name}
          {p.verified && <i className="ti ti-rosette-discount-check vb" title="Verified"></i>}
        </div>
        <div className="up-meta">{p.department} · {p.level}</div>

        <div className="up-badges">
          {p.gender && <span>{p.gender}</span>}
          {p.lookingFor && <span>Looking for: {p.lookingFor}</span>}
          <span>{p.uni}</span>
        </div>

        {p.bio && <div className="up-block"><small>About</small>{p.bio}</div>}
        {answers.map(([q, a]) => (
          <div className="up-block" key={q}><small>{q}</small>{a}</div>
        ))}
        {p.tags.length > 0 && (
          <div className="up-block">
            <small>Interests</small>
            <div className="up-badges" style={{ marginBottom: 0 }}>
              {p.tags.map((t) => <span key={t}>{t}</span>)}
            </div>
          </div>
        )}

        <div className="up-actions">
          <button className={`up-like ${liked ? "on" : ""}`} onClick={toggleLike}>
            {liked ? "Liked" : "Like"}
          </button>
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