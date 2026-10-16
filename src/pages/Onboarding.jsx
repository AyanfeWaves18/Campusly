import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../components/Toast.jsx";
import { supabase } from "../lib/supabase.js";
import { completeMyProfile, syncUser } from "../lib/auth.js";
import { load, setLoggedIn } from "../utils/storage.js";
import {
  departments,
  levels,
  genders,
  interestedInOptions,
  lookingForOptions,
  interestsList,
} from "../utils/options.js";
import "./Auth.css";

const CAMPUSES = ["Crawford University"];
const digits = (s) => (s || "").replace(/\D/g, "");

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className={`au-chip ${on ? "on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const toast = useToast();
  const saved = load("uni", "");

  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    uni: CAMPUSES.includes(saved) ? saved : "",
    phone: "",
    gender: "",
    department: "",
    level: "",
    interestedIn: "",
    lookingFor: "",
    deptPrefs: ["Any department"],
    interests: [],
    bio: "",
  });

  // Only signed-in people with an unfinished profile belong here
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        navigate("/login", { replace: true });
        return;
      }
      const user = await syncUser();
      if (cancelled) return;
      if (user?.department) {
        navigate("/feed", { replace: true });
        return;
      }
      const meta = data.session.user.user_metadata || {};
      setForm((f) => ({ ...f, name: user?.name || meta.full_name || meta.name || "" }));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  function update(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }
  function setField(field, value) {
    setForm({ ...form, [field]: value });
    setError("");
  }
  function toggleInterest(item) {
    const has = form.interests.includes(item);
    setField("interests", has ? form.interests.filter((i) => i !== item) : [...form.interests, item]);
  }
  function toggleDept(dept) {
    if (dept === "Any department") {
      setField("deptPrefs", ["Any department"]);
      return;
    }
    const without = form.deptPrefs.filter((d) => d !== "Any department");
    const next = without.includes(dept) ? without.filter((d) => d !== dept) : [...without, dept];
    setField("deptPrefs", next.length ? next : ["Any department"]);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter your name.");
    if (!form.uni) return setError("Choose your university.");
    if (digits(form.phone).length < 10) return setError("Enter a valid phone number.");
    if (!form.gender || !form.department || !form.level || !form.interestedIn || !form.lookingFor) {
      return setError("Fill in your gender, department, level, and what you're looking for.");
    }
    if (form.interests.length === 0) return setError("Pick at least one interest.");

    setBusy(true);
    setError("");
    const res = await completeMyProfile(form);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast("Welcome to Campusly!");
    navigate("/feed", { replace: true });
  }

  async function useAnotherAccount() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    navigate("/login", { replace: true });
  }

  if (!ready) {
    return (
      <div className="au-page">
        <main className="au">
          <p className="au-sub">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="au-page">
      <main className="au">
        <div className="au-logo"><Logo size={38} /></div>

        <div className="au-card">
          <form onSubmit={submit}>
            <h1>Finish your profile</h1>
            <p className="au-sub">One last step. This is what people see on your profile.</p>

            <label>Full name</label>
            <input name="name" placeholder="John Doe" value={form.name} onChange={update} />

            <label>University</label>
            <select name="uni" value={form.uni} onChange={update}>
              <option value="">Choose your university</option>
              {CAMPUSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label>Phone number</label>
            <input name="phone" type="tel" placeholder="0801 234 5678" value={form.phone} onChange={update} />

            <label>Gender</label>
            <div className="au-chips">
              {genders.map((x) => (
                <Chip key={x} on={form.gender === x} onClick={() => setField("gender", x)}>{x}</Chip>
              ))}
            </div>

            <label>Department</label>
            <select name="department" value={form.department} onChange={update}>
              <option value="">Choose your department</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>

            <label>Level</label>
            <select name="level" value={form.level} onChange={update}>
              <option value="">Choose your level</option>
              {levels.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            <label>Interested in</label>
            <div className="au-chips">
              {interestedInOptions.map((o) => (
                <Chip key={o} on={form.interestedIn === o} onClick={() => setField("interestedIn", o)}>{o}</Chip>
              ))}
            </div>

            <label>Looking for</label>
            <div className="au-chips">
              {lookingForOptions.map((o) => (
                <Chip key={o} on={form.lookingFor === o} onClick={() => setField("lookingFor", o)}>{o}</Chip>
              ))}
            </div>

            <label>Departments you'd like to meet</label>
            <div className="au-chips">
              {["Any department", ...departments].map((d) => (
                <Chip key={d} on={form.deptPrefs.includes(d)} onClick={() => toggleDept(d)}>{d}</Chip>
              ))}
            </div>

            <label>Your interests</label>
            <div className="au-chips">
              {interestsList.map((i) => (
                <Chip key={i} on={form.interests.includes(i)} onClick={() => toggleInterest(i)}>{i}</Chip>
              ))}
            </div>

            <label>Short bio (optional)</label>
            <textarea
              name="bio"
              rows="3"
              maxLength="160"
              placeholder="Tell people a bit about yourself"
              value={form.bio}
              onChange={update}
            />

            {error && <div className="au-error">{error}</div>}
            <button type="submit" className="au-btn" disabled={busy}>
              {busy ? "Saving..." : "Finish"}
            </button>

            <button type="button" className="au-link" onClick={useAnotherAccount}>
              Use a different account
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}