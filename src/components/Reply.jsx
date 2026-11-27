import { useCallback, useRef } from "react";

// Swipe a message to the right to reply to it. Works with a finger and with a mouse drag.
const TRIGGER = 40; // how far the message must move before letting go counts as a reply
const MAX = 80;

function paint(el, dx, ready) {
  el.style.transition = "none";
  el.style.transform = dx ? `translateX(${dx}px)` : "";
  el.style.setProperty("--sw", `${dx}px`);
  el.classList.toggle("sw-ready", ready);
}

function release(el) {
  el.classList.remove("sw-drag", "sw-ready");
  el.style.transition = "transform 0.18s ease";
  el.style.transform = "";
  el.style.setProperty("--sw", "0px");
  setTimeout(() => {
    el.style.transition = "";
  }, 220);
}

// ---------- Right-click menu (computers) ----------
let openMenu = null;

function closeMenu() {
  if (openMenu) {
    openMenu();
    openMenu = null;
  }
}

function showMenu(x, y, items) {
  closeMenu();
  const box = document.createElement("div");
  box.className = "rp-menu";
  box.setAttribute("role", "menu");
  items.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "menuitem");
    const icon = document.createElement("i");
    icon.className = `ti ${item.icon}`;
    b.appendChild(icon);
    b.appendChild(document.createTextNode(item.label));
    b.addEventListener("click", () => {
      closeMenu();
      item.run();
    });
    box.appendChild(b);
  });
  document.body.appendChild(box);

  // Keep the menu inside the window
  const r = box.getBoundingClientRect();
  box.style.left = `${Math.max(8, Math.min(x, window.innerWidth - r.width - 8))}px`;
  box.style.top = `${Math.max(8, Math.min(y, window.innerHeight - r.height - 8))}px`;

  const onDown = (e) => {
    if (!box.contains(e.target)) closeMenu();
  };
  const onKey = (e) => {
    if (e.key === "Escape") closeMenu();
  };
  const onAway = () => closeMenu();
  document.addEventListener("mousedown", onDown, true);
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("scroll", onAway, true);
  document.addEventListener("wheel", onAway, true);
  window.addEventListener("resize", onAway);
  window.addEventListener("blur", onAway);

  openMenu = () => {
    document.removeEventListener("mousedown", onDown, true);
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("scroll", onAway, true);
    document.removeEventListener("wheel", onAway, true);
    window.removeEventListener("resize", onAway);
    window.removeEventListener("blur", onAway);
    box.remove();
  };
  box.querySelector("button")?.focus();
}

// const swipe = useSwipeReply((message) => ...);  then  <div {...swipe(message, canReply)}>
export function useSwipeReply(onReply) {
  const cb = useRef(onReply);
  cb.current = onReply;
  const st = useRef(null);

  return useCallback((m, enabled = true) => {
    if (!enabled) return {};
    return {
      // Right-click on a computer: Reply and Copy. Phones keep their own long-press behaviour.
      onContextMenu(e) {
        if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return;
        if (e.target.closest && e.target.closest("a, input, textarea, audio")) return;
        // Text is selected: let the normal menu appear so it can be copied
        if (window.getSelection?.()?.toString()) return;
        e.preventDefault();
        const items = [{ label: "Reply", icon: "ti-arrow-back-up", run: () => cb.current?.(m) }];
        if (m.body && !m.audio_path) {
          items.push({ label: "Copy text", icon: "ti-copy", run: () => navigator.clipboard?.writeText(m.body) });
        }
        showMenu(e.clientX, e.clientY, items);
      },
      onPointerDown(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        // Buttons, links and sliders inside a message keep working normally
        if (e.target.closest && e.target.closest("button, a, input, textarea, audio, [role=slider], .rp-quote")) return;
        st.current = { el: e.currentTarget, m, x: e.clientX, y: e.clientY, pid: e.pointerId, locked: false, eff: 0, hit: false };
      },
      onPointerMove(e) {
        const s = st.current;
        if (!s || s.pid !== e.pointerId) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (!s.locked) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          // Only a clear sideways move to the right starts a swipe. Anything else is scrolling.
          if (dx > 0 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            s.locked = true;
            try {
              s.el.setPointerCapture(e.pointerId);
            } catch {
              /* not every browser allows it */
            }
            s.el.classList.add("sw-drag");
            window.getSelection?.()?.removeAllRanges();
          } else {
            st.current = null;
            return;
          }
        }
        s.eff = dx > 0 ? Math.min(MAX, dx * 0.7) : 0;
        const hit = s.eff >= TRIGGER;
        if (hit && !s.hit) navigator.vibrate?.(12);
        s.hit = hit;
        paint(s.el, s.eff, hit);
      },
      onPointerUp(e) {
        const s = st.current;
        if (!s || s.pid !== e.pointerId) return;
        st.current = null;
        if (!s.locked) return;
        release(s.el);
        if (s.eff >= TRIGGER) cb.current?.(s.m);
      },
      onPointerCancel(e) {
        const s = st.current;
        if (!s || s.pid !== e.pointerId) return;
        st.current = null;
        if (s.locked) release(s.el);
      },
    };
  }, []);
}

// What a message looks like in a quote or in the "Replying to" bar
export function previewOf(m) {
  if (m.audio_path) return "Voice note";
  const t = String(m.body || "").replace(/\s+/g, " ").trim();
  return (t || "Message").slice(0, 120);
}

// Scrolls to the original message and flashes it
export function jumpToMessage(id) {
  const el = document.getElementById(`m-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("rp-flash");
  void el.offsetWidth;
  el.classList.add("rp-flash");
  setTimeout(() => el.classList.remove("rp-flash"), 1400);
}

// The small box at the top of a message that replies to another one.
// quote: { id, name, text } or { missing: true } when the original isn't loaded anymore.
export function ReplyQuote({ quote }) {
  if (!quote) return null;
  if (quote.missing) {
    return (
      <div className="rp-quote gone">
        <span>Original message</span>
      </div>
    );
  }
  return (
    <div
      className="rp-quote"
      role="button"
      tabIndex={0}
      onClick={() => jumpToMessage(quote.id)}
      onKeyDown={(e) => e.key === "Enter" && jumpToMessage(quote.id)}
    >
      <b>{quote.name}</b>
      <span>{quote.text}</span>
    </div>
  );
}

// Above the typing box while you are writing a reply
export function ReplyBar({ reply, onCancel }) {
  return (
    <div className="rp-bar">
      <div className="rp-bar-main">
        <b>Replying to {reply.name}</b>
        <span>{reply.text}</span>
      </div>
      <button type="button" className="rp-x" aria-label="Cancel reply" onClick={onCancel}>
        <i className="ti ti-x"></i>
      </button>
    </div>
  );
}