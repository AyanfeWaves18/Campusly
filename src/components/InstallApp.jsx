import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "./Toast.jsx";
import { load, save } from "../utils/storage.js";
import { canPrompt, isIOS, isStandalone, onInstallChange, promptInstall } from "../utils/install.js";
import "./Modals.css";
import "./InstallApp.css";

const DISMISS_DAYS = 14;

function useInstallState() {
  const [, force] = useState(0);
  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);
  return { standalone: isStandalone(), prompt: canPrompt(), ios: isIOS() };
}

// Step-by-step help for browsers that can't install with one tap
function HowSheet({ onClose }) {
  const ios = isIOS();
  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-sheet" onClick={(e) => e.stopPropagation()}>
        <h2>Install Campusly</h2>
        {ios ? (
          <ol className="ib-steps">
            <li>Open Campusly in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button (the square with an arrow pointing up).</li>
            <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
            <li>Tap <b>Add</b>. The Campusly icon appears on your home screen.</li>
          </ol>
        ) : (
          <ol className="ib-steps">
            <li>Open your browser's menu (the three dots).</li>
            <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
            <li>Confirm. The Campusly icon appears on your home screen.</li>
          </ol>
        )}
        <p className="md-text">You'll log in once inside the app.</p>
        <div className="md-row">
          <button className="md-btn" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// A small card in Settings
export function InstallCard() {
  const toast = useToast();
  const st = useInstallState();
  const [help, setHelp] = useState(false);

  async function install() {
    if (st.prompt) {
      const out = await promptInstall();
      if (out === "accepted") toast("Campusly installed");
    } else {
      setHelp(true);
    }
  }

  return (
    <div className="in-card">
      <h2>Get the app</h2>
      {st.standalone ? (
        <p>You're using the Campusly app. ✓</p>
      ) : (
        <>
          <p>Open Campusly from your home screen, full screen, like any other app.</p>
          <button className="in-btn" onClick={install}>
            {st.prompt ? "Install Campusly" : "How to install"}
          </button>
        </>
      )}
      {help && <HowSheet onClose={() => setHelp(false)} />}
    </div>
  );
}

// A dismissible banner on the Feed
export default function InstallBanner() {
  const { pathname } = useLocation();
  const toast = useToast();
  const st = useInstallState();
  const [hidden, setHidden] = useState(false);
  const [help, setHelp] = useState(false);

  const dismissedAt = Number(load("install_dismissed", 0)) || 0;
  const recentlyDismissed = Date.now() - dismissedAt < DISMISS_DAYS * 86400000;
  const cookiesDone = load("cookie_ok", false);

  function dismiss() {
    save("install_dismissed", Date.now());
    setHidden(true);
  }

  async function install() {
    if (st.prompt) {
      const out = await promptInstall();
      if (out === "accepted") toast("Campusly installed");
      else dismiss();
    } else {
      setHelp(true);
    }
  }

  if (pathname !== "/feed" || hidden || st.standalone || recentlyDismissed || !cookiesDone) return null;
  if (!st.prompt && !st.ios) return null;

  return (
    <>
      <div className="ib">
        <img src="/favicon-192.png" alt="" />
        <div className="ib-text">
          <b>Get the Campusly app</b>
          <span>Open it from your home screen.</span>
        </div>
        <button className="ib-go" onClick={install}>{st.prompt ? "Install" : "How"}</button>
        <button className="ib-x" onClick={dismiss} aria-label="Not now">×</button>
      </div>
      {help && <HowSheet onClose={() => setHelp(false)} />}
    </>
  );
}