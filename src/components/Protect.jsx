import { useEffect } from "react";

const isField = (el) => el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");

export default function Protect() {
  useEffect(() => {
    document.body.classList.add("protected");

    const stop = (e) => e.preventDefault();
    const stopSelect = (e) => {
      if (!isField(e.target)) e.preventDefault();
    };
    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && ["c", "x", "p", "s", "u"].includes(k)) e.preventDefault();
      if (mod && k === "a" && !isField(e.target)) e.preventDefault();
    };

    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("contextmenu", stop);
    document.addEventListener("dragstart", stop);
    document.addEventListener("selectstart", stopSelect);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("protected");
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("contextmenu", stop);
      document.removeEventListener("dragstart", stop);
      document.removeEventListener("selectstart", stopSelect);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}