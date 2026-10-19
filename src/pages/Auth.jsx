import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Captcha from "../components/Captcha.jsx";
import Footer from "../components/Footer.jsx";
import ForgotForm from "../components/ForgotForm.jsx";
import Logo from "../components/Logo.jsx";
import { getUser, load } from "../utils/storage.js";
import { checkPassword, passwordRules } from "../utils/validate.js";
import { signInUser, signInWithGoogle, signUpUser } from "../lib/auth.js";
import {
  departments,
  levels,
  genders,
  interestedInOptions,
  lookingForOptions,
  interestsList,
} from "../utils/options.js";
import "./Auth.css";

const digits = (s) => (s || "").replace(/\D/g, "");

function PasswordField({ value, onChange, placeholder, show, setShow, name = "password" }) {
  return (
    <div className="au-pass">
      <input
        name={name}
        type={show ? "text" : "password"}
        maxLength="15"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      <button type="button" onClick={() => setShow(!show)} aria-label="Show or hide password">
        <i className={`ti ${show ? "ti-eye-off" : "ti-eye"}`}></i>
      </button>
    </div>
  );
}

function PwRules({ pw }) {
  return (
    <ul className="au-rules">
      {passwordRules(pw).map((r) => (
        <li key={r.label} className={r.ok && pw ? "ok" : ""}>
          {r.ok && pw ? "✓" : "○"} {r.label}
        </li>
      ))}
    </ul>
  );
}

function Chip({ on, onClick, children }) {
  return (
    <button type="button" className={`au-chip ${on ? "on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function GoogleButton({ onClick }) {
  return (
    <>
      <div className="au-or"><span>or</span></div>
      <button type="button" className="au-google" onClick={onClick}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        Continue with Google
      </button>
    </>
  );
}

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();

  // The university must be chosen on the landing page first
  const uni = location.state?.uni || load("uni", "") || getUser()?.uni || "";

  const [step, setStep] = useState(1);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    gender: "",
    department: "",
    level: "",
    interestedIn: "",
    lookingFor: "",
    deptPrefs: ["Any department"],
    interests: [],
    bio: "",
  });

  const [loginBy, setLoginBy] = useState("email");
  const [login, setLogin] = useState({ id: "", password: "" });

  useEffect(() => {
    if (!uni) navigate("/", { replace: true });
  }, [uni, navigate]);

  if (!uni) return null;

  // A security-check token works only once, so ask for a fresh one after every attempt
  function spendCaptcha() {
    setCaptchaToken("");
    setCaptchaReset((n) => n + 1);
  }

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

  const comingSoon = (what) => setError(`${what} is being connected to the real database. Coming in the next step.`);

  async function handleGoogle() {
    setError("");
    setBusy(true);
    const res = await signInWithGoogle();
    if (res?.error) {
      setBusy(false);
      setError(res.error);
    }
    // If it worked, the browser is on its way to Google, so there is nothing else to do here
  }

  /* ---------- Sign up ---------- */
  function nextStep(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
      setError("Fill in every field to continue.");
      return;
    }
    if (digits(form.phone).length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    const pwError = checkPassword(form.password);
    if (pwError) {
      setError(pwError);
      return;
    }
    setError("");
    setStep(2);
  }

  async function finishSignup(e) {
    e.preventDefault();
    if (!form.gender || !form.department || !form.level || !form.interestedIn || !form.lookingFor) {
      setError("Fill in your gender, department, level, and what you're looking for.");
      return;
    }
    if (form.interests.length === 0) {
      setError("Pick at least one interest.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err, field, signedIn } = await signUpUser(form, uni, captchaToken);
    setBusy(false);
    if (err) {
      spendCaptcha();
      if (field) setStep(1); // email or phone problem: go back to where they can fix it
      setError(err);
      return;
    }
    if (signedIn) {
      navigate("/feed");
    } else {
      navigate("/verify", { state: { email: form.email.trim().toLowerCase() } });
    }
  }

  /* ---------- Log in ---------- */
  function switchLogin() {
    setLoginBy(loginBy === "email" ? "phone" : "email");
    setLogin({ ...login, id: "" });
    setError("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (loginBy === "phone") {
      comingSoon("Logging in with a phone number");
      return;
    }
    if (!login.id.trim() || !login.password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: err } = await signInUser(login.id, login.password, captchaToken);
    setBusy(false);
    if (err) {
      spendCaptcha();
      setError(err);
      return;
    }
    navigate("/feed");
  }

  return (
    <div className="au-page">
      <main className="au">
        <Link to="/" className="au-logo"><Logo size={38} /></Link>

        <div className="au-card">
          <div className="au-tabs">
            <Link to="/signup" className={mode === "signup" ? "on" : ""}>Create account</Link>
            <Link to="/login" className={mode === "login" ? "on" : ""}>Log in</Link>
            <Link to="/forgot" className={mode === "forgot" ? "on" : ""}>Forgotten password</Link>
          </div>

          {/* CREATE ACCOUNT: step 1 */}
          {mode === "signup" && step === 1 && (
            <form onSubmit={nextStep}>
              <h1>Create account</h1>
              <p className="au-sub">Step 1 of 2. Your account details.</p>

              <label>Full name</label>
              <input name="name" placeholder="John Doe" value={form.name} onChange={update} />

              <label>Phone number</label>
              <input name="phone" type="tel" placeholder="0801 234 5678" value={form.phone} onChange={update} />

              <label>Email</label>
              <input name="email" type="email" placeholder="name@email.com" value={form.email} onChange={update} />

              <label>Password</label>
              <PasswordField
                value={form.password}
                onChange={update}
                placeholder="8 to 15 characters"
                show={show}
                setShow={setShow}
              />
              <PwRules pw={form.password} />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn">Continue</button>

              <GoogleButton onClick={handleGoogle} />

              <p className="au-switch">
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </form>
          )}

          {/* CREATE ACCOUNT: step 2 */}
          {mode === "signup" && step === 2 && (
            <form onSubmit={finishSignup}>
              <h1>Tell us about you</h1>
              <p className="au-sub">Step 2 of 2. This is what people see on your profile.</p>

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

              <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />

              {error && <div className="au-error">{error}</div>}
              <div className="au-row">
                <button type="button" className="au-btn ghost" onClick={() => { setError(""); setStep(1); }}>
                  Back
                </button>
                <button type="submit" className="au-btn" disabled={busy}>
                  {busy ? "Please wait..." : "Create account"}
                </button>
              </div>
            </form>
          )}

          {/* LOG IN */}
          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <h1>Welcome back</h1>
              <p className="au-sub">Log in to see who's on your campus.</p>

              <label>{loginBy === "email" ? "Email" : "Phone number"}</label>
              <input
                type={loginBy === "email" ? "email" : "tel"}
                placeholder={loginBy === "email" ? "name@email.com" : "0801 234 5678"}
                value={login.id}
                onChange={(e) => { setLogin({ ...login, id: e.target.value }); setError(""); }}
              />

              <label>Password</label>
              <PasswordField
                value={login.password}
                onChange={(e) => { setLogin({ ...login, password: e.target.value }); setError(""); }}
                placeholder="Your password"
                show={show}
                setShow={setShow}
              />

              <Link to="/forgot" className="au-forgot">Forgotten password?</Link>

              <Captcha onToken={setCaptchaToken} resetSignal={captchaReset} />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn" disabled={busy}>
                {busy ? "Please wait..." : "Log in"}
              </button>

              <button type="button" className="au-link" onClick={switchLogin}>
                {loginBy === "email"
                  ? "Forgot your email? Log in with your phone number"
                  : "Log in with your email instead"}
              </button>

              <GoogleButton onClick={handleGoogle} />

              <p className="au-switch">
                New here? <Link to="/signup">Create account</Link>
              </p>
            </form>
          )}

          {/* FORGOTTEN PASSWORD */}
          {mode === "forgot" && <ForgotForm />}
        </div>
      </main>

      <Footer />
    </div>
  );
}