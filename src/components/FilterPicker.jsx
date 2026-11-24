import { useMemo, useState } from "react";
import "./UniPicker.css";
import "./DeptPicker.css";
import "./FilterPicker.css";

// A filter box with a search bar. It looks like the other filters until you tap it.
// options: [{ value, hint }]  (hint is extra text people can search by, like a short name)
export default function FilterPicker({ name, value, onChange, options, placeholder, allLabel, searchLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(
      (o) => o.value.toLowerCase().includes(s) || (o.hint && o.hint.toLowerCase().includes(s))
    );
  }, [options, q]);

  function pick(v) {
    onChange(name, v);
    setOpen(false);
    setQ("");
  }

  return (
    <div className={`fp ${open ? "open" : ""}`}>
      <div className="fp-field">
        {/* A normal filter box underneath, so it matches the others */}
        <select tabIndex={-1} aria-hidden="true" value={value} onChange={() => {}}>
          <option value="">{placeholder}</option>
          {value && <option value={value}>{value}</option>}
        </select>
        <button
          type="button"
          className="fp-cover"
          aria-label={value ? `${placeholder}: ${value}` : placeholder}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        />
      </div>

      {open && (
        <div className="dp-box">
          <div className="up">
            <input
              className="up-input"
              type="search"
              autoFocus
              autoComplete="off"
              value={q}
              placeholder={searchLabel}
              aria-label={searchLabel}
              onChange={(e) => setQ(e.target.value)}
            />
            <ul className="up-list">
              {!q.trim() && (
                <li>
                  <button type="button" className="up-item" onClick={() => pick("")}>
                    <span>{allLabel}</span>
                  </button>
                </li>
              )}
              {list.map((o) => (
                <li key={o.value}>
                  <button type="button" className="up-item" onClick={() => pick(o.value)}>
                    <span>{o.value}</span>
                  </button>
                </li>
              ))}
              {list.length === 0 && <li className="up-empty">No match for "{q.trim()}".</li>}
            </ul>
            <button type="button" className="dp-close" onClick={() => { setOpen(false); setQ(""); }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}