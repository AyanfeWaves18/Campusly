import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  addToRegistry,
  emailKey,
  ensureRegistered,
  findActiveAccount,
  getUser,
  load,
  phoneKey,
  saveUser,
  setLoggedIn,
} from "../utils/storage.js";
import { checkPassword, passwordRules } from "../utils/validate.js";
import { googleSignIn } from "../utils/google.js";
import {
  departments,
  levels,
  genders,
  interestedInOptions,
  lookingForOptions,
  interestsList,
} from "../utils/options.js";
import "./Auth.css";

const DEMO_CODE = "123456";
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

function GoogleButton({ onClick, busy }) {
  return (
    <>
      <div className="au-or"><span>or</span></div>
      <button type="button" className="au-google" onClick={onClick} disabled={busy}>
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {busy ? "Connecting..." : "Continue with Google"}
      </button>
    </>
  );
}

export default function Auth({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // The university must be chosen on the landing page first
  const uni = location.state?.uni || load("uni", "") || getUser()?.uni || "";
  const g = location.state?.google;

  const [step, setStep] = useState(g ? 2 : 1);
  const [googleUser, setGoogleUser] = useState(!!g);
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: g?.name || "",
    phone: "",
    email: g?.email || "",
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

  // Log in: with email or with phone number
  const [loginBy, setLoginBy] = useState("email");
  const [login, setLogin] = useState({ id: "", password: "" });

  // Forgotten password flow
  const [fStep, setFStep] = useState("request"); // request | code | reset
  const [fMethod, setFMethod] = useState("email");
  const [fTarget, setFTarget] = useState("");
  const [fCode, setFCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");

  useEffect(() => {
    if (!uni) navigate("/", { replace: true });
  }, [uni, navigate]);

  if (!uni) return null;

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

  /* ---------- Google ---------- */
  async function handleGoogle() {
    setError("");
    setBusy(true);
    try {
      const gu = await googleSignIn();
      const existing = getUser();
      if (existing && emailKey(existing.email) === emailKey(gu.email)) {
        ensureRegistered(existing);
        setLoggedIn(true);
        toast(`Welcome back, ${existing.name.split(" ")[0]}`);
        navigate("/feed");
        return;
      }
      if (findActiveAccount(gu.email, "")) {
        setError("An account with this email already exists. Log in instead.");
        return;
      }
      if (mode === "signup") {
        setForm((f) => ({ ...f, name: gu.name || "", email: gu.email || "" }));
        setGoogleUser(true);
        setStep(2);
      } else {
        navigate("/signup", { state: { uni, google: { name: gu.name || "", email: gu.email || "" } } });
      }
    } catch (e) {
      setError(
        e.userMessage ||
          (e.message === "no-client-id"
            ? "Google sign-in isn't set up yet. Add your Google client ID to the .env file."
            : "Google sign-in was cancelled or failed. Please try again.")
      );
    } finally {
      setBusy(false);
    }
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
    // An email or phone number can only belong to one active account
    const dup = findActiveAccount(form.email, form.phone);
    if (dup) {
      setError(
        dup.email === emailKey(form.email)
          ? "An account with this email already exists. Log in instead."
          : "An account with this phone number already exists. Log in instead."
      );
      return;
    }
    setError("");
    setStep(2);
  }

  function finishSignup(e) {
    e.preventDefault();
    if (!form.gender || !form.department || !form.level || !form.interestedIn || !form.lookingFor) {
      setError("Fill in your gender, department, level, and what you're looking for.");
      return;
    }
    if (form.interests.length === 0) {
      setError("Pick at least one interest.");
      return;
    }
    if (googleUser) {
      // Google already verified this email, so no code is needed
      const account = { ...form, password: "", uni, verified: true, google: true, prompts: {} };
      saveUser({ ...account, accountId: addToRegistry(account) });
      setLoggedIn(true);
      navigate("/feed");
    } else {
      const account = { ...form, uni, verified: false, prompts: {} };
      saveUser({ ...account, accountId: addToRegistry(account) });
      setLoggedIn(true);
      navigate("/verify"); // the code is sent once, right after first signup
    }
  }

  /* ---------- Log in (no code needed) ---------- */
  function switchLogin() {
    setLoginBy(loginBy === "email" ? "phone" : "email");
    setLogin({ ...login, id: "" });
    setError("");
  }

  function handleLogin(e) {
    e.preventDefault();
    const user = getUser();
    if (!login.id.trim() || !login.password) {
      setError(loginBy === "email" ? "Enter your email and password." : "Enter your phone number and password.");
      return;
    }
    if (loginBy === "phone" && digits(login.id).length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    const idMatches =
      loginBy === "email"
        ? emailKey(user?.email) === emailKey(login.id)
        : phoneKey(user?.phone) === phoneKey(login.id);
    if (!user || !idMatches || user.password !== login.password) {
      setError(`That ${loginBy === "email" ? "email" : "phone number"} or password is incorrect.`);
      return;
    }
    ensureRegistered(user);
    setLoggedIn(true);
    navigate("/feed");
  }

  /* ---------- Forgotten password ---------- */
  function switchMethod() {
    setFMethod(fMethod === "email" ? "phone" : "email");
    setFTarget("");
    setError("");
  }

  function sendCode(e) {
    e.preventDefault();
    const value = fTarget.trim();
    if (fMethod === "email" && !value.includes("@")) {
      setError("Enter the email you signed up with.");
      return;
    }
    if (fMethod === "phone" && digits(value).length < 10) {
      setError("Enter the phone number you signed up with.");
      return;
    }
    const u = getUser();
    const found =
      u &&
      (fMethod === "email"
        ? emailKey(u.email) === emailKey(value)
        : phoneKey(u.phone) === phoneKey(value));
    if (!found) {
      setError(`We couldn't find an account with that ${fMethod === "email" ? "email" : "phone number"}.`);
      return;
    }
    setError("");
    setFCode("");
    setFStep("code");
    toast(`A 6-digit code was sent to your ${fMethod === "email" ? "email" : "phone"}`);
  }

  function checkCode(e) {
    e.preventDefault();
    if (fCode !== DEMO_CODE) {
      setError("That code isn't right. Try again.");
      return;
    }
    setError("");
    setFStep("reset");
  }

  function resetPassword(e) {
    e.preventDefault();
    const pwError = checkPassword(newPw);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (newPw !== newPw2) {
      setError("The two passwords don't match.");
      return;
    }
    saveUser({ ...getUser(), password: newPw });
    toast("Password changed. Log in with your new password.");
    navigate("/login");
  }

  const masked =
    fMethod === "email"
      ? fTarget.replace(/(.{2}).+(@.+)/, "$1•••$2")
      : "•••• ••• " + digits(fTarget).slice(-3);

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

              <GoogleButton onClick={handleGoogle} busy={busy} />

              <p className="au-switch">
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </form>
          )}

          {/* CREATE ACCOUNT: step 2 */}
          {mode === "signup" && step === 2 && (
            <form onSubmit={finishSignup}>
              <h1>Tell us about you</h1>
              <p className="au-sub">
                {googleUser ? `Welcome, ${form.name.split(" ")[0] || "there"}. ` : "Step 2 of 2. "}
                This is what people see on your profile.
              </p>

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
              <div className="au-row">
                {!googleUser && (
                  <button type="button" className="au-btn ghost" onClick={() => { setError(""); setStep(1); }}>
                    Back
                  </button>
                )}
                <button type="submit" className="au-btn">Create account</button>
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

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn">Log in</button>

              <button type="button" className="au-link" onClick={switchLogin}>
                {loginBy === "email"
                  ? "Forgot your email? Log in with your phone number"
                  : "Log in with your email instead"}
              </button>

              <GoogleButton onClick={handleGoogle} busy={busy} />

              <p className="au-switch">
                New here? <Link to="/signup">Create account</Link>
              </p>
            </form>
          )}

          {/* FORGOTTEN PASSWORD: step 1 */}
          {mode === "forgot" && fStep === "request" && (
            <form onSubmit={sendCode}>
              <h1>Forgotten password</h1>
              <p className="au-sub">
                {fMethod === "email"
                  ? "Enter your email and we'll send you a 6-digit code."
                  : "Enter your phone number and we'll text you a 6-digit code."}
              </p>

              <label>{fMethod === "email" ? "Email" : "Phone number"}</label>
              <input
                type={fMethod === "email" ? "email" : "tel"}
                placeholder={fMethod === "email" ? "name@email.com" : "0801 234 5678"}
                value={fTarget}
                onChange={(e) => { setFTarget(e.target.value); setError(""); }}
              />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn">Send code</button>

              <button type="button" className="au-link" onClick={switchMethod}>
                {fMethod === "email" ? "Use my phone number instead" : "Use my email instead"}
              </button>
              <p className="au-switch">
                Remembered it? <Link to="/login">Log in</Link>
              </p>
            </form>
          )}

          {/* FORGOTTEN PASSWORD: step 2 */}
          {mode === "forgot" && fStep === "code" && (
            <form onSubmit={checkCode}>
              <h1>Enter the code</h1>
              <p className="au-sub">We sent a 6-digit code to {masked}.</p>

              <input
                className="vf-code"
                inputMode="numeric"
                maxLength="6"
                placeholder="000000"
                value={fCode}
                onChange={(e) => { setFCode(digits(e.target.value)); setError(""); }}
              />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn">Verify code</button>

              <div className="vf-links">
                <button type="button" onClick={() => toast("A new code has been sent")}>Resend code</button>
                <button type="button" onClick={() => { setFStep("request"); setError(""); }}>Change {fMethod}</button>
              </div>
              <p className="vf-hint">Demo mode: enter {DEMO_CODE}</p>
            </form>
          )}

          {/* FORGOTTEN PASSWORD: step 3 */}
          {mode === "forgot" && fStep === "reset" && (
            <form onSubmit={resetPassword}>
              <h1>Set a new password</h1>
              <p className="au-sub">Choose a password you haven't used before.</p>

              <label>New password</label>
              <PasswordField
                name="newPw"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setError(""); }}
                placeholder="8 to 15 characters"
                show={show}
                setShow={setShow}
              />
              <PwRules pw={newPw} />

              <label>Confirm new password</label>
              <PasswordField
                name="newPw2"
                value={newPw2}
                onChange={(e) => { setNewPw2(e.target.value); setError(""); }}
                placeholder="Type it again"
                show={show}
                setShow={setShow}
              />

              {error && <div className="au-error">{error}</div>}
              <button type="submit" className="au-btn">Save new password</button>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}