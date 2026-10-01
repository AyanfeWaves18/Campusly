import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { BackIcon, ClipIcon, FileIcon, SendIcon, SmileIcon } from "../components/Icons.jsx";
import { ReportModal } from "../components/Modals.jsx";
import { PullIndicator, usePullToRefresh } from "../components/PullToRefresh.jsx";
import { useToast } from "../components/Toast.jsx";
import { isLoggedIn, load, save } from "../utils/storage.js";
import { profiles } from "../utils/data.js";
import { checkDoc, checkImage, compressImage, formatSize, readDataUrl } from "../utils/files.js";
import "./Chat.css";

const EMOJIS = ["😀", "😂", "😍", "😘", "🥰", "😎", "🤔", "😢", "🙏", "🔥", "❤️", "👍"];
const MAX_TEXT = 500;

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const p = profiles.find((x) => String(x.id) === id);

  const [chats, setChats] = useState(() => load("chats", {}));
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [attach, setAttach] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [light, setLight] = useState(null);
  const endRef = useRef(null);
  const listRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  // Pull down at the top of the messages to refresh
  async function refresh() {
    await new Promise((r) => setTimeout(r, 700));
    setChats(load("chats", {}));
    toast("Chat refreshed");
  }
  const { pull, refreshing } = usePullToRefresh(refresh, listRef);

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  if (!p) {
    return (
      <div className="ch">
        <div className="ch-empty">This chat doesn't exist.</div>
      </div>
    );
  }

  const messages = chats[p.id] || [];

  function push(msg) {
    const next = { ...chats, [p.id]: [...messages, { from: "me", t: Date.now(), ...msg }] };
    if (!save("chats", next)) {
      toast("Storage is full. Remove old chats or files and try again.", "err");
      return false;
    }
    setChats(next);
    return true;
  }

  function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) {
      toast("Type a message first", "err");
      return;
    }
    if (t.length > MAX_TEXT) {
      toast(`Messages can be up to ${MAX_TEXT} characters`, "err");
      return;
    }
    if (push({ text: t })) {
      setText("");
      setEmojiOpen(false);
    }
  }

  async function onImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setAttach(false);
    if (!file) return;
    const err = checkImage(file);
    if (err) {
      toast(err, "err");
      return;
    }
    try {
      push({ img: await compressImage(file, 900, 0.75) });
    } catch {
      toast("Couldn't read that image", "err");
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setAttach(false);
    if (!file) return;
    const err = checkDoc(file);
    if (err) {
      toast(err, "err");
      return;
    }
    try {
      push({ file: { name: file.name, size: file.size, url: await readDataUrl(file) } });
    } catch {
      toast("Couldn't read that file", "err");
    }
  }

  return (
    <div className="ch">
      <header className="ch-top">
        <button className="ch-back" onClick={() => navigate("/messages")} aria-label="Back to messages">
          <BackIcon size={22} />
        </button>
        <Link to={`/user/${p.id}`} className="ch-who">
          <Avatar name={p.name} bg={p.bg} fg={p.fg} size={36} />
          <span className="ch-name">
            {p.name}
            {p.verified && <i className="ti ti-rosette-discount-check vb"></i>}
          </span>
        </Link>
        <button className="ch-report" onClick={() => setMenu(true)}>Block / Report</button>
      </header>

      <PullIndicator pull={pull} refreshing={refreshing} top={64} />

      <main className="ch-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="ch-start">
            <p>Say hi to {p.name}.</p>
            <button onClick={() => setText(`Hey ${p.name}! ${p.prompt.q}`)}>Ask: {p.prompt.q}</button>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`ch-msg ${m.from}`}>
            {m.img && <img src={m.img} alt="Shared" className="ch-img" onClick={() => setLight(m.img)} />}
            {m.file && (
              <a className="ch-file" href={m.file.url} download={m.file.name}>
                <FileIcon size={24} />
                <span>
                  <b>{m.file.name}</b>
                  <small>{formatSize(m.file.size)}</small>
                </span>
              </a>
            )}
            {m.text}
          </div>
        ))}
        <div ref={endRef}></div>
      </main>

      <div className="ch-tools">
        {attach && (
          <div className="ch-pop">
            <div className="ch-pop-row">
              <button type="button" onClick={() => imgRef.current.click()}>Photo</button>
              <button type="button" onClick={() => fileRef.current.click()}>File</button>
            </div>
            <small>Photos: JPG, PNG, WEBP or GIF, up to 5 MB. Files: PDF, DOC, DOCX or TXT, up to 1 MB.</small>
          </div>
        )}
        {emojiOpen && (
          <div className="ch-pop emojis">
            {EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => setText((t) => (t + em).slice(0, MAX_TEXT))}>{em}</button>
            ))}
          </div>
        )}

        <form className="ch-form" onSubmit={send}>
          <button type="button" className="ch-ico" aria-label="Attach a photo or file" onClick={() => { setAttach(!attach); setEmojiOpen(false); }}>
            <ClipIcon size={20} />
          </button>
          <button type="button" className="ch-ico" aria-label="Emojis" onClick={() => { setEmojiOpen(!emojiOpen); setAttach(false); }}>
            <SmileIcon size={20} />
          </button>
          <input
            placeholder="Type a message"
            value={text}
            maxLength={MAX_TEXT}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className={`ch-send ${text.trim() ? "" : "off"}`} aria-label="Send">
            <SendIcon size={20} />
          </button>
        </form>

        <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onImage} />
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" hidden onChange={onFile} />
      </div>

      {light && <Lightbox src={light} onClose={() => setLight(null)} />}
      {menu && (
        <ReportModal
          profile={p}
          onClose={() => setMenu(false)}
          onDone={(action) => action === "block" && navigate("/messages")}
        />
      )}
    </div>
  );
}