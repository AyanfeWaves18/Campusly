import { Link } from "react-router-dom";
import "./Pages.css";

export default function NotFound() {
  return (
    <div className="nf">
      <h1>404</h1>
      <p>This page doesn't exist, or it moved.</p>
      <Link to="/">Back home</Link>
    </div>
  );
}