import { useMemo, useState } from "react";
import "./UniPicker.css";
import "./DeptPicker.css";

const ANY = "Any department";

// The search box and the matching departments
function SearchList({ options, onPick, onClose, placeholder }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((d) => d.toLowerCase().includes(s)) : options;
  }, [options, q]);

  return (
    <div className="dp-box">
      <div className="up">
        <input
          className="up-input"
          type="search"
          autoFocus
          autoComplete="off"
          value={q}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setQ(e.target.value)}
        />
        <ul className="up-list">
          {list.map((d) => (
            <li key={d}>
              <button type="button" className="up-item" onClick={() => onPick(d)}>
                <span>{d}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="up-empty">No match for "{q.trim()}". Try "Other" at the bottom.</li>}
        </ul>
        {onClose && (
          <button type="button" className="dp-close" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// Choose one department: tap the box, search, tap your course.
export default function DeptPicker({ id, options, value, onChange, placeholder = "Choose your department" }) {
  const [open, setOpen] = useState(false);

  function pick(d) {
    onChange(d);
    setOpen(false);
  }

  return (
    <>
      <input
        id={id}
        readOnly
        value={value || ""}
        placeholder={placeholder}
        aria-expanded={open}
        style={{ cursor: "pointer" }}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      />
      {open && (
        <SearchList
          options={options}
          onPick={pick}
          onClose={() => setOpen(false)}
          placeholder="Search your department"
        />
      )}
    </>
  );
}

// Choose several departments: search, add as many as you like, tap one to remove it.
// With none chosen it means "Any department".
export function DeptMulti({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const chosen = (value || []).filter((d) => d !== ANY);
  const available = useMemo(() => options.filter((d) => !chosen.includes(d)), [options, chosen]);

  function add(d) {
    onChange([...chosen, d]);
  }
  function remove(d) {
    const next = chosen.filter((x) => x !== d);
    onChange(next.length ? next : [ANY]);
  }

  return (
    <div>
      <div className="dp-tags">
        {chosen.length === 0 && <span className="dp-tag any">{ANY}</span>}
        {chosen.map((d) => (
          <button
            key={d}
            type="button"
            className="dp-tag"
            aria-label={`Remove ${d}`}
            onClick={() => remove(d)}
          >
            {d} <span className="dp-x" aria-hidden="true">×</span>
          </button>
        ))}
      </div>
      <button type="button" className="dp-add" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Done" : chosen.length ? "Add another department" : "Choose departments"}
      </button>
      {open && <SearchList options={available} onPick={add} placeholder="Search departments to add" />}
    </div>
  );
}