import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "./Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import { complimentPresets, reportReasons } from "../utils/options.js";
import { blockPerson, reportPerson } from "../lib/blocks.js";
import { complimentsLeft, sendCompliment } from "../lib/compliments.js";
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

/* Block or report someone (saved in the cloud) */
export function ReportModal({ profile, onClose, onDone }) {
  const toast = useToast();
  const [step, setStep] = useState("menu");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);

  async function doBlock() {
    setBusy(true);
    const res = await blockPerson(profile.id);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast(`${profile.name} blocked`);
    onDone?.("block");
    onClose();
  }

  async function doReport() {
    if (!reason) {
      toast("Pick a reason first", "err");
      return;
    }
    setBusy(true);
    const res = await reportPerson(profile.id, reason, note, alsoBlock);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
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
            {profile.name} won't see your profile and you won't see theirs. Any likes between you are
            removed. You can unblock them later in account settings.
          </p>
          <div className="md-row">
            <button className="md-btn ghost" onClick={() => setStep("menu")} disabled={busy}>Back</button>
            <button className="md-btn danger" onClick={doBlock} disabled={busy}>
              {busy ? "Blocking..." : "Block"}
            </button>
          </div>
        </>
      )}

      {step === "report" && (
        <>
          <p className="md-text">
            Why are you reporting {profile.name}? We'll also save your recent messages with them so
            they can be reviewed.
          </p>
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
            maxLength="300"
            placeholder="Anything else we should know? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <label className="md-check">
            <input type="checkbox" checked={alsoBlock} onChange={() => setAlsoBlock(!alsoBlock)} />
            Also block {profile.name}
          </label>
          <div className="md-row">
            <button className="md-btn ghost" onClick={() => setStep("menu")} disabled={busy}>Back</button>
            <button className="md-btn" onClick={doReport} disabled={busy}>
              {busy ? "Sending..." : "Send report"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

/* Anonymous compliment (ready-made messages only, saved in the cloud) */
export function ComplimentModal({ profile, onClose }) {
  const toast = useToast();
  const me = getUser() || {};
  const [pick, setPick] = useState(0); // 1 to 4
  const [left, setLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const texts = complimentPresets.map((t) => t.replace("{dept}", me.department || "your campus"));

  useEffect(() => {
    complimentsLeft().then(setLeft);
  }, []);

  async function send() {
    if (!pick) {
      toast("Pick a message", "err");
      return;
    }
    setBusy(true);
    const res = await sendCompliment(profile.id, pick);
    setBusy(false);
    if (res.error) {
      toast(res.error, "err");
      return;
    }
    toast("Compliment sent anonymously");
    onClose();
  }

  return (
    <Sheet onClose={onClose} title={`Compliment ${profile.name}`}>
      <p className="md-text">
        {profile.name} won't know it was you. It uses ready-made messages only, and abuse can be
        reported.
        {left !== null && (
          <>
            {" "}
            <b>{left > 0 ? `You can send ${left} more today.` : "You've used all 3 for today."}</b>
          </>
        )}
      </p>
      <div className="md-reasons">
        {texts.map((t, i) => (
          <label key={t} className={pick === i + 1 ? "on" : ""}>
            <input type="radio" name="comp" checked={pick === i + 1} onChange={() => setPick(i + 1)} />
            {t}
          </label>
        ))}
      </div>
      <div className="md-row">
        <button className="md-btn ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="md-btn" onClick={send} disabled={busy || left === 0}>
          {busy ? "Sending..." : "Send"}
        </button>
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