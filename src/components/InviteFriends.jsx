import { useEffect, useState } from "react";
import { useToast } from "./Toast.jsx";
import { fetchMyReferral } from "../lib/referrals.js";

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    const ok = document.execCommand("copy");
    t.remove();
    return ok;
  }
}

// A card in Settings with my own invite code
export default function InviteFriends() {
  const toast = useToast();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchMyReferral().then(setData);
  }, []);

  const code = data?.code || "";
  const link = code ? `${window.location.origin}/signup?code=${code}` : "";
  const message = `Join me on Campusly! Use my invite code ${code} or sign up here: ${link}`;

  async function copy() {
    const ok = await copyText(message);
    toast(ok ? "Invite copied" : "Couldn't copy. Select and copy it yourself.", ok ? "ok" : "err");
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Campusly", text: message });
      } catch {
        /* closed without sharing */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="in-card">
      <h2>Invite friends</h2>
      {!data ? (
        <p>Loading...</p>
      ) : data.error ? (
        <p>{data.error}</p>
      ) : (
        <>
          <p>Share your code. When a friend signs up with it, we know you invited them.</p>
          <h3 className="ic-code">{code}</h3>
          <p style={{ color: "var(--muted)" }}>
            {data.joined === 0
              ? "Nobody has joined with your code yet."
              : `${data.joined} ${data.joined === 1 ? "person has" : "people have"} joined with your code.`}
          </p>
          <div className="in-btns">
            <button className="in-btn" onClick={share}>Share</button>
            <button className="in-btn ghost" onClick={copy}>Copy</button>
          </div>
        </>
      )}
    </div>
  );
}