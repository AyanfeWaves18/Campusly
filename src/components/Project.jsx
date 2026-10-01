import { useEffect } from "react";

// Set to false while you are developing (the blur triggers when you click into DevTools).
const ENABLED = true;

const isField = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

export default function Protect() {
  useEffect(() => {
    if (!ENABLED) return;
    document.body.classList.add("protected");

    const stop = (e) => e.preventDefault();
    const stopSelect = (e) => {
      if (!isField(e.target)) e.preventDefault();
    };
    const hide = () => document.body.classList.add("shield");
    const show = () => {
      if (document.hasFocus() && !document.hidden) document.body.classList.remove("shield");
    };
    const flash = (ms) => {
      hide();
      setTimeout(show, ms);
    };

    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (k === "printscreen") {
        flash(2000);
        navigator.clipboard?.writeText(" ").catch(() => {});
        e.preventDefault();
      }
      // Copy, cut, print, save, view source
      if (mod && ["c", "x", "p", "s", "u"].includes(k)) e.preventDefault();
      // Select all outside inputs
      if (mod && k === "a" && !isField(e.target)) e.preventDefault();
      // Mac screenshots (Cmd+Shift+3/4/5)
      if (e.metaKey && e.shiftKey && ["Digit3", "Digit4", "Digit5"].includes(e.code)) flash(2500);
      // Windows snipping (Win+Shift+S)
      if (e.metaKey && e.shiftKey && e.code === "KeyS") flash(2500);
    };
    const onKeyUp = (e) => {
      if (e.key === "PrintScreen") {
        flash(2000);
        navigator.clipboard?.writeText(" ").catch(() => {});
      }
    };
    const onVisibility = () => (document.hidden ? hide() : show());

    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("contextmenu", stop);
    document.addEventListener("dragstart", stop);
    document.addEventListener("selectstart", stopSelect);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    window.addEventListener("beforeprint", hide);
    window.addEventListener("afterprint", show);

    return () => {
      document.body.classList.remove("protected", "shield");
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("dragstart", stop);
      document.removeEventListener("selectstart", stopSelect);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      window.removeEventListener("beforeprint", hide);
      window.removeEventListener("afterprint", show);
    };
  }, []);

  return null;
}