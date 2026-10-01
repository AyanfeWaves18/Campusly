import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { BackIcon } from "../components/Icons.jsx";
import "./Inner.css";

const pages = {
  "/safety": {
    title: "Safety",
    sections: [
      { h: "Meet safely", p: "Meet in public places on campus for the first few times, and tell a friend where you're going and who you're meeting." },
      { h: "Protect your details", p: "Don't share your hostel room number, passwords, or money details with someone you've just met on Campusly." },
      { h: "Block and report", p: "If someone makes you uncomfortable, block them and report them. Every report is reviewed, and accounts that break our rules are removed." },
      { h: "Control who sees you", p: "In your account settings you can hide your profile from everyone, or from your own department." },
    ],
  },
  "/privacy": {
    title: "Privacy",
    sections: [
      { h: "What we collect", p: "Your name, phone number, email, and the profile details you choose to add, like your department, level, and interests." },
      { h: "How we use it", p: "We use your details to run your account and to show you to other students on your campus. We don't sell your personal information." },
      { h: "Your choices", p: "You can edit your profile, hide it, or delete your account at any time from your account settings." },
    ],
  },
  "/terms": {
    title: "Terms",
    sections: [
      { h: "Who can use Campusly", p: "Campusly is for university students. You must be 18 or older and give accurate information about yourself." },
      { h: "Be respectful", p: "No harassment, hate speech, fake profiles, or explicit content. Accounts that break these rules can be removed without notice." },
      { h: "Your account", p: "You're responsible for keeping your password safe and for what happens on your account." },
      { h: "Changes", p: "We may update these terms as Campusly grows. We'll let you know about important changes." },
    ],
  },
};

export default function Info() {
  const navigate = useNavigate();
  const { pathname, key } = useLocation();
  const page = pages[pathname] || pages["/safety"];

  // Go back to wherever the person came from. If they opened this page directly, go home.
  function goBack() {
    if (key !== "default") navigate(-1);
    else navigate("/");
  }

  return (
    <div className="in-page">
      <header className="in-top">
        <button className="in-back" onClick={goBack} aria-label="Go back">
          <BackIcon size={22} />
        </button>
        <h1>{page.title}</h1>
      </header>

      <main className="in-wrap">
        {page.sections.map((s) => (
          <div className="in-card" key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </div>
        ))}
      </main>

      <Footer />
    </div>
  );
}