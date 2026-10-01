import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="ft">
      <nav className="ft-links ft-small">
        <Link to="/safety">Safety</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <p>© {new Date().getFullYear()} Campusly</p>
    </footer>
  );
}