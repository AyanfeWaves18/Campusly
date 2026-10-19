import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

let scriptPromise = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = () => {
        scriptPromise = null;
        reject(new Error("captcha script"));
      };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Shows Cloudflare's check and gives the token to onToken.
// Change resetSignal (for example add 1) to ask for a fresh check. A token works only once.
export default function Captcha({ onToken, resetSignal = 0 }) {
  const box = useRef(null);
  const widget = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || widget.current !== null || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          callback: (token) => cb.current(token),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => cb.current(""));
    return () => {
      cancelled = true;
      if (widget.current !== null && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
      cb.current("");
    };
  }, []);

  useEffect(() => {
    if (resetSignal && widget.current !== null && window.turnstile) {
      cb.current("");
      window.turnstile.reset(widget.current);
    }
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return <div ref={box} style={{ margin: "4px 0 14px" }}></div>;
}