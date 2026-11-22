import { useMemo, useState } from "react";
import { UNI_TYPES, UNIVERSITIES, cleanCustomName, findListed } from "../utils/universities.js";
import "./UniPicker.css";

// Step 1: Private, Federal or State.  Step 2: search and pick.  Or type your own school.
// onPick(name, { custom }) is called with the school's full name.
export default function UniPicker({ onPick }) {
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  const list = useMemo(() => {
    if (!type) return [];
    const all = UNIVERSITIES[type];
    const s = q.trim().toLowerCase();
    if (!s) return all;
    return all.filter(
      (u) => u.name.toLowerCase().includes(s) || (u.short && u.short.toLowerCase().includes(s))
    );
  }, [type, q]);

  function chooseType(id) {
    setType(id);
    setQ("");
    setAdding(false);
    setError("");
  }

  function backToTypes() {
    setType("");
    setQ("");
    setAdding(false);
    setError("");
  }

  function submitCustom(e) {
    e.preventDefault();
    const { name, error: err } = cleanCustomName(custom);
    if (err) {
      setError(err);
      return;
    }
    const listed = findListed(name);
    if (listed) {
      onPick(listed, { custom: false });
      return;
    }
    onPick(name, { custom: true });
  }

  // Step 1: choose the type
  if (!type) {
    return (
      <div className="up">
        <p className="up-title">What kind of university?</p>
        <div className="up-types">
          {UNI_TYPES.map((t) => (
            <button key={t.id} type="button" className="up-type" onClick={() => chooseType(t.id)}>
              <span className="up-type-label">{t.label}</span>
              <span className="up-type-hint">{t.hint}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const typeLabel = UNI_TYPES.find((t) => t.id === type)?.label;

  // Step 2b: type your own school
  if (adding) {
    return (
      <form className="up" onSubmit={submitCustom} noValidate>
        <button type="button" className="up-back" onClick={() => setAdding(false)}>
          ← Back to the list
        </button>
        <label className="up-title" htmlFor="up-custom">
          Type your school's full name
        </label>
        <input
          id="up-custom"
          className="up-input"
          value={custom}
          maxLength={80}
          autoFocus
          autoComplete="off"
          placeholder="e.g. Federal Polytechnic Ilaro"
          onChange={(e) => {
            setCustom(e.target.value);
            setError("");
          }}
        />
        {error && (
          <p className="up-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="up-go">
          Continue
        </button>
      </form>
    );
  }

  // Step 2a: search and pick
  return (
    <div className="up">
      <button type="button" className="up-back" onClick={backToTypes}>
        ← {typeLabel} universities (change)
      </button>
      <label className="up-title" htmlFor="up-search">
        Find your university
      </label>
      <input
        id="up-search"
        className="up-input"
        type="search"
        value={q}
        autoComplete="off"
        placeholder={`Search ${typeLabel.toLowerCase()} universities`}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="up-list">
        {list.map((u) => (
          <li key={u.name}>
            <button type="button" className="up-item" onClick={() => onPick(u.name, { custom: false })}>
              <span>{u.name}</span>
              {u.short && <span className="up-short">{u.short}</span>}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="up-empty">No match for "{q.trim()}".</li>}
      </ul>
      <button type="button" className="up-add" onClick={() => setAdding(true)}>
        My school isn't listed
      </button>
    </div>
  );
}