import { useEffect, useRef, useState } from "react";
import "./PullToRefresh.css";

// Pass a ref to a scrolling element, or nothing to use the whole page
export function usePullToRefresh(onRefresh, elRef) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const target = elRef?.current || window;
    const atTop = () => (elRef?.current ? elRef.current.scrollTop <= 0 : window.scrollY <= 0);

    const onStart = (e) => {
      startY.current = !busy.current && atTop() ? e.touches[0].clientY : null;
    };
    const onMove = (e) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && atTop()) {
        pullRef.current = Math.min(dy * 0.5, 90);
        setPull(pullRef.current);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      const go = pullRef.current >= 60 && !busy.current;
      pullRef.current = 0;
      setPull(0);
      if (!go) return;
      busy.current = true;
      setRefreshing(true);
      try {
        await cb.current();
      } finally {
        busy.current = false;
        setRefreshing(false);
      }
    };

    target.addEventListener("touchstart", onStart, { passive: true });
    target.addEventListener("touchmove", onMove, { passive: true });
    target.addEventListener("touchend", onEnd);
    target.addEventListener("touchcancel", onEnd);
    return () => {
      target.removeEventListener("touchstart", onStart);
      target.removeEventListener("touchmove", onMove);
      target.removeEventListener("touchend", onEnd);
      target.removeEventListener("touchcancel", onEnd);
    };
  }, [elRef]);

  return { pull, refreshing };
}

export function PullIndicator({ pull, refreshing, top = 70 }) {
  if (!pull && !refreshing) return null;
  const y = refreshing ? 14 : pull * 0.4;
  return (
    <div
      className="ptr"
      style={{ top, transform: `translate(-50%, ${y}px)`, opacity: refreshing ? 1 : Math.min(pull / 60, 1) }}
    >
      <span
        className={`ptr-spin ${refreshing ? "go" : ""}`}
        style={!refreshing ? { transform: `rotate(${pull * 4}deg)` } : undefined}
      ></span>
    </div>
  );
}