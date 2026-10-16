import { useMemo, useRef } from "react";
import { EMOJIS } from "../utils/emojis.js";
import "./EmojiPicker.css";

// Each category starts at the first emoji of that group in your list
const CATS = [
  { label: "Smileys and people", icon: "😀", code: 0x1f600 },
  { label: "Animals and nature", icon: "🐶", code: 0x1f436 },
  { label: "Food and drink", icon: "🍏", code: 0x1f34f },
  { label: "Activities", icon: "⚽", code: 0x26bd },
  { label: "Travel and places", icon: "🚗", code: 0x1f697 },
  { label: "Objects", icon: "⌚", code: 0x231a },
  { label: "Hearts and symbols", icon: "❤️", code: 0x2764 },
  { label: "Flags", icon: "🏳️", code: 0x1f3f3 },
];

export default function EmojiPicker({ onPick }) {
  const box = useRef(null);
  const starts = useMemo(
    () => CATS.map((c) => EMOJIS.findIndex((e) => e.codePointAt(0) === c.code)),
    []
  );

  function jump(i) {
    const idx = starts[i];
    if (idx < 0 || !box.current) return;
    const el = box.current.querySelector(`[data-i="${idx}"]`);
    if (el) box.current.scrollTop = el.offsetTop;
  }

  return (
    <div className="emo">
      <div className="emo-cats">
        {CATS.map((c, i) => (
          <button type="button" key={c.label} aria-label={c.label} onClick={() => jump(i)}>
            {c.icon}
          </button>
        ))}
      </div>
      <div className="emo-grid" ref={box}>
        {EMOJIS.map((e, i) => (
          <button type="button" key={`${i}-${e}`} data-i={i} onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}