import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "./Toast.jsx";
import { blockUser, getUser, load, reportUser, save } from "../utils/storage.js";
import { complimentPresets, reportReasons } from "../utils/options.js";
import "./Modals.css";

function Sheet({ onClose, title, children }) {
  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* Block or report someone */
export function ReportModal({ profile, onClose, onDone }) {
  const toast = useToast();
  const [step, setStep] = useState("menu");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);

  function doBlock() {
    blockUser(profile.id);
    toast(`${profile.name} blocked`);
    onDone?.("block");
    onClose();
  }

  function doReport() {
    if (!reason) {
      toast("Pick a reason first", "err");
      return;
    }
    reportUser(profile.id, reason, note);
    if (alsoBlock) blockUser(profile.id);
    toast("Report sent. Thanks for keeping Campusly safe.");
    onDone?.(alsoBlock ? "block" : "report");
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={profile.name}>
      {step === "menu" && (
        <div className="md-list">
          <button onClick={() => setStep("report")}><i className="ti ti-flag"></i> Report</button>
          <button onClick={() => setStep("block")}><i className="ti ti-ban"></i> Block</button>
          <button className="ghost" onClick={onClose}>Cancel</button>
        </div>
      )}

      {step === "block" && (
        <>
          <p className="md-text">
            {profile.name} won't see your profile and you won't see theirs. You can unblock them
            later in account settings.
          </p>
          <div className="md-row">
            <button className="md-btn ghost" onClick={() => setStep("menu")}>Back</button>
            <button className="md-btn danger" onClick={doBlock}>Block</button>
          </div>
        </>
      )}

      {step === "report" && (
        <>
          <p className="md-text">Why are you reporting {profile.name}?</p>
          <div className="md-reasons">
            {reportReasons.map((r) => (
              <label key={r} className={reason === r ? "on" : ""}>
                <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
          <textarea
            rows="2"
            maxLength="200"
            placeholder="Anything else we should know? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="md-check">
            <input type="checkbox" checked={alsoBlock} onChange={() => setAlsoBlock(!alsoBlock)} />
            Also block {profile.name}
          </label>
          <div className="md-row">
            <button className="md-btn ghost" onClick={() => setStep("menu")}>Back</button>
            <button className="md-btn" onClick={doReport}>Send report</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* Anonymous compliment (preset messages only) */
export function ComplimentModal({ profile, onClose }) {
  const toast = useToast();
  const me = getUser() || {};
  const [pick, setPick] = useState("");
  const texts = complimentPresets.map((t) => t.replace("{dept}", me.department || "your campus"));

  function send() {
    if (!pick) {
      toast("Pick a message", "err");
      return;
    }
    const sent = load("compliments_sent", []);
    const today = new Date().toDateString();
    if (sent.filter((s) => new Date(s.t).toDateString() === today).length >= 3) {
      toast("You can send 3 compliments a day", "err");
      return;
    }
    save("compliments_sent", [...sent, { to: profile.id, text: pick, t: Date.now() }]);
    toast("Compliment sent anonymously");
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={`Compliment ${profile.name}`}>
      <p className="md-text">
        It's anonymous and uses ready-made messages only. Abuse can be reported, and senders can be
        removed.
      </p>
      <div className="md-reasons">
        {texts.map((t) => (
          <label key={t} className={pick === t ? "on" : ""}>
            <input type="radio" name="comp" checked={pick === t} onChange={() => setPick(t)} />
            {t}
          </label>
        ))}
      </div>
      <div className="md-row">
        <button className="md-btn ghost" onClick={onClose}>Cancel</button>
        <button className="md-btn" onClick={send}>Send</button>
      </div>
    </Sheet>
  );
}

/* First-time tour */
const tourSteps = [
  { icon: "ti-flame", title: "Scroll the feed", text: "Everyone on your campus shows up in one scrolling feed. Use the filters to narrow it down." },
  { icon: "ti-heart", title: "Tap Like", text: "Like someone you'd like to meet. If they like you back, it's a match." },
  { icon: "ti-message", title: "Match and message", text: "Matches show up in the Matches tab. Say hi from there, or from any profile." },
];

export function Tour({ onClose }) {
  const [i, setI] = useState(0);
  const s = tourSteps[i];
  const last = i === tourSteps.length - 1;

  function finish() {
    save("tour_done", true);
    onClose();
  }

  return (
    <div className="md-overlay center">
      <div className="md-sheet tour">
        <i className={`ti ${s.icon} tour-icon`}></i>
        <h2>{s.title}</h2>
        <p className="md-text">{s.text}</p>
        <div className="tour-dots">
          {tourSteps.map((_, n) => (
            <span key={n} className={n === i ? "on" : ""}></span>
          ))}
        </div>
        <div className="md-row">
          <button className="md-btn ghost" onClick={finish}>Skip</button>
          <button className="md-btn" onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Cookie / storage notice */
export function CookieNotice() {
  const [show, setShow] = useState(() => !load("cookie_ok", false));
  if (!show) return null;

  return (
    <div className="ck">
      <p>
        We use cookies and local storage to keep you logged in and remember your settings.{" "}
        <Link to="/privacy">Learn more</Link>
      </p>
      <button
        onClick={() => {
          save("cookie_ok", true);
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}