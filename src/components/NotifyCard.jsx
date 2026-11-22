import { useEffect, useState } from "react";
import { useToast } from "./Toast.jsx";
import { getUser, load, save } from "../utils/storage.js";
import {
  disablePush,
  enablePush,
  fetchPushPrefs,
  getPushState,
  sendTestPush,
  setPushPref,
  wantsPush,
  watchSignOut,
} from "../lib/push.js";
import "./NotifyCard.css";

const ROWS = [
  ["likes", "Likes and matches"],
  ["messages", "Messages and voice notes"],
  ["compliments", "Anonymous compliments"],
  ["events", "Event invites"],
];

function errorText(code) {
  if (code === "blocked") return "Notifications are blocked. Allow them for Campusly in your browser or phone settings, then try again.";
  if (code === "dismissed") return "";
  if (code === "not-ready") return "Campusly isn't ready yet. Reload the app and try again.";
  return "We couldn't turn notifications on. Please try again.";
}

// A card for Settings: turn notifications on or off and choose what you hear about
export default function NotifyCard() {
  const toast = useToast();
  const userId = getUser()?.id;
  const [status, setStatus] = useState("loading");
  const [prefs, setPrefs] = useState({ likes: true, messages: true, compliments: true, events: true });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const s = await getPushState();
    setStatus(s);
    if (s === "on") setPrefs(await fetchPushPrefs());
  }

  useEffect(() => {
    watchSignOut();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    const res = await enablePush(userId);
    setBusy(false);
    if (res.error) {
      const msg = errorText(res.error);
      if (msg) toast(msg, "err");
      await refresh();
      return;
    }
    toast("Notifications are on.");
    await refresh();
  }

  async function turnOff() {
    if (busy) return;
    setBusy(true);
    await disablePush(userId);
    setBusy(false);
    toast("Notifications are off on this device.");
    await refresh();
  }

  async function toggle(key) {
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    const res = await setPushPref(key, next);
    if (res.error) {
      setPrefs((p) => ({ ...p, [key]: !next }));
      toast("We couldn't save that. Please try again.", "err");
    }
  }

  async function test() {
    if (busy) return;
    setBusy(true);
    const res = await sendTestPush();
    setBusy(false);
    if (res.error) toast("We couldn't send the test. Please try again.", "err");
    else toast("Test sent. It should arrive in a few seconds.");
  }

  if (status === "loading") return null;

  return (
    <div className="in-card nt-card">
      <h2>Notifications</h2>

      {status === "unsupported" && (
        <p className="nt-text">This browser can't show notifications from Campusly.</p>
      )}

      {status === "install" && (
        <p className="nt-text">
          On iPhone, add Campusly to your Home Screen first (Share, then Add to Home Screen). Then open it from there
          and turn notifications on.
        </p>
      )}

      {status === "blocked" && (
        <p className="nt-text">
          Notifications are blocked for Campusly. Allow them in your browser or phone settings, then come back here.
        </p>
      )}

      {status === "off" && (
        <>
          <p className="nt-text">Get told when someone likes you, messages you or sends a compliment, even when the app is closed.</p>
          <button type="button" className="nt-btn" onClick={turnOn} disabled={busy}>
            {busy ? "Please wait..." : "Turn on notifications"}
          </button>
        </>
      )}

      {status === "on" && (
        <>
          <p className="nt-text">Notifications are on for this device. Choose what you want to hear about.</p>
          <div className="nt-rows">
            {ROWS.map(([key, label]) => (
              <div className="nt-row" key={key}>
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={prefs[key]}
                  aria-label={label}
                  className={`nt-switch ${prefs[key] ? "on" : ""}`}
                  onClick={() => toggle(key)}
                ></button>
              </div>
            ))}
          </div>
          <div className="nt-actions">
            <button type="button" className="nt-btn" onClick={test} disabled={busy}>Send a test</button>
            <button type="button" className="nt-link" onClick={turnOff} disabled={busy}>Turn off on this device</button>
          </div>
        </>
      )}
    </div>
  );
}

// A small card at the top of the feed, shown once to people who haven't decided yet
export function NotifyBanner() {
  const toast = useToast();
  const userId = getUser()?.id;
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (load("push_banner_off", false) || wantsPush(userId)) return;
      const s = await getPushState();
      if (s === "off" && typeof Notification !== "undefined" && Notification.permission === "default") setShow(true);
    })();
  }, [userId]);

  async function turnOn() {
    if (busy) return;
    setBusy(true);
    const res = await enablePush(userId);
    setBusy(false);
    if (res.error) {
      const msg = errorText(res.error);
      if (msg) toast(msg, "err");
      if (res.error === "blocked") save("push_banner_off", true);
      setShow(false);
      return;
    }
    toast("Notifications are on.");
    setShow(false);
  }

  function later() {
    save("push_banner_off", true);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="nt-banner">
      <div className="nt-banner-text">
        <b>Know when someone likes you</b>
        <span>Turn on notifications to hear about likes, messages and compliments, even when the app is closed.</span>
      </div>
      <div className="nt-banner-actions">
        <button type="button" className="nt-btn" onClick={turnOn} disabled={busy}>
          {busy ? "Please wait..." : "Turn on"}
        </button>
        <button type="button" className="nt-link" onClick={later} disabled={busy}>Not now</button>
      </div>
    </div>
  );
}