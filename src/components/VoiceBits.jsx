import { useEffect, useRef, useState } from "react";
import { SendIcon } from "./Icons.jsx";

export const MAX_SECONDS = 60;

export const fmt = (s) => {
  const n = Math.max(0, Math.round(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function MicIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...svgProps}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="22" height="22" {...svgProps}>
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

/* ---------- Recording ---------- */
export function useRecorder() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [stopped, setStopped] = useState(false);
  const recorder = useRef(null);
  const chunks = useRef([]);
  const stream = useRef(null);
  const timer = useRef(null);
  const startedAt = useRef(0);
  const result = useRef(null);
  const waiting = useRef(null);
  const cancelled = useRef(false);

  function release() {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }

  function reset() {
    release();
    recorder.current = null;
    result.current = null;
    waiting.current = null;
    setActive(false);
    setStopped(false);
    setSeconds(0);
  }

  function stopRecorder() {
    const r = recorder.current;
    if (r && r.state === "recording") r.stop();
  }

  async function start() {
    if (active) return { ok: true };
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return { error: "Voice notes aren't supported on this browser." };
    }
    let media;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return { error: "Allow microphone access in your browser to record a voice note." };
    }

    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || "";
    let rec;
    try {
      rec = new MediaRecorder(media, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32000 });
    } catch {
      try {
        rec = new MediaRecorder(media);
      } catch {
        media.getTracks().forEach((t) => t.stop());
        return { error: "Voice notes aren't supported on this browser." };
      }
    }

    cancelled.current = false;
    chunks.current = [];
    result.current = null;
    waiting.current = null;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.current.push(e.data);
    };
    rec.onstop = () => {
      release();
      if (cancelled.current) return;
      const type = rec.mimeType || mime || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      const secs = Math.min(MAX_SECONDS, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
      const r = { blob, seconds: secs, mime: type };
      setStopped(true);
      setSeconds(secs);
      if (waiting.current) {
        const done = waiting.current;
        waiting.current = null;
        done(r);
      } else {
        result.current = r;
      }
    };

    recorder.current = rec;
    stream.current = media;
    startedAt.current = Date.now();
    rec.start();
    setSeconds(0);
    setStopped(false);
    setActive(true);

    // Counts the seconds, and stops by itself at the limit
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(Math.min(s, MAX_SECONDS));
      if (s >= MAX_SECONDS) stopRecorder();
    }, 250);
    return { ok: true };
  }

  // Stops (if still recording) and gives back the recording, or null if something went wrong
  function finish() {
    return new Promise((resolve) => {
      if (result.current) {
        const r = result.current;
        reset();
        resolve(r);
        return;
      }
      if (!recorder.current || recorder.current.state !== "recording") {
        reset();
        resolve(null);
        return;
      }
      waiting.current = (r) => {
        reset();
        resolve(r);
      };
      stopRecorder();
    });
  }

  function cancel() {
    cancelled.current = true;
    stopRecorder();
    reset();
  }

  // Leaving the chat while recording throws the recording away and frees the microphone
  useEffect(
    () => () => {
      cancelled.current = true;
      release();
      const r = recorder.current;
      if (r && r.state === "recording") r.stop();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { active, seconds, stopped, start, finish, cancel };
}

/* ---------- The bar shown while recording ---------- */
export function RecorderBar({ seconds, stopped, onCancel, onSend }) {
  return (
    <div className="rec">
      <button type="button" className="rec-cancel" onClick={onCancel} aria-label="Cancel recording">
        <TrashIcon />
      </button>
      <div className="rec-mid">
        <span className={`rec-dot ${stopped ? "off" : ""}`}></span>
        <span>{fmt(seconds)}</span>
        <small>{stopped ? "Limit reached" : "Recording..."}</small>
      </div>
      <button type="button" className="ch-send" onClick={onSend} aria-label="Send voice note">
        <SendIcon size={20} />
      </button>
    </div>
  );
}

/* ---------- A voice note in the conversation ---------- */
let nowPlaying = null; // only one voice note plays at a time

export function VoicePlayer({ url, seconds }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const total = seconds || 0;

  useEffect(
    () => () => {
      audio.current?.pause();
    },
    []
  );

  function toggle() {
    const a = audio.current;
    if (!a || !url) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }

  const pct = total ? Math.min(100, (pos / total) * 100) : 0;

  return (
    <div className="vn">
      <button
        type="button"
        className="vn-btn"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause voice note" : "Play voice note"}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="vn-bar"><span style={{ width: `${pct}%` }}></span></div>
      <span className="vn-time">{fmt(playing || pos ? pos : total)}</span>
      <audio
        ref={audio}
        src={url || undefined}
        preload="none"
        onPlay={() => {
          if (nowPlaying && nowPlaying !== audio.current) nowPlaying.pause();
          nowPlaying = audio.current;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
      />
    </div>
  );
}